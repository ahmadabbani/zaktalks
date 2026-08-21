import 'server-only'

import {
  resend,
  ZAKTALKS_ADMIN_EMAIL,
  ZAKTALKS_EMAIL_FROM,
} from '@/lib/resend'

const FAILURE_NOTIFICATION_TYPES = ['customer_failure', 'admin_failure']
const RECOVERY_NOTIFICATION_TYPES = ['customer_recovery', 'admin_recovery']

function boundedInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isSafeInteger(parsed)) return fallback
  return Math.min(Math.max(parsed, min), max)
}

const MIN_FAILURE_ATTEMPTS = boundedInteger(
  process.env.PAYMENT_FULFILLMENT_NOTICE_MIN_ATTEMPTS,
  3,
  2,
  10,
)

const MIN_FAILURE_AGE_SECONDS = boundedInteger(
  process.env.PAYMENT_FULFILLMENT_NOTICE_DELAY_SECONDS,
  300,
  60,
  86_400,
)

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function courseFromCheckout(checkout) {
  return Array.isArray(checkout.course) ? checkout.course[0] : checkout.course
}

function displayName(checkout) {
  const name = [checkout.first_name, checkout.last_name].filter(Boolean).join(' ').trim()
  return name || 'there'
}

function formattedAmount(checkout) {
  const cents = checkout.expected_amount_cents
  if (!Number.isSafeInteger(cents)) return 'Unknown'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function applicationUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
}

function emailShell(content) {
  return `
    <div style="margin:0;padding:32px 16px;background:#f4f4f2;font-family:Arial,sans-serif;color:#212c2d;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;">
        <div style="height:5px;width:72px;border-radius:999px;background:#f4c400;margin-bottom:24px;"></div>
        ${content}
        <p style="margin:28px 0 0;color:#637071;font-size:13px;line-height:1.6;">
          ZakTalks · This is an automated service message about a course purchase.
        </p>
      </div>
    </div>
  `
}

function customerFailureMessage(checkout) {
  const course = courseFromCheckout(checkout)
  const name = escapeHtml(displayName(checkout))
  const courseTitle = escapeHtml(course?.title || 'your course')
  const orderId = escapeHtml(checkout.stripe_session_id)

  return {
    to: checkout.email,
    subject: 'We received your payment and are finalizing your course access',
    text: `Hi ${displayName(checkout)},\n\nYour payment for ${course?.title || 'your course'} was received successfully. Course access is taking longer than expected, but you do not need to pay again. Our team has been notified and will make sure your access is completed.\n\nOrder ID: ${checkout.stripe_session_id}\n\nIf you need help, reply to this email or contact ${ZAKTALKS_ADMIN_EMAIL}.`,
    html: emailShell(`
      <h1 style="margin:0 0 18px;font-size:27px;line-height:1.2;color:#3c5a67;">Your payment is safe</h1>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${name},</p>
      <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">
        Your payment for <strong>${courseTitle}</strong> was received successfully. Course access is taking longer than expected, but <strong>you do not need to pay again</strong>.
      </p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
        Our team has already been notified and will make sure your access is completed.
      </p>
      <div style="padding:14px 16px;border-radius:14px;background:#eef3f6;font-size:14px;line-height:1.6;">
        <strong>Order ID:</strong> ${orderId}
      </div>
      <p style="margin:20px 0 0;font-size:15px;line-height:1.7;">
        If you need help, reply to this email or contact <a href="mailto:${escapeHtml(ZAKTALKS_ADMIN_EMAIL)}" style="color:#3c5a67;font-weight:700;">${escapeHtml(ZAKTALKS_ADMIN_EMAIL)}</a>.
      </p>
    `),
  }
}

