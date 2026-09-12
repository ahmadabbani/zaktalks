import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import {
  COURSE_REMINDER_EMAIL_FROM,
  OKAYNESS_SUPPORT_EMAIL,
  resend,
} from '@/lib/resend'
import { buildCourseInactivityEmail } from '@/lib/email/templates/course-inactivity'
import { retryPendingCheckoutPaymentReceipts } from '@/lib/payments/customer-emails'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function secretMatches(request) {
  const secret = process.env.CRON_SECRET || ''
  const authorization = request.headers.get('authorization') || ''
  const expected = `Bearer ${secret}`

  if (!secret || authorization.length !== expected.length) return false

  return timingSafeEqual(
    Buffer.from(authorization, 'utf8'),
    Buffer.from(expected, 'utf8'),
  )
}

function configuredInteger(name, fallback, minimum, maximum) {
  const parsed = Number.parseInt(process.env[name] || '', 10)
  if (!Number.isInteger(parsed)) return fallback
  return Math.min(maximum, Math.max(minimum, parsed))
}

function applicationUrl() {
  const configured = String(process.env.NEXT_PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
  return /^https:\/\//i.test(configured) ? configured : ''
}

async function recordResult(supabase, reminder, result) {
  const { data, error } = await supabase.rpc('record_course_inactivity_reminder_result', {
    p_notification_id: reminder.notification_id,
    p_claimed_at: reminder.claimed_at,
    p_sent: result.sent,
    p_email_id: result.emailId || null,
    p_error: result.error || null,
  })

  if (error) {
    console.error(`Unable to record course reminder ${reminder.notification_id}:`, error.message)
    return false
  }

  return data === true
}

export async function GET(request) {
  if (!secretMatches(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let receiptEmails
  try {
    receiptEmails = await retryPendingCheckoutPaymentReceipts({
      requestOrigin: request.nextUrl.origin,
      limit: 25,
    })
  } catch (error) {
    // Receipt retries are independent from course reminders and from the
    // payment flow that originally queued them.
    console.error('Unable to retry pending payment receipts:', error.message)
    receiptEmails = { due: 0, sent: 0, failed: 1, skipped: 0 }
  }

  if (process.env.COURSE_INACTIVITY_EMAILS_ENABLED !== 'true') {
    return NextResponse.json({ success: true, disabled: true, sent: 0, receiptEmails })
  }

  const appUrl = applicationUrl()
  if (!appUrl) {
    console.error('Course reminders require a secure NEXT_PUBLIC_APP_URL.')
    return NextResponse.json({ error: 'Reminder configuration is incomplete.' }, { status: 500 })
  }

  const inactivityHours = configuredInteger('INACTIVITY_REMINDER_HOURS', 168, 1, 8760)
  const batchSize = configuredInteger('INACTIVITY_REMINDER_BATCH_SIZE', 50, 1, 100)
  const supabase = await createAdminClient()

  const { data: reminders, error: claimError } = await supabase.rpc(
    'claim_course_inactivity_reminders',
    {
      p_inactivity_hours: inactivityHours,
      p_limit: batchSize,
      p_stale_seconds: 900,
    },
  )

  if (claimError) {
    console.error('Unable to claim course inactivity reminders:', claimError.message)
    return NextResponse.json({ error: 'Unable to prepare reminders.' }, { status: 500 })
  }

  const summary = {
    success: true,
    receiptEmails,
    inactivityHours,
    claimed: reminders?.length || 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  }

  for (const reminder of reminders || []) {
    try {
      const { data: enrollment, error: accountError } = await supabase
        .from('user_enrollments')
        .select('user:users!inner(password_set, email_verified)')
        .eq('id', reminder.enrollment_id)
        .single()

      if (accountError) throw new Error(`Account readiness check failed: ${accountError.message}`)

      const account = Array.isArray(enrollment?.user) ? enrollment.user[0] : enrollment?.user
      if (!account?.password_set || !account?.email_verified) {
        await recordResult(supabase, reminder, {
          sent: false,
          error: 'The learner account is not ready for course reminders.',
        })
        summary.skipped += 1
        continue
      }

      const { data: stillEligible, error: eligibilityError } = await supabase.rpc(
        'course_inactivity_reminder_claim_is_current',
        {
          p_notification_id: reminder.notification_id,
          p_claimed_at: reminder.claimed_at,
          p_inactivity_hours: inactivityHours,
        },
      )

      if (eligibilityError) throw new Error(`Eligibility check failed: ${eligibilityError.message}`)

      if (stillEligible !== true) {
        await recordResult(supabase, reminder, {
          sent: false,
          error: 'Reminder eligibility changed before delivery.',
        })
        summary.skipped += 1
        continue
      }

      const resumeUrl = `${appUrl}/courses/${encodeURIComponent(reminder.course_slug)}/player/${reminder.next_lesson_id}`
      const preferencesUrl = `${appUrl}/dashboard?section=profile`
      const message = buildCourseInactivityEmail({
        firstName: reminder.recipient_first_name,
        courseName: reminder.course_name,
        lastLessonName: reminder.last_lesson_name,
        nextLessonName: reminder.next_lesson_name,
        progressPercentage: reminder.progress_percentage,
        resumeUrl,
        preferencesUrl,
        appUrl,
        supportEmail: OKAYNESS_SUPPORT_EMAIL,
      })

      const { data, error } = await resend.emails.send(
        {
          from: COURSE_REMINDER_EMAIL_FROM,
          to: reminder.recipient_email,
          replyTo: OKAYNESS_SUPPORT_EMAIL,
          subject: message.subject,
          text: message.text,
          html: message.html,
          tags: [
            { name: 'category', value: 'course-reminder' },
            { name: 'notice_type', value: 'inactivity' },
          ],
        },
        { idempotencyKey: `course-inactivity-${reminder.notification_id}` },
      )

      if (error) throw new Error(error.message)

      const recorded = await recordResult(supabase, reminder, {
        sent: true,
        emailId: data?.id || null,
      })

      if (!recorded) {
        console.error(`Course reminder ${reminder.notification_id} was accepted but its delivery record was not finalized.`)
      }

      summary.sent += 1
    } catch (error) {
      await recordResult(supabase, reminder, {
        sent: false,
        error: String(error?.message || 'Unknown reminder error').slice(0, 2000),
      })
      console.error(`Course reminder ${reminder.notification_id} failed:`, error.message)
      summary.failed += 1
    }
  }

  return NextResponse.json(summary)
}
