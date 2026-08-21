import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FaChevronLeft } from 'react-icons/fa'
import LessonList from './LessonList'
import SidebarWrapper from './SidebarWrapper'
import { CourseProgressProvider } from './CourseProgressContext'
import styles from './player-layout.module.css'

export default async function PlayerLayout({ children, params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 1. Fetch Course & Lessons
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, slug')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  if (courseError || !course) notFound()

  // 2. Verify Enrollment
  const { data: enrollment } = await supabase
    .from('user_enrollments')
    .select('id, payment_status')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('payment_status', 'completed')
    .single()

  if (!enrollment) redirect(`/courses/${slug}`)

  // 3. Fetch the module structure, lessons, and progress.
  const [{ data: modules }, { data: lessons }, { data: progress }] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, title, description, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, module_id, title, type, duration_seconds, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('lesson_progress')
      .select('lesson_id, is_completed, watch_time_seconds, max_position_reached_seconds')
      .eq('user_id', user.id)
  ])

  const courseModules = (modules || []).map((module) => ({
    ...module,
    lessons: (lessons || []).filter((lesson) => lesson.module_id === module.id)
  }))

  const completedMap = progress?.reduce((acc, curr) => {
    acc[curr.lesson_id] = curr.is_completed
    return acc
  }, {}) || {}

  const lessonDurationMap = Object.fromEntries(
    (lessons || []).map((lesson) => [lesson.id, Number(lesson.duration_seconds) || 0])
  )
  const watchedMap = progress?.reduce((acc, row) => {
    if (row.is_completed) {
      acc[row.lesson_id] = 100
      return acc
    }

    const duration = lessonDurationMap[row.lesson_id]
    const verifiedPosition = Math.max(
      Number(row.max_position_reached_seconds) || 0,
      Number(row.watch_time_seconds) || 0
    )
    acc[row.lesson_id] = duration > 0
      ? Math.min(95, Math.floor(((verifiedPosition / duration) * 100) / 5) * 5)
      : 0
    return acc
  }, {}) || {}

  return (
    <CourseProgressProvider
      modules={courseModules}
      initialCompletedMap={completedMap}
      initialWatchedMap={watchedMap}
    >
      <div className={styles.playerContainer}>
      {/* Sidebar */}
      <SidebarWrapper>
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.backLink}>
            <FaChevronLeft /> Back to Dashboard
          </Link>
          <h2 className={styles.courseTitle}>{course.title}</h2>
        </div>

        {/* Lesson List */}
        <LessonList modules={courseModules} slug={slug} />
      </SidebarWrapper>

      {/* Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>
      </div>
    </CourseProgressProvider>
  )
}
