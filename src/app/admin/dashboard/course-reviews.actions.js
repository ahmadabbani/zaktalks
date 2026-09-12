'use server'

import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-utils'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function updateCourseReview({ reviewId, rating, reviewText }) {
  const access = await requireAdmin()
  const normalizedRating = Number(rating)
  const normalizedText = typeof reviewText === 'string' ? reviewText.trim() : ''

  if (!UUID_PATTERN.test(reviewId || '')) return { success: false, error: 'Invalid review.' }
  if (!Number.isFinite(normalizedRating) || normalizedRating < 0.5 || normalizedRating > 5 || !Number.isInteger(normalizedRating * 2)) {
    return { success: false, error: 'Choose a rating from 0.5 to 5 stars.' }
  }
  if (!normalizedText || normalizedText.length > 2000) {
    return { success: false, error: 'Review text must be between 1 and 2000 characters.' }
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('course_reviews')
    .update({
      rating: normalizedRating,
      review_text: normalizedText,
      updated_at: new Date().toISOString(),
      moderated_by: access.user.id,
    })
    .eq('id', reviewId)
    .is('deleted_at', null)
    .select('id, rating, review_text, updated_at, moderated_by')
    .maybeSingle()

  if (error || !data) {
    console.error('Unable to edit course review:', error)
    return { success: false, error: 'Could not save the review. Please try again.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, review: data }
}

export async function setCourseReviewPublication({ reviewId, published }) {
  const access = await requireAdmin()
  if (!UUID_PATTERN.test(reviewId || '') || typeof published !== 'boolean') {
    return { success: false, error: 'Invalid review update.' }
  }

  const supabase = await createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('course_reviews')
    .update({
      is_published: published,
      published_at: published ? now : null,
      updated_at: now,
      moderated_by: access.user.id,
    })
    .eq('id', reviewId)
    .is('deleted_at', null)
    .select('id, is_published, published_at, updated_at, moderated_by')
    .maybeSingle()

  if (error || !data) {
    console.error('Unable to change course review publication:', error)
    return { success: false, error: 'Could not update the review. Please try again.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, review: data }
}

export async function deleteCourseReview({ reviewId }) {
  const access = await requireAdmin()
  if (!UUID_PATTERN.test(reviewId || '')) return { success: false, error: 'Invalid review.' }

  const supabase = await createAdminClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('course_reviews')
    .update({
      deleted_at: now,
      is_published: false,
      published_at: null,
      updated_at: now,
      moderated_by: access.user.id,
    })
    .eq('id', reviewId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle()

  if (error || !data) {
    console.error('Unable to delete course review:', error)
    return { success: false, error: 'Could not delete the review.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}