function adminFailureMessage(checkout) {
  const course = courseFromCheckout(checkout)
  const customerName = escapeHtml(displayName(checkout))
  const customerEmail = escapeHtml(checkout.email)
  const courseTitle = escapeHtml(course?.title || checkout.course_id)
  const orderId = escapeHtml(checkout.stripe_session_id)

  return {
    to: ZAKTALKS_ADMIN_EMAIL,
    subject: `[Action needed] Paid order awaiting access: ${course?.title || checkout.stripe_session_id}`,
    text: `Stripe confirmed this payment, but course access was not granted after the automatic retry threshold.\n\nCustomer: ${displayName(checkout)} (${checkout.email})\nCourse: ${course?.title || checkout.course_id}\nAmount: ${formattedAmount(checkout)}\nOrder ID: ${checkout.stripe_session_id}\n\nDo not ask the customer to pay again. Review the latest fulfillment attempts in the admin payment tools and reconcile this Stripe Checkout Session.`,
    html: emailShell(`
      <h1 style="margin:0 0 18px;font-size:27px;line-height:1.2;color:#3c5a67;">Paid order needs attention</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
        Stripe confirmed this payment, but course access was not granted after the automatic retry threshold.
      </p>
      <div style="padding:18px;border-radius:16px;background:#eef3f6;font-size:14px;line-height:1.75;">
        <strong>Customer:</strong> ${customerName} (${customerEmail})<br>
        <strong>Course:</strong> ${courseTitle}<br>
        <strong>Amount:</strong> ${escapeHtml(formattedAmount(checkout))}<br>
        <strong>Order ID:</strong> ${orderId}<br>
        <strong>Payment state:</strong> Confirmed by Stripe
      </div>
      <p style="margin:20px 0 0;font-size:15px;line-height:1.7;">
        <strong>Do not ask the customer to pay again.</strong> Review the latest failure details in the admin payment tools, verify the order in Stripe, then retry fulfillment using the protected reconciliation action.
      </p>
    `),
  }
}

function customerRecoveryMessage(checkout) {
  const course = courseFromCheckout(checkout)
  const courseTitle = escapeHtml(course?.title || 'your course')
  const dashboardUrl = applicationUrl() ? `${applicationUrl()}/dashboard` : null
  const action = dashboardUrl
    ? `<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#3c5a67;color:#ffffff;text-decoration:none;font-weight:700;">Open your dashboard</a>`
    : '<p style="margin:0;">Sign in to ZakTalks to open your course.</p>'

  return {
    to: checkout.email,
    subject: `Your access to ${course?.title || 'your ZakTalks course'} is ready`,
    text: `Hi ${displayName(checkout)},\n\nYour access to ${course?.title || 'your ZakTalks course'} is now ready. Sign in to your dashboard to begin.\n\nOrder ID: ${checkout.stripe_session_id}`,
    html: emailShell(`
      <h1 style="margin:0 0 18px;font-size:27px;line-height:1.2;color:#3c5a67;">Your course access is ready</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">
        Hi ${escapeHtml(displayName(checkout))}, access to <strong>${courseTitle}</strong> has been completed. Thank you for your patience.
      </p>
      ${action}
      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#637071;">Order ID: ${escapeHtml(checkout.stripe_session_id)}</p>
    `),
  }
}

function adminRecoveryMessage(checkout) {
  const course = courseFromCheckout(checkout)

  return {
    to: ZAKTALKS_ADMIN_EMAIL,
    subject: `[Resolved] Course access granted: ${course?.title || checkout.stripe_session_id}`,
    text: `The delayed fulfillment has recovered successfully.\n\nCustomer: ${displayName(checkout)} (${checkout.email})\nCourse: ${course?.title || checkout.course_id}\nOrder ID: ${checkout.stripe_session_id}\nEnrollment ID: ${checkout.enrollment_id || 'Unknown'}`,
    html: emailShell(`
      <h1 style="margin:0 0 18px;font-size:27px;line-height:1.2;color:#3c5a67;">Course access recovered</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.7;">The delayed fulfillment completed successfully.</p>
      <div style="padding:18px;border-radius:16px;background:#eef3f6;font-size:14px;line-height:1.75;">
        <strong>Customer:</strong> ${escapeHtml(displayName(checkout))} (${escapeHtml(checkout.email)})<br>
        <strong>Course:</strong> ${escapeHtml(course?.title || checkout.course_id)}<br>
        <strong>Order ID:</strong> ${escapeHtml(checkout.stripe_session_id)}<br>
        <strong>Enrollment ID:</strong> ${escapeHtml(checkout.enrollment_id || 'Unknown')}
      </div>
    `),
  }
}

function messageForType(type, checkout) {
  if (type === 'customer_failure') return customerFailureMessage(checkout)
  if (type === 'admin_failure') return adminFailureMessage(checkout)
  if (type === 'customer_recovery') return customerRecoveryMessage(checkout)
  return adminRecoveryMessage(checkout)
}

