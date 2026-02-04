'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'

export async function createLesson(courseId, formData) {
  await requireAdmin()
  const supabase = await createClient()

  const title = formData.get('title')
  const description = formData.get('description')
  const type = formData.get('type') // 'video' or 'assessment'
  const display_order = parseInt(formData.get('display_order') || '0')

  const lessonData = {
    course_id: courseId,
    title,
    description,
    type,
    display_order
  }

  if (type === 'video') {
    lessonData.youtube_url = formData.get('youtube_url')
  } else {
    lessonData.assessment_key = formData.get('assessment_key')
    lessonData.passing_score = parseInt(formData.get('passing_score') || '70')
  }

  const { error } = await supabase
    .from('lessons')
    .insert([lessonData])

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`)
  return { success: true }
}

export async function updateLessonOrder(courseId, lessons) {
  await requireAdmin()
  const supabase = await createClient()

  // lessons is an array of { id, display_order }
  const updates = lessons.map(l => 
    supabase.from('lessons').update({ display_order: l.display_order }).eq('id', l.id)
  )

  const results = await Promise.all(updates)
  const errors = results.filter(r => r.error)

  if (errors.length > 0) {
    return { error: 'Some lessons failed to update' }
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`)
  return { success: true }
}

export async function deleteLesson(courseId, lessonId) {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`)
  return { success: true }
}
export async function updateLesson(courseId, lessonId, formData) {
  await requireAdmin()
  const supabase = await createClient()

  const title = formData.get('title')
  const description = formData.get('description')
  const type = formData.get('type')
  
  const lessonData = {
    title,
    description,
    type
  }

  if (type === 'video') {
    lessonData.youtube_url = formData.get('youtube_url')
    lessonData.assessment_key = null
    lessonData.passing_score = null
  } else {
    lessonData.assessment_key = formData.get('assessment_key')
    lessonData.passing_score = parseInt(formData.get('passing_score') || '70')
    lessonData.youtube_url = null
  }

  const { error } = await supabase
    .from('lessons')
    .update(lessonData)
    .eq('id', lessonId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/admin/courses/${courseId}/lessons`)
  return { success: true }
}
