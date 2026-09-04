import 'server-only'

import { after } from 'next/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { secureActionLink } from '@/lib/email/action-link'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe'
import {
  maybeSendDelayedFulfillmentNotifications,
  maybeSendFulfillmentRecoveryNotifications,
} from '@/lib/payments/fulfillment-emails'
import {
  CHECKOUT_CUSTOMER_EMAIL_TYPES,
  maybeSendCheckoutCustomerEmails,
} from '@/lib/payments/customer-emails'

export class FulfillmentInProgressError extends Error {
  constructor(session) {
    super('Purchase fulfillment is already in progress')
    this.name = 'FulfillmentInProgressError'
    this.code = 'FULFILLMENT_IN_PROGRESS'
    this.session = session
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function parseStoredInteger(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : fallback
}

function paymentIntentId(session) {
  if (typeof session.payment_intent === 'string') return session.payment_intent
  if (session.payment_intent?.id) return session.payment_intent.id
  if (session.payment_status === 'no_payment_required') return `no_payment_required:${session.id}`
  return null
}

function fulfillmentBaseUrl(requestOrigin) {
  const origin = typeof requestOrigin === 'string' ? requestOrigin : ''
  const local = origin.includes('localhost') || origin.includes('127.0.0.1')

  if (process.env.NODE_ENV !== 'production' && local) return origin
  return process.env.NEXT_PUBLIC_APP_URL || origin
}

function scheduleCheckoutCustomerEmails(sessionId, emailTypes, requestOrigin) {
  try {
    after(() => maybeSendCheckoutCustomerEmails(sessionId, emailTypes, { requestOrigin }))
  } catch (error) {
    // Scheduling email must never change payment or course-access behavior.
    console.error(`Unable to schedule customer emails for ${sessionId}:`, error.message)
  }
}

async function sendPasswordSetupEmail({ checkoutId, email, link, claimId }) {
  const setupButton = secureActionLink(
    link,
    'Set Password',
    'display:inline-block;padding:10px 20px;background:#f4c400;color:#212c2d;text-decoration:none;border-radius:999px;font-weight:bold;',
  )

  const { data, error } = await resend.emails.send(
    {
      from: ZAKTALKS_EMAIL_FROM,
      to: email,
      subject: 'Welcome to ZakTalks! Set your password',
      html: `
        <h1>Thank you for your purchase!</h1>
        <p>You now have access to your course. Since you checked out as a guest, use the secure link below to confirm your email and set a password for your account:</p>
        <p>${setupButton}</p>
        <p>This secure link is single-use. If it has expired, contact support for a new one.</p>
      `,
    },
    { idempotencyKey: `guest-password-setup-${checkoutId}-${claimId}` },
  )

  if (error) throw new Error(`Unable to send the guest password email: ${error.message}`)
  return data?.id || null
}

async function claimGuestPasswordEmail(supabaseAdmin, checkoutId) {
  const { data, error } = await supabaseAdmin.rpc('claim_checkout_password_setup_email', {
    p_checkout_id: checkoutId,
    p_stale_seconds: 900,
  })

  if (error) throw new Error(`Unable to claim the guest password email: ${error.message}`)
  return data?.[0]?.claimed_at || null
}

async function releaseGuestPasswordEmailClaim(supabaseAdmin, checkoutId, claimedAt) {
  if (!claimedAt) return

  const { error } = await supabaseAdmin
    .from('checkout_sessions')
    .update({
      password_setup_email_claimed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkoutId)
    .eq('password_setup_email_claimed_at', claimedAt)
    .is('password_setup_email_sent_at', null)

  if (error) {
    console.error(`Unable to release the guest password email claim for ${checkoutId}:`, error.message)
  }
}

async function resolveGuestAccount({ supabaseAdmin, email, firstName, lastName, redirectTo }) {
  const { data: existingUser, error: lookupError } = await supabaseAdmin
    .from('users')
    .select('id, email_verified, password_set')
    .ilike('email', escapeLikePattern(email))
    .maybeSingle()

  if (lookupError) throw new Error(`Unable to check the guest account: ${lookupError.message}`)

  if (!existingUser) {
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: { first_name: firstName || '', last_name: lastName || '' },
        redirectTo,
      },
    })

    if (error || !data?.user?.id || !data?.properties?.action_link) {
      throw new Error(`Unable to create the guest account: ${error?.message || 'Invite link was not generated'}`)
    }

    return { userId: data.user.id, passwordSet: false, actionLink: data.properties.action_link }
  }

