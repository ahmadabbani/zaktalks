'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth-utils'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ''))
}

function revalidateCourseStructure(courseId) {
  revalidatePath(`/admin/courses/${courseId}/lessons`)
  revalidatePath('/courses', 'layout')
  revalidatePath('/dashboard')
}

async function getCourseModule(supabase, courseId, moduleId) {
  if (!isUuid(courseId) || !isUuid(moduleId)) return null

  const { data } = await supabase
    .from('course_modules')
    .select('id, course_id, display_order')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .maybeSingle()

  return data || null
}

async function getNextLessonOrder(supabase, moduleId) {
  const { data } = await supabase
    .from('lessons')
    .select('display_order')
    .eq('module_id', moduleId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.display_order || 0) + 1
}

export async function createModule(courseId, formData) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const title = cleanText(formData.get('title'), 120)
  const description = cleanText(formData.get('description'), 500) || null

  if (!isUuid(courseId) || !title) {
    return { error: 'Please enter a valid module title.' }
  }

  const { data: lastModule } = await supabase
    .from('course_modules')
    .select('display_order')
    .eq('course_id', courseId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from('course_modules').insert({
    course_id: courseId,
    title,
    description,
    display_order: (lastModule?.display_order || 0) + 1
  })

  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function updateModule(courseId, moduleId, formData) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const title = cleanText(formData.get('title'), 120)
  const description = cleanText(formData.get('description'), 500) || null

  if (!title || !(await getCourseModule(supabase, courseId, moduleId))) {
    return { error: 'Module not found or the title is invalid.' }
  }

  const { error } = await supabase
    .from('course_modules')
    .update({ title, description, updated_at: new Date().toISOString() })
    .eq('id', moduleId)
    .eq('course_id', courseId)

  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function deleteModule(courseId, moduleId) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()

  if (!(await getCourseModule(supabase, courseId, moduleId))) {
    return { error: 'Module not found.' }
  }

  const { count, error: countError } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', moduleId)

  if (countError) return { error: countError.message }
  if (count) {
    return { error: 'Move or delete this module’s lessons before deleting the module.' }
  }

  const { error } = await supabase
    .from('course_modules')
    .delete()
    .eq('id', moduleId)
    .eq('course_id', courseId)

  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function updateCourseStructure(courseId, structure) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()

  if (!isUuid(courseId) || !Array.isArray(structure) || structure.length > 100) {
    return { error: 'Invalid course structure.' }
  }

  const moduleIds = structure.map((module) => module.id)
  if (moduleIds.some((id) => !isUuid(id)) || new Set(moduleIds).size !== moduleIds.length) {
    return { error: 'Invalid module order.' }
  }

  const { data: ownedModules, error: modulesError } = await supabase
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId)
    .in('id', moduleIds)

  if (modulesError || ownedModules?.length !== moduleIds.length) {
    return { error: 'One or more modules do not belong to this course.' }
  }

  const lessonUpdates = structure.flatMap((module) =>
    (Array.isArray(module.lessons) ? module.lessons : []).map((lesson) => ({
      id: lesson.id,
      moduleId: module.id,
      displayOrder: lesson.display_order
    }))
  )
  const lessonIds = lessonUpdates.map((lesson) => lesson.id)

  if (lessonIds.some((id) => !isUuid(id)) || new Set(lessonIds).size !== lessonIds.length) {
    return { error: 'Invalid lesson order.' }
  }

  if (lessonIds.length) {
    const { data: ownedLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .in('id', lessonIds)

    if (lessonsError || ownedLessons?.length !== lessonIds.length) {
      return { error: 'One or more lessons do not belong to this course.' }
    }
  }

  const now = new Date().toISOString()
  const moduleResults = await Promise.all(
    structure.map((module, index) =>
      supabase
        .from('course_modules')
        .update({ display_order: index + 1, updated_at: now })
        .eq('id', module.id)
        .eq('course_id', courseId)
    )
  )

  if (moduleResults.some((result) => result.error)) {
    return { error: 'Some modules failed to update.' }
  }

  const lessonResults = await Promise.all(
    lessonUpdates.map((lesson, index) =>
      supabase
        .from('lessons')
        .update({
          module_id: lesson.moduleId,
          display_order: Number.isInteger(lesson.displayOrder) ? lesson.displayOrder : index + 1,
          updated_at: now
        })
        .eq('id', lesson.id)
        .eq('course_id', courseId)
    )
  )

  if (lessonResults.some((result) => result.error)) {
    return { error: 'Some lessons failed to update.' }
  }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function createLesson(courseId, formData) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const moduleId = String(formData.get('module_id') || '')
  const courseModule = await getCourseModule(supabase, courseId, moduleId)

  if (!courseModule) return { error: 'Choose a valid module before creating a lesson.' }

  const title = cleanText(formData.get('title'), 200)
  const description = cleanText(formData.get('description'), 2000) || null
  const type = formData.get('type')

  if (!title || !['video', 'assessment'].includes(type)) {
    return { error: 'Please enter valid lesson details.' }
  }

  const lessonData = {
    course_id: courseId,
    module_id: moduleId,
    title,
    description,
    type,
    display_order: await getNextLessonOrder(supabase, moduleId)
  }

  if (type === 'video') {
    lessonData.youtube_url = cleanText(formData.get('youtube_url'), 1000)
    if (!lessonData.youtube_url) return { error: 'A YouTube URL is required.' }
  } else {
    lessonData.assessment_key = cleanText(formData.get('assessment_key'), 200)
    if (!lessonData.assessment_key) return { error: 'Choose an assessment.' }
  }

  const { error } = await supabase.from('lessons').insert(lessonData)
  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function deleteLesson(courseId, lessonId) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()

  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: 'Invalid lesson.' }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function updateLesson(courseId, lessonId, formData) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const moduleId = String(formData.get('module_id') || '')
  const courseModule = await getCourseModule(supabase, courseId, moduleId)

  if (!courseModule || !isUuid(lessonId)) return { error: 'Lesson or module not found.' }

  const { data: currentLesson } = await supabase
    .from('lessons')
    .select('module_id, display_order')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (!currentLesson) return { error: 'Lesson not found.' }

  const title = cleanText(formData.get('title'), 200)
  const description = cleanText(formData.get('description'), 2000) || null
  const type = formData.get('type')

  if (!title || !['video', 'assessment'].includes(type)) {
    return { error: 'Please enter valid lesson details.' }
  }

  const lessonData = {
    module_id: moduleId,
    title,
    description,
    type,
    updated_at: new Date().toISOString()
  }

  if (currentLesson.module_id !== moduleId) {
    lessonData.display_order = await getNextLessonOrder(supabase, moduleId)
  }

  if (type === 'video') {
    lessonData.youtube_url = cleanText(formData.get('youtube_url'), 1000)
    lessonData.duration_seconds = null
    lessonData.assessment_key = null
    lessonData.passing_score = null
    if (!lessonData.youtube_url) return { error: 'A YouTube URL is required.' }
  } else {
    lessonData.assessment_key = cleanText(formData.get('assessment_key'), 200)
    lessonData.youtube_url = null
    lessonData.duration_seconds = null
    if (!lessonData.assessment_key) return { error: 'Choose an assessment.' }
  }

  const { error } = await supabase
    .from('lessons')
    .update(lessonData)
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { error: error.message }

  revalidateCourseStructure(courseId)
  return { success: true }
}
