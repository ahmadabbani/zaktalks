import 'server-only'

import {
  OKAYNESS_EMAIL_FROM,
  OKAYNESS_SUPPORT_EMAIL,
  resend,
} from '@/lib/resend'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'

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
        .select('id, email, first_name')
        .eq('id', userId)
        .single()

      if (profileError || !profile?.email) {
        throw new Error(`Unable to load the welcome recipient: ${profileError?.message || 'Email is missing'}`)
      }

      const email = buildWelcomeEmail({
        firstName: profile.first_name,
        appUrl: applicationUrl(),
        supportEmail: OKAYNESS_SUPPORT_EMAIL,
      })

      const { data, error } = await resend.emails.send(
        {
          from: OKAYNESS_EMAIL_FROM,
          to: profile.email,
          replyTo: OKAYNESS_SUPPORT_EMAIL,
          subject: email.subject,
          text: email.text,
          html: email.html,
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
