'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth-utils'
import { randomUUID } from 'node:crypto'
import { sanitizeDescriptionRichContent, sanitizeLessonRichContent } from '@/lib/rich-text'
import { normalizeYouTubeVideoUrl } from '@/lib/youtube-url'
import { LESSON_NUMBERING_STYLES } from '@/lib/lesson-numbering'
import { isAssessmentTimeOption } from '@/lib/assessment-lesson-metadata'
import {
  contentFieldChange,
  deleteContentWithActivity,
  recordContentActivity,
  recordContentCreationActivity,
} from '@/lib/admin/content-creation-audit'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LESSON_RESOURCE_BUCKET = 'lesson-resources'
const LESSON_RESOURCE_TYPES = new Set(['none', 'text', 'pdf', 'link'])
const MAX_RESOURCE_PDF_BYTES = 10 * 1024 * 1024
const MAX_LESSON_RESOURCES = 20

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

async function getLessonResources(supabase, lessonId) {
  const { data, error } = await supabase
    .from('lesson_resources')
    .select('id, lesson_id, resource_type, text_content, rich_content, external_url, storage_path, original_file_name, file_size_bytes')
    .eq('lesson_id', lessonId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Unable to load the lesson resources: ${error.message}`)
  return data || []
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

function getSubmittedResourceCount(formData) {
  const count = Number(formData.get('resource_count') || 0)
  if (!Number.isInteger(count) || count < 0 || count > MAX_LESSON_RESOURCES) {
    throw new Error(`A lesson can have up to ${MAX_LESSON_RESOURCES} additional resources.`)
  }
  return count
}

function lessonResourceAuditValue(resources) {
  return resources.map((resource) => ({
    type: resource.resource_type,
    text: resource.text_content || null,
    rich: resource.rich_content || {},
    url: resource.external_url || null,
    file: resource.original_file_name || null,
  }))
}

async function saveLessonResources(supabase, courseId, lessonId, formData, currentResources = null) {
  const existingResources = currentResources || await getLessonResources(supabase, lessonId)
  const existingById = new Map(existingResources.map((resource) => [resource.id, resource]))
  const count = getSubmittedResourceCount(formData)
  const submittedIds = new Set()
  const resources = []
  const uploadedStoragePaths = []

  try {
    for (let index = 0; index < count; index += 1) {
      const resourceNumber = index + 1
      const submittedId = cleanText(formData.get(`resource_id_${index}`), 50) || null
      const resourceType = cleanText(formData.get(`resource_type_${index}`), 20)

      if (!LESSON_RESOURCE_TYPES.has(resourceType) || resourceType === 'none') {
        throw new Error(`Choose a valid type for additional resource ${resourceNumber}.`)
      }
      if (submittedId && (!isUuid(submittedId) || !existingById.has(submittedId) || submittedIds.has(submittedId))) {
        throw new Error('One of the submitted lesson resources is invalid.')
      }
      if (submittedId) submittedIds.add(submittedId)

      const currentResource = submittedId ? existingById.get(submittedId) : null
      let resourceData

      if (resourceType === 'text') {
        const textContent = cleanText(formData.get(`resource_text_${index}`), 20000)
        if (!textContent) throw new Error(`Enter the text for additional resource ${resourceNumber}.`)
        const richContent = sanitizeDescriptionRichContent(
          formData.get(`resource_rich_content_json_${index}`),
          textContent,
          20000
        )
        resourceData = { resource_type: 'text', text_content: textContent, rich_content: richContent, external_url: null, storage_path: null, original_file_name: null, file_size_bytes: null }
      } else if (resourceType === 'link') {
        const externalUrl = cleanExternalUrl(formData.get(`resource_url_${index}`))
        if (!externalUrl) throw new Error(`Enter a valid http or https URL for additional resource ${resourceNumber}.`)
        resourceData = { resource_type: 'link', text_content: null, rich_content: {}, external_url: externalUrl, storage_path: null, original_file_name: null, file_size_bytes: null }
      } else {
        const pdfFile = formData.get(`resource_pdf_${index}`)
        if (isUploadedFile(pdfFile)) {
          const uploaded = await uploadResourcePdf(supabase, courseId, lessonId, pdfFile)
          uploadedStoragePaths.push(uploaded.storagePath)
          resourceData = {
            resource_type: 'pdf',
            text_content: null,
            rich_content: {},
            external_url: null,
            storage_path: uploaded.storagePath,
            original_file_name: uploaded.originalFileName,
            file_size_bytes: uploaded.fileSizeBytes
          }
        } else if (currentResource?.resource_type === 'pdf' && currentResource.storage_path) {
          resourceData = {
            resource_type: 'pdf',
            text_content: null,
            rich_content: {},
            external_url: null,
            storage_path: currentResource.storage_path,
            original_file_name: currentResource.original_file_name,
            file_size_bytes: currentResource.file_size_bytes
          }
        } else {
          throw new Error(`Choose a PDF for additional resource ${resourceNumber}.`)
        }
      }

      resources.push({
        id: submittedId || randomUUID(),
        ...resourceData,
        display_order: resourceNumber,
      })
    }

    const { error } = await supabase.rpc('replace_lesson_resources', {
      p_lesson_id: lessonId,
      p_resources: resources,
    })
    if (error) throw new Error(`Unable to save the lesson resources: ${error.message}`)
  } catch (error) {
    if (uploadedStoragePaths.length) {
      await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove(uploadedStoragePaths)
    }
    throw error
  }

  const retainedPaths = new Set(resources.map((resource) => resource.storage_path).filter(Boolean))
  const obsoletePaths = existingResources
    .filter((resource) => resource.resource_type === 'pdf' && resource.storage_path && !retainedPaths.has(resource.storage_path))
    .map((resource) => resource.storage_path)
  if (obsoletePaths.length) {
    const { error } = await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove(obsoletePaths)
    if (error) console.error('Unable to remove replaced lesson resource PDFs:', error.message)
  }

  return resources
}

function revalidateCourseStructure(courseId) {
  revalidatePath(`/admin/courses/${courseId}/lessons`)
  revalidatePath('/courses', 'layout')
  revalidatePath('/dashboard')
}

export async function updateCourseLessonNumbering(courseId, numberingStyle) {
  const access = await requirePermission('courses.content')

  if (!isUuid(courseId) || !Object.values(LESSON_NUMBERING_STYLES).includes(numberingStyle)) {
    return { error: 'Choose a valid lesson numbering style.' }
  }

  const supabase = await createAdminClient()
  const { data: currentCourse, error: currentCourseError } = await supabase
    .from('courses')
    .select('id, lesson_numbering_style')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (currentCourseError) return { error: currentCourseError.message }
  if (!currentCourse) return { error: 'Course not found.' }

  const { data, error } = await supabase
    .from('courses')
    .update({ lesson_numbering_style: numberingStyle, updated_at: new Date().toISOString() })
    .eq('id', courseId)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Course not found.' }

  await recordContentActivity(supabase, access, 'updated', 'course', courseId, [
    contentFieldChange('Lesson numbering', currentCourse.lesson_numbering_style, numberingStyle),
  ])

  revalidateCourseStructure(courseId)
  return { success: true }
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
  const access = await requirePermission('courses.content')
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

  const { data: module, error } = await supabase
    .from('course_modules')
    .insert({
      course_id: courseId,
      title,
      description,
      rich_content: richContent,
      display_order: (lastModule?.display_order || 0) + 1
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  await recordContentCreationActivity(supabase, access, 'module', module.id)

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function updateModule(courseId, moduleId, formData) {
  const access = await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const title = cleanText(formData.get('title'), 120)
  const description = cleanText(formData.get('description'), 500) || null

  const { data: currentModule, error: currentModuleError } = await supabase
    .from('course_modules')
    .select('id, course_id, title, description, rich_content')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .maybeSingle()

  if (currentModuleError || !title || !currentModule) {
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

  const changes = [
    contentFieldChange('Module title', currentModule.title, title),
    contentFieldChange('Module description', currentModule.description, description),
  ]
  if (!changes.some(Boolean)) {
    changes.push(contentFieldChange('Module text formatting', currentModule.rich_content, richContent))
  }
  await recordContentActivity(supabase, access, 'updated', 'module', moduleId, changes)

  revalidateCourseStructure(courseId)
  return { success: true }
}

function courseIntroductionFields(formData) {
  const title = cleanText(formData.get('title'), 200)
  const description = cleanText(formData.get('description'), 2000) || null
  const submittedUrl = cleanText(formData.get('youtube_url'), 1000)
  const youtubeUrl = normalizeYouTubeVideoUrl(submittedUrl)

  if (!title) throw new Error('Enter a title for the course introduction.')
  if (!youtubeUrl) throw new Error('Enter a valid secure YouTube link for the course introduction.')

  return { title, description, youtubeUrl }
}

export async function createCourseIntroduction(courseId, formData) {
  const access = await requirePermission('courses.content')
  if (!isUuid(courseId)) return { error: 'Course not found.' }

  const supabase = await createAdminClient()

  try {
    const { title, description, youtubeUrl } = courseIntroductionFields(formData)
    const richContent = sanitizeDescriptionRichContent(
      formData.get('rich_content_json'),
      description || '',
      2000
    )
    const { data: existing, error: existingError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId)
      .eq('is_course_introduction', true)
      .maybeSingle()

    if (existingError) return { error: existingError.message }
    if (existing) return { error: 'This course already has an introduction video.' }

    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert({
        course_id: courseId,
        module_id: null,
        title,
        description,
        rich_content: richContent,
        type: 'video',
        youtube_url: youtubeUrl,
        duration_seconds: null,
        assessment_key: null,
        passing_score: null,
        display_order: 1,
        is_course_introduction: true
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') return { error: 'This course already has an introduction video.' }
      return { error: error.message }
    }

    await recordContentCreationActivity(supabase, access, 'lesson', lesson.id)

    revalidateCourseStructure(courseId)
    return { success: true }
  } catch (error) {
    return { error: error.message || 'Could not create the course introduction.' }
  }
}

export async function updateCourseIntroduction(courseId, lessonId, formData) {
  const access = await requirePermission('courses.content')
  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: 'Course introduction not found.' }

  const supabase = await createAdminClient()

  try {
    const { title, description, youtubeUrl } = courseIntroductionFields(formData)
    const richContent = sanitizeDescriptionRichContent(
      formData.get('rich_content_json'),
      description || '',
      2000
    )
    const { data: current, error: currentError } = await supabase
      .from('lessons')
      .select('id, title, description, rich_content, youtube_url, duration_seconds')
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .eq('is_course_introduction', true)
      .maybeSingle()

    if (currentError) return { error: currentError.message }
    if (!current) return { error: 'Course introduction not found.' }

    const { error } = await supabase
      .from('lessons')
      .update({
        title,
        description,
        rich_content: richContent,
        youtube_url: youtubeUrl,
        duration_seconds: current.youtube_url === youtubeUrl ? current.duration_seconds : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .eq('course_id', courseId)
      .eq('is_course_introduction', true)

    if (error) return { error: error.message }

    const changes = [
      contentFieldChange('Introduction title', current.title, title),
      contentFieldChange('Introduction description', current.description, description),
      contentFieldChange('Introduction video', current.youtube_url, youtubeUrl),
    ]
    if (!changes.some(Boolean)) {
      changes.push(contentFieldChange('Introduction text formatting', current.rich_content, richContent))
    }
    await recordContentActivity(supabase, access, 'updated', 'lesson', lessonId, changes)

    revalidateCourseStructure(courseId)
    return { success: true }
  } catch (error) {
    return { error: error.message || 'Could not update the course introduction.' }
  }
}

export async function deleteCourseIntroduction(courseId, lessonId) {
  const access = await requirePermission('courses.content')
  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: 'Course introduction not found.' }

  const supabase = await createAdminClient()
  const deleteResult = await deleteContentWithActivity(supabase, access, 'lesson', lessonId, {
    courseId,
    isCourseIntroduction: true,
  })
  if (deleteResult.error) return deleteResult

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function deleteModule(courseId, moduleId) {
  const access = await requirePermission('courses.content')
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

  const deleteResult = await deleteContentWithActivity(supabase, access, 'module', moduleId, { courseId })
  if (deleteResult.error) return deleteResult

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
      .eq('is_course_introduction', false)
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
        .eq('is_course_introduction', false)
    )
  )

  if (lessonResults.some((result) => result.error)) {
    return { error: 'Some lessons failed to update.' }
  }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function createLesson(courseId, formData) {
  const access = await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const moduleId = String(formData.get('module_id') || '')
  const courseModule = await getCourseModule(supabase, courseId, moduleId)

  if (!courseModule) return { error: 'Choose a valid module before creating a lesson.' }

  const title = cleanText(formData.get('title'), 200)
  const description = cleanText(formData.get('description'), 2000) || null
  const type = formData.get('type')
  const instructions = type === 'assessment'
    ? cleanText(formData.get('instructions'), 5000) || null
    : null
  const assessmentTimeEstimate = type === 'assessment'
    ? cleanText(formData.get('assessment_time_estimate'), 40)
    : null
  const assessmentCompletionGuidance = type === 'assessment'
    ? cleanText(formData.get('assessment_completion_guidance'), 2000)
    : null

  if (!title || !['video', 'assessment'].includes(type)) {
    return { error: 'Please enter valid lesson details.' }
  }
  if (type === 'assessment' && !isAssessmentTimeOption(assessmentTimeEstimate)) {
    return { error: 'Choose an assessment time estimate.' }
  }
  if (type === 'assessment' && !assessmentCompletionGuidance) {
    return { error: 'Explain how learners should complete this assessment.' }
  }

  let richContent
  try {
    richContent = sanitizeLessonRichContent(formData.get('rich_content_json'), {
      description: description || '',
      instructions: instructions || '',
    })
  } catch (error) {
    return { error: error.message }
  }

  const lessonData = {
    course_id: courseId,
    module_id: moduleId,
    title,
    description,
    instructions,
    assessment_time_estimate: assessmentTimeEstimate,
    assessment_completion_guidance: assessmentCompletionGuidance,
    rich_content: richContent,
    type,
    display_order: await getNextLessonOrder(supabase, moduleId),
    is_course_introduction: false
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
    await saveLessonResources(supabase, courseId, lesson.id, formData, [])
  } catch (resourceError) {
    await supabase.from('lessons').delete().eq('id', lesson.id).eq('course_id', courseId)
    return { error: resourceError.message }
  }

  await recordContentCreationActivity(supabase, access, 'lesson', lesson.id)

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function deleteLesson(courseId, lessonId) {
  const access = await requirePermission('courses.content')
  const supabase = await createAdminClient()

  if (!isUuid(courseId) || !isUuid(lessonId)) return { error: 'Invalid lesson.' }

  let resourcePaths = []
  try {
    const resources = await getLessonResources(supabase, lessonId)
    resourcePaths = resources
      .filter((resource) => resource.resource_type === 'pdf' && resource.storage_path)
      .map((resource) => resource.storage_path)
  } catch (resourceError) {
    return { error: resourceError.message }
  }

  const deleteResult = await deleteContentWithActivity(supabase, access, 'lesson', lessonId, {
    courseId,
    isCourseIntroduction: false,
  })
  if (deleteResult.error) return deleteResult

  if (resourcePaths.length) {
    const { error: storageError } = await supabase.storage.from(LESSON_RESOURCE_BUCKET).remove(resourcePaths)
    if (storageError) console.error('Unable to remove lesson resource PDFs:', storageError.message)
  }

  revalidateCourseStructure(courseId)
  return { success: true }
}

export async function updateLesson(courseId, lessonId, formData) {
  const access = await requirePermission('courses.content')
  const supabase = await createAdminClient()
  const moduleId = String(formData.get('module_id') || '')
  const courseModule = await getCourseModule(supabase, courseId, moduleId)

  if (!courseModule || !isUuid(lessonId)) return { error: 'Lesson or module not found.' }

  const { data: currentLesson, error: currentLessonError } = await supabase
    .from('lessons')
    .select('module_id, display_order, title, description, instructions, assessment_time_estimate, assessment_completion_guidance, rich_content, type, youtube_url, assessment_key')
    .eq('id', lessonId)
    .eq('course_id', courseId)
    .eq('is_course_introduction', false)
    .maybeSingle()

  if (currentLessonError) return { error: currentLessonError.message }
  if (!currentLesson) return { error: 'Lesson not found.' }

  let currentResources
  try {
    currentResources = await getLessonResources(supabase, lessonId)
  } catch (resourceError) {
    return { error: resourceError.message }
  }

  const title = cleanText(formData.get('title'), 200)
  const description = cleanText(formData.get('description'), 2000) || null
  const type = formData.get('type')
  const instructions = type === 'assessment'
    ? cleanText(formData.get('instructions'), 5000) || null
    : null
  const assessmentTimeEstimate = type === 'assessment'
    ? cleanText(formData.get('assessment_time_estimate'), 40)
    : null
  const assessmentCompletionGuidance = type === 'assessment'
    ? cleanText(formData.get('assessment_completion_guidance'), 2000)
    : null

  if (!title || !['video', 'assessment'].includes(type)) {
    return { error: 'Please enter valid lesson details.' }
  }
  if (type === 'assessment' && !isAssessmentTimeOption(assessmentTimeEstimate)) {
    return { error: 'Choose an assessment time estimate.' }
  }
  if (type === 'assessment' && !assessmentCompletionGuidance) {
    return { error: 'Explain how learners should complete this assessment.' }
  }

  let richContent
  try {
    richContent = sanitizeLessonRichContent(formData.get('rich_content_json'), {
      description: description || '',
      instructions: instructions || '',
    })
  } catch (error) {
    return { error: error.message }
  }

  const lessonData = {
    module_id: moduleId,
    title,
    description,
    instructions,
    assessment_time_estimate: assessmentTimeEstimate,
    assessment_completion_guidance: assessmentCompletionGuidance,
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
    .eq('is_course_introduction', false)

  if (error) return { error: error.message }

  const changes = [
    contentFieldChange('Lesson title', currentLesson.title, lessonData.title),
    contentFieldChange('Lesson description', currentLesson.description, lessonData.description),
    contentFieldChange('Lesson type', currentLesson.type, lessonData.type),
    contentFieldChange('Module', currentLesson.module_id, lessonData.module_id),
    contentFieldChange('Video', currentLesson.youtube_url, lessonData.youtube_url),
    contentFieldChange('Assessment', currentLesson.assessment_key, lessonData.assessment_key),
    contentFieldChange('Assessment instructions', currentLesson.instructions, lessonData.instructions),
    contentFieldChange('Assessment time', currentLesson.assessment_time_estimate, lessonData.assessment_time_estimate),
    contentFieldChange('Assessment completion guidance', currentLesson.assessment_completion_guidance, lessonData.assessment_completion_guidance),
  ]
  if (!changes.some(Boolean)) {
    changes.push(contentFieldChange('Lesson text formatting', currentLesson.rich_content, lessonData.rich_content))
  }

  try {
    const nextResources = await saveLessonResources(supabase, courseId, lessonId, formData, currentResources)
    changes.push(contentFieldChange(
      'Additional resources',
      lessonResourceAuditValue(currentResources),
      lessonResourceAuditValue(nextResources),
    ))
  } catch (resourceError) {
    await recordContentActivity(supabase, access, 'updated', 'lesson', lessonId, changes)
    return { error: `The lesson was updated, but its additional resources were not saved. ${resourceError.message}` }
  }

  await recordContentActivity(supabase, access, 'updated', 'lesson', lessonId, changes)

  revalidateCourseStructure(courseId)
  return { success: true }
}
