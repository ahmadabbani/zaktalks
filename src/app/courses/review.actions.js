'use server'

import { createClient } from '@/lib/supabase/server'

export async function submitCourseReview({ courseId, rating, reviewText }) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Please sign in before sharing your review.' }
  }

  const normalizedRating = Number(rating)
  const normalizedText = typeof reviewText === 'string' ? reviewText.trim() : ''

  if (!courseId || !Number.isInteger(normalizedRating * 2) || normalizedRating < 0.5 || normalizedRating > 5) {
    return { success: false, error: 'Choose a rating from half a star to five stars.' }
  }

  if (!normalizedText || normalizedText.length > 2000) {
    return { success: false, error: 'Please write a review of up to 2000 characters.' }
  }

  const { error } = await supabase.rpc('submit_completed_course_review', {
    p_course_id: courseId,
    p_rating: normalizedRating,
    p_review_text: normalizedText,
  })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'You have already reviewed this course.' }
    }
    console.error('Course review submission failed:', error)
    return { success: false, error: 'Your review could not be saved. Please try again.' }
  }

  return { success: true }
}
