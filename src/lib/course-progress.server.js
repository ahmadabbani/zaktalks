import 'server-only'
import { buildLessonAccessMap } from '@/lib/course-progression'
import { isStaffRole } from '@/lib/auth-utils'

export async function getOrderedCourseStructure(supabase, courseId) {
  const [{ data: modules, error: moduleError }, { data: lessons, error: lessonError }] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, display_order')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, module_id, display_order, is_course_introduction')
      .eq('course_id', courseId)
      .order('display_order', { ascending: true })
  ])

  if (moduleError) throw moduleError
  if (lessonError) throw lessonError

  return {
    introductionLesson: (lessons || []).find((lesson) => lesson.is_course_introduction) || null,
    modules: (modules || []).map((module) => ({
      ...module,
      lessons: (lessons || []).filter((lesson) => !lesson.is_course_introduction && lesson.module_id === module.id)
    }))
  }
}

export async function verifyLessonProgressAccess(supabase, userId, lessonId, expectedType) {
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id, module_id, type, youtube_url, duration_seconds, assessment_key, is_course_introduction')
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) throw new Error('Lesson not found.')
  if (expectedType && lesson.type !== expectedType) throw new Error('Invalid lesson type.')

  const [
    { data: enrollment, error: enrollmentError },
    { data: existingProgress, error: progressError },
    { data: profile, error: profileError }
  ] = await Promise.all([
    supabase
      .from('user_enrollments')
      .select('id, payment_status')
      .eq('user_id', userId)
      .eq('course_id', lesson.course_id)
      .in('payment_status', ['completed', 'staff'])
      .single(),
    supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()
  ])

  if (enrollmentError || !enrollment) throw new Error('Active enrollment not found.')
  if (progressError) throw progressError
  if (profileError || !profile) throw new Error('Account role could not be verified.')

  const hasStaffAccess = isStaffRole(profile.role)
  if (enrollment.payment_status === 'staff' && !hasStaffAccess) {
    throw new Error('Staff course access is no longer active.')
  }

  if (!existingProgress && !hasStaffAccess) {
    const { modules, introductionLesson } = await getOrderedCourseStructure(supabase, lesson.course_id)
    const lessonIds = [
      ...(introductionLesson ? [introductionLesson.id] : []),
      ...modules.flatMap((module) => module.lessons.map((item) => item.id))
    ]
    const { data: progressRows, error: courseProgressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId)
      .in('lesson_id', lessonIds)

    if (courseProgressError) throw courseProgressError

    const completedMap = Object.fromEntries(
      (progressRows || []).map((row) => [row.lesson_id, row.is_completed])
    )
    const accessMap = buildLessonAccessMap(modules, completedMap, introductionLesson)

    if (!accessMap[lessonId]) throw new Error('Complete the previous lesson to unlock this lesson.')
  }

  return { lesson, enrollment, existingProgress }
}
