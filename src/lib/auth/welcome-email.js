import 'server-only'

import {
  resend,
  ZAKTALKS_ADMIN_EMAIL,
  ZAKTALKS_EMAIL_FROM,
} from '@/lib/resend'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function applicationUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
}

async function recordWelcomeEmailResult(
  supabaseAdmin,
  userId,
  claimedAt,
  { sent, emailId = null, error = null },
) {
  const { data: recorded, error: trackingError } = await supabaseAdmin.rpc(
    'record_user_welcome_email_result',
    {
      p_user_id: userId,
      p_claimed_at: claimedAt,
      p_sent: sent,
      p_email_id: emailId,
      p_error: error,
    },
  )

  if (trackingError) {
    console.error(`Unable to track welcome email for user ${userId}:`, trackingError.message)
    return false
  }

  return recorded === true
}

/**
 * Sends a welcome email only for an account explicitly marked as pending and
 * only after both email verification and password setup are complete. The
 * database lease makes callback, password-setup, and login retries idempotent.
 */
export async function maybeSendWelcomeEmail(userId) {
  if (!userId) return { status: 'not_eligible' }

  const supabaseAdmin = await createAdminClient()

  try {
    const { data: claimRows, error: claimError } = await supabaseAdmin.rpc(
      'claim_user_welcome_email',
      { p_user_id: userId, p_stale_seconds: 900 },
    )

    if (claimError) throw new Error(`Unable to claim welcome email: ${claimError.message}`)

    const claim = claimRows?.[0]
    if (!claim?.claimed_at) return { status: 'not_eligible' }

    try {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', userId)
        .single()

      if (profileError || !profile?.email) {
        throw new Error(`Unable to load the welcome recipient: ${profileError?.message || 'Email is missing'}`)
      }

      const appUrl = applicationUrl()
      const dashboardUrl = appUrl ? `${appUrl}/dashboard` : null
      const action = dashboardUrl
        ? `<a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:#3c5a67;color:#ffffff;text-decoration:none;font-weight:700;">Open your dashboard</a>`
        : '<p style="margin:0;">Sign in to ZakTalks whenever you are ready.</p>'

      const { data, error } = await resend.emails.send(
        {
          from: ZAKTALKS_EMAIL_FROM,
          to: profile.email,
          replyTo: ZAKTALKS_ADMIN_EMAIL,
          subject: 'Welcome to ZakTalks',
          text: `Welcome to ZakTalks. Your account is ready. This is a space for honest reflection, practical learning, and conversations that support lasting change.${dashboardUrl ? `\n\nOpen your dashboard: ${dashboardUrl}` : ''}`,
          html: `
            <div style="margin:0;padding:32px 16px;background:#f4f4f2;font-family:Arial,sans-serif;color:#212c2d;">
              <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;">
                <div style="height:5px;width:72px;border-radius:999px;background:#f4c400;margin-bottom:24px;"></div>
                <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#3c5a67;">Welcome to ZakTalks</h1>
                <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Your account is ready.</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
                  This is a space for honest reflection, practical learning, and conversations that support lasting change.
                </p>
                ${action}
                <p style="margin:28px 0 0;color:#637071;font-size:13px;line-height:1.6;">
                  If you need help, reply to this email or contact
                  <a href="mailto:${escapeHtml(ZAKTALKS_ADMIN_EMAIL)}" style="color:#3c5a67;font-weight:700;">${escapeHtml(ZAKTALKS_ADMIN_EMAIL)}</a>.
                </p>
              </div>
            </div>
          `,
          tags: [
            { name: 'category', value: 'account' },
            { name: 'notice_type', value: 'welcome' },
          ],
        },
        { idempotencyKey: `user-welcome-${userId}` },
      )

      if (error) throw new Error(error.message)

      const recorded = await recordWelcomeEmailResult(
        supabaseAdmin,
        userId,
        claim.claimed_at,
        { sent: true, emailId: data?.id || null },
      )

      return { status: recorded ? 'sent' : 'already_handled' }
    } catch (error) {
      await recordWelcomeEmailResult(
        supabaseAdmin,
        userId,
        claim.claimed_at,
        { sent: false, error: error.message.slice(0, 2000) },
      )
      console.error(`Best-effort welcome email failed for user ${userId}:`, error.message)
      return { status: 'failed' }
    }
  } catch (error) {
    // Welcome delivery must never block account setup, authentication, payment,
    // course access, or navigation.
    console.error(`Unable to process welcome email for user ${userId}:`, error.message)
    return { status: 'failed' }
  }
}
