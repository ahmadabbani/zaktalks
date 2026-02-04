import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAssessmentList } from '@/assessments/registry'
import LessonListUI from './LessonListUI'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import styles from './admin-lessons.module.css'

export default async function AdminLessonsPage({ params }) {
  const { id } = await params
  const supabase = await createAdminClient()

  // Fetch Course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('title')
    .eq('id', id)
    .single()

  if (courseError || !course) notFound()

  // Fetch Lessons
  const { data: lessons, error: lessonsError } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', id)
    .order('display_order', { ascending: true })

  // Fetch simple assessment list for the dropdown
  const assessments = getAssessmentList()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/courses" className={styles.backLink}>
          <FaArrowLeft /> Back to Courses
        </Link>
        <h1 className={styles.pageTitle}>Course Lessons: {course.title}</h1>

        <LessonListUI 
          courseId={id} 
          initialLessons={lessons || []} 
          assessments={assessments} 
        />
      </div>
    </div>
  )
}
