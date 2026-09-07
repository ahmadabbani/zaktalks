'use server'

import { createClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Records reminder-only activity for a learner enrollment. This deliberately
 * never writes lesson progress and never participates in completion/unlocking.
 */
export async function recordCourseActivity(lessonId) {
  if (!UUID_PATTERN.test(String(lessonId || ''))) return { recorded: false }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return { recorded: false }

    const { data, error } = await supabase.rpc('touch_course_enrollment_activity', {
      p_lesson_id: lessonId,
    })

    if (error) {
      console.error('Unable to record course reminder activity:', error.message)
      return { recorded: false }
    }

    return { recorded: data === true }
  } catch (error) {
    // Reminder activity is best effort and must never interrupt course access,
    // video playback, assessments, progress, or navigation.
    console.error('Course reminder activity failed:', error.message)
    return { recorded: false }
  }
}
