'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { verifyLessonProgressAccess } from '@/lib/course-progress.server'
import { getYouTubeVideoDuration } from '@/lib/youtube'
import { getAssessmentById } from '@/assessments/registry'
import { calculateAssessmentResult } from '@/assessments/results'
import { revalidatePath } from 'next/cache'

const COMPLETION_THRESHOLD = 97
const HEARTBEAT_GRACE_SECONDS = 2
const MAX_CREDITABLE_GAP_SECONDS = 20
const REVIEW_TOLERANCE_SECONDS = 2
const MAX_VIDEO_DURATION_SECONDS = 12 * 60 * 60
const VALID_VIDEO_EVENTS = new Set(['start', 'heartbeat', 'pause', 'ended'])

function playbackStatusForEvent(event) {
  if (event === 'pause') return 'paused'
  if (event === 'ended') return 'ended'
  return 'playing'
}

function finiteInteger(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback
}

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Unauthorized')
  return user
}

async function resolveTrustedDuration(adminSupabase, lesson, reportedDuration) {
  if (lesson.duration_seconds > 0) return lesson.duration_seconds

  const youtubeDuration = await getYouTubeVideoDuration(lesson.youtube_url)
  const safeReportedDuration = Math.min(
    finiteInteger(reportedDuration),
    MAX_VIDEO_DURATION_SECONDS
  )
  const duration = youtubeDuration || safeReportedDuration

  if (!duration) throw new Error('Video duration is not available yet.')

  if (youtubeDuration) {
    const { error } = await adminSupabase
      .from('lessons')
      .update({ duration_seconds: youtubeDuration, updated_at: new Date().toISOString() })
      .eq('id', lesson.id)

    if (error) throw error
  }

  return duration
}

/**
 * Records a server-validated YouTube playback checkpoint. The browser reports
 * its position, but the server caps forward movement by elapsed wall time so a
 * client-side seek cannot instantly complete a lesson.
 */
export async function saveVideoProgress({ lessonId, positionSeconds, durationSeconds, event = 'heartbeat' }) {
  if (!VALID_VIDEO_EVENTS.has(event)) throw new Error('Invalid playback event.')

  const user = await getAuthenticatedUser()
  const adminSupabase = await createAdminClient()
  const { lesson, enrollment, existingProgress } = await verifyLessonProgressAccess(
    adminSupabase,
    user.id,
    lessonId,
    'video'
  )

  // A completed lesson is immutable progress. Replaying it is allowed, but it
  // must not rewrite the saved position, activity timestamps, or playback state.
  if (existingProgress?.is_completed) {
    return {
      success: true,
      skipped: true,
      isCompleted: true,
      progressPercent: 100,
      acceptedPosition: finiteInteger(existingProgress.max_position_reached_seconds),
      durationSeconds: finiteInteger(lesson.duration_seconds) || finiteInteger(durationSeconds)
    }
  }

  const duration = await resolveTrustedDuration(adminSupabase, lesson, durationSeconds)
  const reportedPosition = Math.min(finiteInteger(positionSeconds), duration)
  const now = new Date()
  const playbackStatus = playbackStatusForEvent(event)

  const legacyPosition = existingProgress
    ? Math.min(
        finiteInteger(existingProgress.max_position_reached_seconds) || finiteInteger(existingProgress.watch_time_seconds),
        Math.floor(duration * 0.96)
      )
    : 0
  const previousMax = Math.max(
    finiteInteger(existingProgress?.max_position_reached_seconds),
    legacyPosition
  )

  // Reviewing an already verified section does not alter the saved resume
  // point, playback status, timestamps, or accumulated progress.
  if (reportedPosition + REVIEW_TOLERANCE_SECONDS < previousMax) {
    const savedPercent = duration > 0 ? (previousMax / duration) * 100 : 0
    return {
      success: true,
      skipped: true,
      isCompleted: false,
      progressPercent: Math.min(95, Math.floor(savedPercent / 5) * 5),
      acceptedPosition: reportedPosition,
      durationSeconds: duration
    }
  }

  const previousHeartbeat = existingProgress?.last_heartbeat_at
    ? new Date(existingProgress.last_heartbeat_at)
    : null
  const elapsedSeconds = previousHeartbeat && !Number.isNaN(previousHeartbeat.getTime())
    ? Math.min(
        MAX_CREDITABLE_GAP_SECONDS,
        Math.max(0, Math.floor((now.getTime() - previousHeartbeat.getTime()) / 1000))
      )
    : 0
  const creditableAdvance = event === 'start'
    ? 0
    : elapsedSeconds + (elapsedSeconds >= 5 ? HEARTBEAT_GRACE_SECONDS : 0)
  const furthestAllowedPosition = Math.min(duration, previousMax + creditableAdvance)
  const acceptedPosition = reportedPosition <= previousMax
    ? reportedPosition
    : Math.min(reportedPosition, furthestAllowedPosition)
  const verifiedMax = Math.max(previousMax, acceptedPosition)
  const verifiedWatchTime = Math.max(
    finiteInteger(existingProgress?.watch_time_seconds),
    verifiedMax
  )
  const verifiedPercent = duration > 0 ? (verifiedMax / duration) * 100 : 0
  const isCompleted = verifiedPercent >= COMPLETION_THRESHOLD
  const resumePosition = Math.max(previousMax, acceptedPosition)
  const completedAt = isCompleted
    ? existingProgress?.completed_at || now.toISOString()
    : existingProgress?.completed_at || null
  const heartbeatAt = event === 'pause' || event === 'ended' || isCompleted
    ? null
    : now.toISOString()

  const progressPayload = {
    user_id: user.id,
    lesson_id: lesson.id,
    enrollment_id: enrollment.id,
    watch_time_seconds: verifiedWatchTime,
    last_position_seconds: isCompleted ? duration : resumePosition,
    max_position_reached_seconds: isCompleted ? duration : verifiedMax,
    is_completed: isCompleted,
    completed_at: completedAt,
    playback_status: playbackStatus,
    last_accessed_at: now.toISOString(),
    last_heartbeat_at: heartbeatAt,
    updated_at: now.toISOString()
  }

  const { error } = await adminSupabase
    .from('lesson_progress')
    .upsert(progressPayload, { onConflict: 'user_id,lesson_id' })

  if (error) {
    console.error('Error saving video progress:', error)
    throw new Error('Failed to save video progress.')
  }

  return {
    success: true,
    isCompleted,
    progressPercent: isCompleted
      ? 100
      : Math.min(95, Math.floor(verifiedPercent / 5) * 5),
    acceptedPosition: isCompleted ? duration : acceptedPosition,
    durationSeconds: duration
  }
}

