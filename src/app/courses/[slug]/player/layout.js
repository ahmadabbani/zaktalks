import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { FaChevronLeft } from 'react-icons/fa'
import LessonList from './LessonList'
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

  // 3. Fetch Lessons and Progress
  const { data: lessons } = await supabase
    .from('lessons')
    .select('id, title, type, display_order')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true })

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)

  const completedMap = progress?.reduce((acc, curr) => {
    acc[curr.lesson_id] = curr.is_completed
    return acc
  }, {}) || {}

  return (
    <div className={styles.playerContainer}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        {/* Sidebar Header */}
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.backLink}>
            <FaChevronLeft /> Back to Dashboard
          </Link>
          <h2 className={styles.courseTitle}>{course.title}</h2>
        </div>

        {/* Lesson List */}
        <LessonList lessons={lessons} slug={slug} completedMap={completedMap} />
      </aside>

      {/* Content Area */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}