async function recordResult(supabaseAdmin, sessionId, type, claimedAt, { sent, emailId = null, error = null }) {
  const { data: recorded, error: trackingError } = await supabaseAdmin.rpc(
    'record_checkout_fulfillment_notification_result_v2',
    {
      p_stripe_session_id: sessionId,
      p_notification_type: type,
      p_claimed_at: claimedAt,
      p_sent: sent,
      p_email_id: emailId,
      p_error: error,
    },
  )

  if (trackingError) {
    console.error(`Unable to track ${type} email for ${sessionId}:`, trackingError.message)
    return false
  }

  return recorded === true
}

async function claimIsCurrent(supabaseAdmin, sessionId, type, claimedAt) {
  const { data, error } = await supabaseAdmin.rpc(
    'checkout_fulfillment_notification_claim_is_current',
    {
      p_stripe_session_id: sessionId,
      p_notification_type: type,
      p_claimed_at: claimedAt,
    },
  )

  if (error) throw new Error(`Unable to verify the notification claim: ${error.message}`)
  return data === true
}

async function attemptNotification(supabaseAdmin, sessionId, type) {
  try {
    const failureNotice = FAILURE_NOTIFICATION_TYPES.includes(type)
    const { data: claimRows, error: claimError } = await supabaseAdmin.rpc(
      'claim_checkout_fulfillment_notification_v2',
      {
        p_stripe_session_id: sessionId,
        p_notification_type: type,
        p_min_attempts: failureNotice ? MIN_FAILURE_ATTEMPTS : 1,
        p_min_age_seconds: failureNotice ? MIN_FAILURE_AGE_SECONDS : 0,
      },
    )

    if (claimError) throw new Error(`Notification claim failed: ${claimError.message}`)
    const claim = claimRows?.[0]
    if (!claim?.checkout_id || !claim?.claimed_at) return

    try {
      const { data: checkout, error: checkoutError } = await supabaseAdmin
        .from('checkout_sessions')
        .select(`
          id, stripe_session_id, email, first_name, last_name, course_id,
          enrollment_id, expected_amount_cents, payment_state, fulfillment_state,
          fulfillment_attempts, fulfillment_first_failed_at, last_fulfillment_error,
          course:courses(title, slug)
        `)
        .eq('stripe_session_id', sessionId)
        .single()

      if (checkoutError || !checkout?.email) {
        throw new Error(`Unable to load notification details: ${checkoutError?.message || 'Customer email is missing'}`)
      }

      // Fulfillment can recover while an email worker is loading its message.
      // Re-check the owned claim immediately before contacting Resend so a
      // stale failure notice is not sent after access is already available.
      if (!await claimIsCurrent(supabaseAdmin, sessionId, type, claim.claimed_at)) return

      const message = messageForType(type, checkout)
      const { data, error } = await resend.emails.send(
        {
          from: ZAKTALKS_EMAIL_FROM,
          to: message.to,
          replyTo: ZAKTALKS_ADMIN_EMAIL,
          subject: message.subject,
          text: message.text,
          html: message.html,
          tags: [
            { name: 'category', value: 'payment-fulfillment' },
            { name: 'notice_type', value: type.replaceAll('_', '-') },
          ],
        },
        { idempotencyKey: `checkout-${type}-${checkout.id}` },
      )

      if (error) throw new Error(error.message)
      const recorded = await recordResult(supabaseAdmin, sessionId, type, claim.claimed_at, {
        sent: true,
        emailId: data?.id || null,
      })

      // If fulfillment completed while the failure email was in flight, its
      // normal recovery call may have run before this send was recorded. A
      // second idempotent check closes that timing window.
      if (recorded && failureNotice) {
        await maybeSendFulfillmentRecoveryNotifications(supabaseAdmin, sessionId)
      }
    } catch (error) {
      await recordResult(supabaseAdmin, sessionId, type, claim.claimed_at, {
        sent: false,
        error: error.message.slice(0, 2000),
      })
      console.error(`Best-effort ${type} email failed for ${sessionId}:`, error.message)
    }
  } catch (error) {
    // Notification infrastructure must never change payment/access behavior.
    console.error(`Unable to process best-effort ${type} notification for ${sessionId}:`, error.message)
  }
}

export async function maybeSendDelayedFulfillmentNotifications(supabaseAdmin, sessionId) {
  await Promise.all(
    FAILURE_NOTIFICATION_TYPES.map((type) => attemptNotification(supabaseAdmin, sessionId, type)),
  )
}

export async function maybeSendFulfillmentRecoveryNotifications(supabaseAdmin, sessionId) {
  await Promise.all(
    RECOVERY_NOTIFICATION_TYPES.map((type) => attemptNotification(supabaseAdmin, sessionId, type)),
  )
}