  if (existingUser.password_set) {
    return { userId: existingUser.id, passwordSet: true, actionLink: null }
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: existingUser.email_verified ? 'recovery' : 'magiclink',
    email,
    options: { redirectTo },
  })

  if (error || !data?.properties?.action_link) {
    throw new Error(`Unable to generate the guest password link: ${error?.message || 'Link was not generated'}`)
  }

  return { userId: existingUser.id, passwordSet: false, actionLink: data.properties.action_link }
}

async function ensureGuestPasswordEmail({
  supabaseAdmin,
  checkout,
  guestAccount,
  email,
  claimedAt,
}) {
  if (checkout.password_setup_email_sent_at) return
  if (!claimedAt) throw new Error('The guest password email was not claimed')

  if (guestAccount?.passwordSet || !guestAccount?.actionLink) {
    await releaseGuestPasswordEmailClaim(supabaseAdmin, checkout.id, claimedAt)
    return
  }

  try {
    const emailId = await sendPasswordSetupEmail({
      checkoutId: checkout.id,
      email,
      link: guestAccount.actionLink,
      claimId: new Date(claimedAt).getTime(),
    })

    const { data: trackedCheckout, error } = await supabaseAdmin
      .from('checkout_sessions')
      .update({
        password_setup_email_sent_at: new Date().toISOString(),
        password_setup_email_id: emailId,
        password_setup_email_error: null,
        password_setup_email_claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkout.id)
      .eq('password_setup_email_claimed_at', claimedAt)
      .is('password_setup_email_sent_at', null)
      .select('id')
      .maybeSingle()

    if (error || !trackedCheckout) {
      // Resend's idempotency key prevents a retry from delivering a duplicate.
      throw new Error(`Password email was sent but delivery tracking failed: ${error?.message || 'The email claim changed before it was recorded'}`)
    }
  } catch (error) {
    await supabaseAdmin
      .from('checkout_sessions')
      .update({
        password_setup_email_error: error.message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkout.id)
      .eq('password_setup_email_claimed_at', claimedAt)
      .is('password_setup_email_sent_at', null)

    throw error
  }
}

async function refundDuplicatePayment({ supabaseAdmin, checkout, session, intentId }) {
  if (session.amount_total === 0 || session.payment_status === 'no_payment_required') {
    const { error } = await supabaseAdmin
      .from('checkout_sessions')
      .update({
        payment_state: 'no_payment_required',
        fulfillment_state: 'not_required',
        updated_at: new Date().toISOString(),
      })
      .eq('id', checkout.id)

    if (error) throw new Error(`Unable to close the duplicate no-cost order: ${error.message}`)
    return { status: 'duplicate_no_cost', refunded: false }
  }

  await stripe.refunds.create(
    { payment_intent: intentId, reason: 'duplicate' },
    { idempotencyKey: `duplicate-checkout-refund-${session.id}` },
  )

  const { error } = await supabaseAdmin.rpc('mark_duplicate_checkout_refunded', {
    p_stripe_session_id: session.id,
  })
  if (error) throw new Error(`Duplicate payment was refunded but its order state was not updated: ${error.message}`)

  return { status: 'duplicate_refunded', refunded: true }
}

/**
 * The only application path that grants access for a Stripe Checkout Session.
 * Stripe is re-read here, then the database finalizer commits enrollment,
 * discounts, rewards, and order status in one transaction.
 */
export async function fulfillCheckoutSession(sessionId, { requestOrigin } = {}) {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    throw new Error('A valid Stripe Checkout Session ID is required')
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.status === 'expired') return { status: 'expired', session }
  if (session.status !== 'complete') return { status: 'open', session }
  if (!['paid', 'no_payment_required'].includes(session.payment_status)) {
    return { status: 'payment_processing', session }
  }

  if (!Number.isSafeInteger(session.amount_total) || session.amount_total < 0 || session.currency !== 'usd') {
    throw new Error('Stripe returned invalid purchase totals')
  }

  const supabaseAdmin = await createAdminClient()
  const { data: checkout, error: checkoutError } = await supabaseAdmin
    .from('checkout_sessions')
    .select(`
      id, stripe_session_id, email, first_name, last_name, course_id, user_id,
      enrollment_id, coupon_id, status, original_price_cents,
      expected_amount_cents, points_to_spend, first_purchase_discount_applied,
      payment_state, fulfillment_state, duplicate_payment,
      password_setup_email_sent_at
    `)
    .eq('stripe_session_id', session.id)
    .single()

  if (checkoutError || !checkout) {
    throw new Error(`The checkout order was not recorded: ${checkoutError?.message || session.id}`)
  }

  const metadata = session.metadata || {}
  const email = normalizeEmail(session.customer_details?.email || session.customer_email)
  const courseId = metadata.courseId || checkout.course_id
  const checkoutId = metadata.checkoutId || checkout.id
  const intentId = paymentIntentId(session)

  if (!email || !intentId || checkoutId !== checkout.id || courseId !== checkout.course_id) {
    throw new Error('The signed Stripe session does not match its checkout order')
  }
  if (normalizeEmail(checkout.email) !== email) {
    throw new Error('The Stripe customer email does not match the checkout order')
  }
  if (checkout.expected_amount_cents !== null && checkout.expected_amount_cents !== session.amount_total) {
    throw new Error('The paid amount does not match the reserved checkout total')
  }

  const { data: claimRows, error: claimError } = await supabaseAdmin.rpc('claim_checkout_fulfillment', {
    p_stripe_session_id: session.id,
  })
  if (claimError) throw new Error(`Unable to claim purchase fulfillment: ${claimError.message}`)

  const claim = claimRows?.[0]
  if (!claim?.should_process) {
    const { data: latest } = await supabaseAdmin
      .from('checkout_sessions')
      .select(`
        id, user_id, enrollment_id, duplicate_payment, payment_state,
        fulfillment_state, password_setup_email_sent_at
      `)
      .eq('id', checkout.id)
      .single()

    if (latest?.duplicate_payment && !['refunded', 'no_payment_required'].includes(latest.payment_state)) {
      return { ...(await refundDuplicatePayment({ supabaseAdmin, checkout, session, intentId })), session }
    }

    if (['paid', 'no_payment_required', 'partially_refunded'].includes(latest?.payment_state)) {
      scheduleCheckoutCustomerEmails(
        session.id,
        [CHECKOUT_CUSTOMER_EMAIL_TYPES.PAYMENT_RECEIPT],
        requestOrigin,
      )
    }

    if (latest?.fulfillment_state === 'fulfilled') {
      if (metadata.isGuest === 'true' && !latest.password_setup_email_sent_at) {
        const claimedAt = await claimGuestPasswordEmail(supabaseAdmin, checkout.id)
        if (!claimedAt) throw new FulfillmentInProgressError(session)

        let emailAttemptStarted = false
        try {
          const baseUrl = fulfillmentBaseUrl(requestOrigin)
          if (!baseUrl) throw new Error('The application URL is unavailable for guest account setup')
          const guestAccount = await resolveGuestAccount({
            supabaseAdmin,
            email,
            firstName: checkout.first_name || metadata.firstName,
            lastName: checkout.last_name || metadata.lastName,
            redirectTo: `${baseUrl}/auth/callback?next=/auth/update-password`,
          })
          emailAttemptStarted = Boolean(guestAccount?.actionLink && !guestAccount?.passwordSet)
          await ensureGuestPasswordEmail({
            supabaseAdmin,
            checkout: { ...checkout, password_setup_email_sent_at: latest.password_setup_email_sent_at },
            guestAccount,
            email,
            claimedAt,
          })
        } catch (error) {
          if (!emailAttemptStarted) {
            await releaseGuestPasswordEmailClaim(supabaseAdmin, checkout.id, claimedAt)
          }
          throw error
        }
      }

      await maybeSendFulfillmentRecoveryNotifications(supabaseAdmin, session.id)
      scheduleCheckoutCustomerEmails(
        session.id,
        [CHECKOUT_CUSTOMER_EMAIL_TYPES.COURSE_ACCESS],
        requestOrigin,
      )

      return { status: 'fulfilled', session, enrollmentId: latest.enrollment_id }
    }

    // Another trusted request (normally the Stripe webhook or the success page)
    // owns the fulfillment lease. Keep this distinct from a real fulfillment
    // failure so browser redirects can render a calm pending state while webhook
    // callers still return a retryable response if their competing attempt loses.
    throw new FulfillmentInProgressError(session)
  }

  let passwordEmailClaim = null
  let passwordEmailAttemptStarted = false

  try {
    const verifiedPaymentState = session.payment_status === 'no_payment_required'
      ? 'no_payment_required'
      : 'paid'
    const { error: verifiedPaymentError } = await supabaseAdmin.rpc('mark_checkout_payment_verified', {
      p_stripe_session_id: session.id,
      p_stripe_payment_intent_id: intentId,
      p_payment_state: verifiedPaymentState,
    })
    if (verifiedPaymentError) {
      throw new Error(`Unable to record the verified Stripe payment: ${verifiedPaymentError.message}`)
    }
    scheduleCheckoutCustomerEmails(
      session.id,
      [CHECKOUT_CUSTOMER_EMAIL_TYPES.PAYMENT_RECEIPT],
      requestOrigin,
    )

    const isGuest = metadata.isGuest === 'true' || !checkout.user_id
    let userId = checkout.user_id || session.client_reference_id || null
    let guestAccount = null

    if (isGuest) {
      const baseUrl = fulfillmentBaseUrl(requestOrigin)
      if (!baseUrl) throw new Error('The application URL is unavailable for guest account setup')

      guestAccount = await resolveGuestAccount({
        supabaseAdmin,
        email,
        firstName: checkout.first_name || metadata.firstName,
        lastName: checkout.last_name || metadata.lastName,
        redirectTo: `${baseUrl}/auth/callback?next=/auth/update-password`,
      })
      userId = guestAccount.userId

      if (!guestAccount.passwordSet && guestAccount.actionLink) {
        passwordEmailClaim = await claimGuestPasswordEmail(supabaseAdmin, checkout.id)
      }
    }

    if (!userId) throw new Error('No user is associated with this completed checkout')
    if (checkout.user_id && session.client_reference_id && checkout.user_id !== session.client_reference_id) {
      throw new Error('The registered Stripe customer does not match the checkout user')
    }

    const originalPriceCents = checkout.original_price_cents
      ?? parseStoredInteger(metadata.originalPriceCents, session.amount_total)

    const { data: finalizationRows, error: finalizationError } = await supabaseAdmin.rpc(
      'finalize_course_purchase',
      {
        p_stripe_session_id: session.id,
        p_user_id: userId,
        p_course_id: checkout.course_id,
        p_stripe_payment_intent_id: intentId,
        p_amount_paid_cents: session.amount_total,
        p_original_price_cents: originalPriceCents,
        p_first_purchase_discount_applied: checkout.first_purchase_discount_applied,
        p_points_to_spend: checkout.points_to_spend,
        p_coupon_id: checkout.coupon_id,
      },
    )

    const finalization = finalizationRows?.[0]
    if (finalizationError || !finalization?.enrollment_id) {
      throw new Error(`Purchase finalization failed: ${finalizationError?.message || 'Enrollment was not returned'}`)
    }

    if (finalization.duplicate_payment) {
      return {
        ...(await refundDuplicatePayment({ supabaseAdmin, checkout, session, intentId })),
        session,
        enrollmentId: finalization.enrollment_id,
      }
    }

    if (isGuest && guestAccount && !guestAccount.passwordSet && guestAccount.actionLink) {
      if (!passwordEmailClaim) throw new FulfillmentInProgressError(session)
      passwordEmailAttemptStarted = true
      await ensureGuestPasswordEmail({
        supabaseAdmin,
        checkout,
        guestAccount,
        email,
        claimedAt: passwordEmailClaim,
      })
    }

    await maybeSendFulfillmentRecoveryNotifications(supabaseAdmin, session.id)
    scheduleCheckoutCustomerEmails(
      session.id,
      [CHECKOUT_CUSTOMER_EMAIL_TYPES.COURSE_ACCESS],
      requestOrigin,
    )

    return {
      status: 'fulfilled',
      session,
      enrollmentId: finalization.enrollment_id,
      isGuest,
    }
  } catch (error) {
    if (passwordEmailClaim && !passwordEmailAttemptStarted) {
      await releaseGuestPasswordEmailClaim(supabaseAdmin, checkout.id, passwordEmailClaim)
    }

    if (error instanceof FulfillmentInProgressError) throw error

    const { error: trackingError } = await supabaseAdmin.rpc('record_checkout_fulfillment_failure', {
      p_stripe_session_id: session.id,
      p_error: error.message,
    })
    if (trackingError) {
      console.error(`Unable to record fulfillment failure for ${session.id}:`, trackingError.message)
    }

    await maybeSendDelayedFulfillmentNotifications(supabaseAdmin, session.id)
    throw error
  }
}

export async function markCheckoutTerminal(sessionId, state, errorMessage = null) {
  const supabaseAdmin = await createAdminClient()
  const { error } = await supabaseAdmin.rpc('mark_checkout_terminal', {
    p_stripe_session_id: sessionId,
    p_terminal_state: state,
    p_error: errorMessage,
  })
  if (error) throw new Error(`Unable to update checkout state: ${error.message}`)
}

export async function syncPaymentAccessState(paymentIntentIdValue, paymentState, revokeAccess) {
  if (!paymentIntentIdValue) return null
  const supabaseAdmin = await createAdminClient()
  const { data, error } = await supabaseAdmin.rpc('sync_payment_access_state', {
    p_stripe_payment_intent_id: paymentIntentIdValue,
    p_payment_state: paymentState,
    p_revoke_access: revokeAccess,
  })
  if (error) throw new Error(`Unable to synchronize payment access: ${error.message}`)
  return data
}
