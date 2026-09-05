'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth-utils'
import { randomUUID } from 'node:crypto'
import { sanitizeDescriptionRichContent } from '@/lib/rich-text'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LESSON_RESOURCE_BUCKET = 'lesson-resources'
const LESSON_RESOURCE_TYPES = new Set(['none', 'text', 'pdf', 'link'])
const MAX_RESOURCE_PDF_BYTES = 10 * 1024 * 1024

function cleanText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength)
}

function isUuid(value) {
  return UUID_PATTERN.test(String(value || ''))
}

function isUploadedFile(value) {
  return value && typeof value.name === 'string' && typeof value.arrayBuffer === 'function' && value.size > 0
}

function cleanFileName(value) {
  return cleanText(value, 180).replace(/[\\/\u0000-\u001f]/g, '_') || 'lesson-resource.pdf'
}

function cleanExternalUrl(value) {
  const candidate = cleanText(value, 2000)
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

async function getLessonResource(supabase, lessonId) {
  const { data, error } = await supabase
    .from('lesson_resources')
    .select('id, lesson_id, resource_type, text_content, external_url, storage_path, original_file_name, file_size_bytes')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load the lesson resource: ${error.message}`)
  return data || null
}

async function uploadResourcePdf(supabase, courseId, lessonId, file) {
  if (file.size > MAX_RESOURCE_PDF_BYTES) throw new Error('The resource PDF must be 10 MB or smaller.')
  if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
    throw new Error('Choose a valid PDF file.')
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('The selected file is not a valid PDF.')

  const storagePath = `${courseId}/${lessonId}/${randomUUID()}.pdf`
  const { error } = await supabase.storage
    .from(LESSON_RESOURCE_BUCKET)
    .upload(storagePath, bytes, { contentType: 'application/pdf', upsert: false })

  if (error) throw new Error(`Unable to upload the resource PDF: ${error.message}`)

  return {
    storagePath,
    originalFileName: cleanFileName(file.name),
    fileSizeBytes: file.size
  }
}

async function saveLessonResource(supabase, courseId, lessonId, formData) {
  const resourceType = cleanText(formData.get('resource_type'), 20) || 'none'
  if (!LESSON_RESOURCE_TYPES.has(resourceType)) throw new Error('Choose a valid additional resource type.')

  const currentResource = await getLessonResource(supabase, lessonId)
  const oldStoragePath = currentResource?.resource_type === 'pdf' ? currentResource.storage_path : null

  if (resourceType === 'none') {
    if (currentResource) {
      const { error } = await supabase.from('lesson_resources').delete().eq('lesson_id', lessonId)
      if (error) throw new Error(`Unable to remove the lesson resource: ${error.message}`)
    }
    if (oldStoragePath) await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove([oldStoragePath])
    return
  }

  let resourceData
  let newStoragePath = null

  if (resourceType === 'text') {
    const textContent = cleanText(formData.get('resource_text'), 20000)
    if (!textContent) throw new Error('Enter the additional resource text.')
    resourceData = { resource_type: 'text', text_content: textContent, external_url: null, storage_path: null, original_file_name: null, file_size_bytes: null }
  } else if (resourceType === 'link') {
    const externalUrl = cleanExternalUrl(formData.get('resource_url'))
    if (!externalUrl) throw new Error('Enter a valid http or https resource link.')
    resourceData = { resource_type: 'link', text_content: null, external_url: externalUrl, storage_path: null, original_file_name: null, file_size_bytes: null }
  } else {
    const pdfFile = formData.get('resource_pdf')
    if (isUploadedFile(pdfFile)) {
      const uploaded = await uploadResourcePdf(supabase, courseId, lessonId, pdfFile)
      newStoragePath = uploaded.storagePath
      resourceData = {
        resource_type: 'pdf',
        text_content: null,
        external_url: null,
        storage_path: uploaded.storagePath,
        original_file_name: uploaded.originalFileName,
        file_size_bytes: uploaded.fileSizeBytes
      }
    } else if (currentResource?.resource_type === 'pdf' && currentResource.storage_path) {
      resourceData = {
        resource_type: 'pdf',
        text_content: null,
        external_url: null,
        storage_path: currentResource.storage_path,
        original_file_name: currentResource.original_file_name,
        file_size_bytes: currentResource.file_size_bytes
      }
    } else {
      throw new Error('Choose a PDF to attach to this lesson.')
    }
  }

  const { error } = await supabase.from('lesson_resources').upsert({
    lesson_id: lessonId,
    ...resourceData,
    updated_at: new Date().toISOString()
  }, { onConflict: 'lesson_id' })

  if (error) {
    if (newStoragePath) await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove([newStoragePath])
    throw new Error(`Unable to save the lesson resource: ${error.message}`)
  }

  if (oldStoragePath && oldStoragePath !== resourceData.storage_path) {
    await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove([oldStoragePath])
  }
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

  let richContent
  try {
    richContent = sanitizeDescriptionRichContent(formData.get('rich_content_json'), description || '', 500)
  } catch (error) {
    return { error: error.message }
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
    rich_content: richContent,
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

  let richContent
  try {
    richContent = sanitizeDescriptionRichContent(formData.get('rich_content_json'), description || '', 500)
  } catch (error) {
    return { error: error.message }
  }

  const { error } = await supabase
    .from('course_modules')
    .update({ title, description, rich_content: richContent, updated_at: new Date().toISOString() })
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

  let richContent
  try {
    richContent = sanitizeDescriptionRichContent(formData.get('rich_content_json'), description || '', 2000)
  } catch (error) {
    return { error: error.message }
  }

  const lessonData = {
    course_id: courseId,
    module_id: moduleId,
    title,
    description,
    rich_content: richContent,
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

  const { data: lesson, error } = await supabase
    .from('lessons')
    .insert(lessonData)
    .select('id')
    .single()
  if (error) return { error: error.message }

  try {
    await saveLessonResource(supabase, courseId, lesson.id, formData)
  } catch (resourceError) {
    await supabase.from('lessons').delete().eq('id', lesson.id).eq('course_id', courseId)
    return { error: resourceError.message }
  }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function deleteLesson(courseId, lessonId) {
  await requirePermission('courses.content')
  const supabase = await createAdminClient()

  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: 'Invalid lesson.' }

  let resourcePath = null
  try {
    const resource = await getLessonResource(supabase, lessonId)
    resourcePath = resource?.resource_type === 'pdf' ? resource.storage_path : null
  } catch (resourceError) {
    return { error: resourceError.message }
  }

  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId)
    .eq('course_id', courseId)

  if (error) return { error: error.message }

  if (resourcePath) {
    const { error: storageError } = await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove([resourcePath])
    if (storageError) console.error(`Unable to remove lesson resource ${resourcePath}:`, storageError.message)
  }

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

  let richContent
  try {
    richContent = sanitizeDescriptionRichContent(formData.get('rich_content_json'), description || '', 2000)
  } catch (error) {
    return { error: error.message }
  }

  const lessonData = {
    module_id: moduleId,
    title,
    description,
    rich_content: richContent,
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

  try {
    await saveLessonResource(supabase, courseId, lessonId, formData)
  } catch (resourceError) {
    return { error: `The lesson was updated, but its additional resource was not saved. ${resourceError.message}` }
  }

  revalidateCourseStructure(courseId)
  return { success: true }
}
