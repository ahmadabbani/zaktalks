import 'server-only'

import {
  OKAYNESS_EMAIL_FROM,
  OKAYNESS_SUPPORT_EMAIL,
  resend,
} from '@/lib/resend'
import {
  buildCourseAccessEmail,
  buildPaymentReceiptEmail,
} from '@/lib/email/templates/purchase'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

export const CHECKOUT_CUSTOMER_EMAIL_TYPES = {
  PAYMENT_RECEIPT: 'payment_receipt',
  COURSE_ACCESS: 'course_access',
}

const VALID_EMAIL_TYPES = new Set(Object.values(CHECKOUT_CUSTOMER_EMAIL_TYPES))

function applicationUrl(requestOrigin) {
  const origin = typeof requestOrigin === 'string' ? requestOrigin.trim().replace(/\/$/, '') : ''
  const local = origin.includes('localhost') || origin.includes('127.0.0.1')
  if (process.env.NODE_ENV !== 'production' && local) return origin
  return (process.env.NEXT_PUBLIC_APP_URL || origin).trim().replace(/\/$/, '')
}

function relatedRecord(value) {
  return Array.isArray(value) ? value[0] : value
}

function recipientName(checkout) {
  const account = relatedRecord(checkout.account)
  return checkout.first_name || account?.first_name || ''
}

function courseRecord(checkout) {
  return relatedRecord(checkout.course) || {}
}

function formatAmount(cents) {
  const parsed = Number(cents)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return '0.00 USD'
  return `${(parsed / 100).toFixed(2)} USD`
}

function formatPaymentDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'Asia/Beirut',
  }).format(date)
}

function invoiceNumber(checkoutId) {
  return `ZT-${String(checkoutId || '').replaceAll('-', '').slice(0, 10).toUpperCase()}`
}

async function recordResult(
  supabaseAdmin,
  sessionId,
  emailType,
  claimedAt,
  { sent, emailId = null, error = null },
) {
  const { data: recorded, error: trackingError } = await supabaseAdmin.rpc(
    'record_checkout_customer_email_result',
    {
      p_stripe_session_id: sessionId,
      p_email_type: emailType,
      p_claimed_at: claimedAt,
      p_sent: sent,
      p_email_id: emailId,
      p_error: error,
    },
  )

  if (trackingError) {
    console.error(`Unable to track ${emailType} email for ${sessionId}:`, trackingError.message)
    return false
  }

  return recorded === true
}

async function claimIsCurrent(supabaseAdmin, sessionId, emailType, claimedAt) {
  const { data, error } = await supabaseAdmin.rpc(
    'checkout_customer_email_claim_is_current',
    {
      p_stripe_session_id: sessionId,
      p_email_type: emailType,
      p_claimed_at: claimedAt,
    },
  )

  if (error) throw new Error(`Unable to verify the customer email claim: ${error.message}`)
  return data === true
}

function buildMessage(emailType, checkout, requestOrigin) {
  const appUrl = applicationUrl(requestOrigin)
  const course = courseRecord(checkout)
  const courseName = course.title || 'your course'
  const receiptUrl = appUrl ? `${appUrl}/dashboard?section=purchases` : ''
  const courseUrl = appUrl ? `${appUrl}/dashboard?section=courses` : ''

  if (emailType === CHECKOUT_CUSTOMER_EMAIL_TYPES.PAYMENT_RECEIPT) {
    return buildPaymentReceiptEmail({
      recipientFirstName: recipientName(checkout),
      courseName,
      amountPaid: formatAmount(checkout.expected_amount_cents),
      originalAmount: formatAmount(checkout.original_price_cents ?? checkout.expected_amount_cents),
      // Checkout creation happens immediately before the Stripe Session is
      // opened and stays immutable across retries, keeping the email payload
      // compatible with Resend's idempotency key.
      paymentDate: formatPaymentDate(checkout.created_at),
      invoiceNumber: invoiceNumber(checkout.id),
      receiptUrl,
      appUrl,
      supportEmail: OKAYNESS_SUPPORT_EMAIL,
    })
  }

  return buildCourseAccessEmail({
    recipientFirstName: recipientName(checkout),
    courseName,
    courseUrl,
    appUrl,
    supportEmail: OKAYNESS_SUPPORT_EMAIL,
  })
}

