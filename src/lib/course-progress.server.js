import 'server-only'
import { buildLessonAccessMap } from '@/lib/course-progression'

export async function getOrderedCourseStructure(supabase, courseId) {
  const [{ data: modules, error: moduleError }, { data: lessons, error: lessonError }] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, display_order')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, module_id, display_order')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true })
  ])

  if (moduleError) throw moduleError
  if (lessonError) throw lessonError

  return (modules || []).map((module) => ({
    ...module,
    lessons: (lessons || []).filter((lesson) => lesson.module_id === module.id)
  }))
}

export async function verifyLessonProgressAccess(supabase, userId, lessonId, expectedType) {
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id, module_id, type, youtube_url, duration_seconds, assessment_key')
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) throw new Error('Lesson not found.')
  if (expectedType && lesson.type !== expectedType) throw new Error('Invalid lesson type.')

  const [{ data: enrollment, error: enrollmentError }, { data: existingProgress, error: progressError }] = await Promise.all([
    supabase
      .from('user_enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', lesson.course_id)
      .eq('payment_status', 'completed')
      .single(),
    supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle()
  ])

  if (enrollmentError || !enrollment) throw new Error('Active enrollment not found.')
  if (progressError) throw progressError

  if (!existingProgress) {
    const modules = await getOrderedCourseStructure(supabase, lesson.course_id)
    const lessonIds = modules.flatMap((module) => module.lessons.map((item) => item.id))
    const { data: progressRows, error: courseProgressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)

    if (courseProgressError) throw courseProgressError

    const completedMap = Object.fromEntries(
      (progressRows || []).map((row) => [row.lesson_id, row.is_completed])
    )
    const accessMap = buildLessonAccessMap(modules, completedMap)

    if (!accessMap[lessonId]) throw new Error('Complete the previous lesson to unlock this lesson.')
  }

  return { lesson, enrollment, existingProgress }
}
