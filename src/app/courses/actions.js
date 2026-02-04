'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Updates or creates a lesson progress record for a user.
 * Marks lesson as completed if threshold is met.
 */
export async function updateLessonProgress({ lessonId, userId, watchTime, isCompleted, score }) {
  const supabase = await createClient()

  // 1. Fetch Lesson to get Course ID
  const { data: lesson } = await supabase
    .from('lessons')
    .select('course_id')
    .eq('id', lessonId)
    .single()

  if (!lesson) throw new Error('Lesson not found')

  // 2. Fetch Enrollment ID (Required by schema)
  const { data: enrollment } = await supabase
    .from('user_enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', lesson.course_id)
    .single()

  if (!enrollment) throw new Error('Enrollment not found')

  // 3. Get existing progress to check completion
  const { data: existingProgress } = await supabase
    .from('lesson_progress')
    .select('is_completed, completed_at, score')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .single()

  // If already completed, just update watch_time but keep is_completed true
  const finalIsCompleted = (existingProgress?.is_completed || isCompleted)

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      enrollment_id: enrollment.id,
      watch_time_seconds: watchTime,
      is_completed: finalIsCompleted,
      score: score !== undefined ? score : (existingProgress?.score || null),
      completed_at: isCompleted ? new Date().toISOString() : (existingProgress?.completed_at || null),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id, lesson_id'
    })

  if (error) {
    console.error('Error updating lesson progress:', error)
    throw new Error('Failed to update progress')
  }

  // If this transition marks completion for the first time, revalidate paths
  if (isCompleted && !existingProgress?.is_completed) {
      revalidatePath('/dashboard')
      revalidatePath(`/courses/[slug]/player/[lessonId]`, 'layout')
  }

  return { success: true }
}