async function attemptCustomerEmail(supabaseAdmin, sessionId, emailType, requestOrigin) {
  try {
    const { data: claimRows, error: claimError } = await supabaseAdmin.rpc(
      'claim_checkout_customer_email',
      {
        p_stripe_session_id: sessionId,
        p_email_type: emailType,
        p_stale_seconds: 900,
      },
    )

    if (claimError) throw new Error(`Customer email claim failed: ${claimError.message}`)
    const claim = claimRows?.[0]
    if (!claim?.checkout_id || !claim?.claimed_at) return { status: 'not_eligible' }

    try {
      const { data: checkout, error: checkoutError } = await supabaseAdmin
        .from('checkout_sessions')
        .select(`
          id, stripe_session_id, email, first_name, last_name, user_id,
          enrollment_id, original_price_cents, expected_amount_cents,
          payment_state, fulfillment_state, duplicate_payment,
          created_at, updated_at, completed_at,
          account:users(first_name, last_name),
          course:courses(title)
        `)
        .eq('stripe_session_id', sessionId)
        .single()

      if (checkoutError || !checkout?.email) {
        throw new Error(`Unable to load customer email details: ${checkoutError?.message || 'Recipient email is missing'}`)
      }

      if (!await claimIsCurrent(supabaseAdmin, sessionId, emailType, claim.claimed_at)) {
        return { status: 'claim_changed' }
      }

      const message = buildMessage(emailType, checkout, requestOrigin)
      const { data, error } = await resend.emails.send(
        {
          from: OKAYNESS_EMAIL_FROM,
          to: checkout.email,
          replyTo: OKAYNESS_SUPPORT_EMAIL,
          subject: message.subject,
          text: message.text,
          html: message.html,
          tags: [
            { name: 'category', value: 'purchase' },
            { name: 'notice_type', value: emailType.replaceAll('_', '-') },
          ],
        },
        { idempotencyKey: `checkout-${emailType}-${checkout.id}` },
      )

      if (error) throw new Error(error.message)
      const recorded = await recordResult(supabaseAdmin, sessionId, emailType, claim.claimed_at, {
        sent: true,
        emailId: data?.id || null,
      })

      return { status: recorded ? 'sent' : 'already_handled' }
    } catch (error) {
      await recordResult(supabaseAdmin, sessionId, emailType, claim.claimed_at, {
        sent: false,
        error: error.message.slice(0, 2000),
      })
      console.error(`Best-effort ${emailType} email failed for ${sessionId}:`, error.message)
      return { status: 'failed' }
    }
  } catch (error) {
    // Transactional email delivery is isolated from Stripe verification,
    // purchase finalization, enrollment, and guest account setup.
    console.error(`Unable to process best-effort ${emailType} email for ${sessionId}:`, error.message)
    return { status: 'failed' }
  }
}

export async function maybeSendCheckoutCustomerEmails(
  sessionId,
  emailTypes = Object.values(CHECKOUT_CUSTOMER_EMAIL_TYPES),
  { requestOrigin } = {},
) {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    return []
  }

  const selectedTypes = [...new Set(emailTypes)].filter((type) => VALID_EMAIL_TYPES.has(type))
  if (selectedTypes.length === 0) return []

  try {
    const supabaseAdmin = await createAdminClient()
    return await Promise.all(
      selectedTypes.map((type) => attemptCustomerEmail(supabaseAdmin, sessionId, type, requestOrigin)),
    )
  } catch (error) {
    console.error(`Unable to initialize customer emails for ${sessionId}:`, error.message)
    return selectedTypes.map(() => ({ status: 'failed' }))
  }
}