/** Records one scored assessment attempt and completes its lesson atomically. */
export async function updateLessonProgress({ lessonId, isCompleted, attemptId, answers }) {
  if (!isCompleted) throw new Error('Assessment completion is required.')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId || '')) {
    throw new Error('Assessment attempt is invalid.')
  }

  const user = await getAuthenticatedUser()
  const adminSupabase = await createAdminClient()
  const { lesson, enrollment } = await verifyLessonProgressAccess(
    adminSupabase,
    user.id,
    lessonId,
    'assessment'
  )
  const definition = getAssessmentById(lesson.assessment_key)

  if (!definition || definition.id !== lesson.assessment_key) {
    throw new Error('Assessment definition was not found.')
  }

  const result = calculateAssessmentResult(definition, answers)
  const { data, error } = await adminSupabase.rpc('record_internal_assessment_attempt', {
    p_attempt_id: attemptId,
    p_user_id: user.id,
    p_lesson_id: lesson.id,
    p_enrollment_id: enrollment.id,
    p_assessment_key: definition.id,
    p_assessment_type: definition.type,
    p_score_value: result.scoreValue,
    p_score_max: result.scoreMax,
    p_score_percent: result.scorePercent,
    p_result_label: result.resultLabel,
    p_score_details: result.scoreDetails
  })

  if (error) {
    console.error('Error recording assessment attempt:', error)
    throw new Error('Failed to save the assessment result.')
  }

  revalidatePath('/dashboard')
  return {
    success: true,
    isCompleted: true,
    attemptNumber: data?.[0]?.attempt_number || null,
    score: result.scoreValue,
    scoreMax: result.scoreMax,
    scorePercent: result.scorePercent,
    assessmentResult: {
      scoreValue: result.scoreValue,
      scoreMax: result.scoreMax,
      scorePercent: result.scorePercent,
      resultLabel: result.resultLabel,
      scoreDetails: result.scoreDetails
    }
  }
}
