'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-utils'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function submitPreviewCourseReview({ courseId, rating, reviewText }) {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, error: 'This test page is only available locally.' }
  }

  const access = await requireAdmin()
  const normalizedRating = Number(rating)
  const normalizedText = typeof reviewText === 'string' ? reviewText.trim() : ''
  if (!UUID_PATTERN.test(courseId || '')) return { success: false, error: 'Choose a course.' }
  if (!Number.isFinite(normalizedRating) || normalizedRating < 0.5 || normalizedRating > 5 || !Number.isInteger(normalizedRating * 2)) {
    return { success: false, error: 'Choose a rating from half a star to five stars.' }
  }
  if (!normalizedText || normalizedText.length > 2000) {
    return { success: false, error: 'Write a review of up to 2000 characters.' }
  }

  const supabase = await createAdminClient()
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('is_published', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (courseError || !course) return { success: false, error: 'This course is not available.' }

  const { data: existing, error: lookupError } = await supabase
    .from('course_reviews')
    .select('id, is_test, deleted_at')
    .eq('course_id', courseId)
    .eq('user_id', access.user.id)
    .maybeSingle()
  if (lookupError) return { success: false, error: 'Could not check the test review.' }
  if (existing && !existing.is_test) {
    return { success: false, error: 'Your account already has a real review for this course.' }
  }

  const values = {
    rating: normalizedRating,
    review_text: normalizedText,
    is_published: false,
    published_at: null,
    is_test: true,
    deleted_at: null,
  }
  const result = existing
    ? await supabase.from('course_reviews').update({ ...values, updated_at: new Date().toISOString() }).eq('id', existing.id)
    : await supabase.from('course_reviews').insert({ ...values, course_id: courseId, user_id: access.user.id })

  if (result.error) {
    console.error('Unable to save preview course review:', result.error)
    return { success: false, error: 'Could not save the test review. Please try again.' }
  }
  return { success: true }
}
