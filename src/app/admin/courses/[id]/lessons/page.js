import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAssessmentList } from '@/assessments/registry'
import LessonListUI from './LessonListUI'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import styles from './admin-lessons.module.css'
import { requireAdminPagePermission } from '@/lib/auth/admin-page-access'

export default async function AdminLessonsPage({ params }) {
  await requireAdminPagePermission('courses.content')
  const { id } = await params
  const supabase = await createAdminClient()

  // Fetch Course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('title')
    .eq('id', id)
    .single()

  if (courseError || !course) notFound()

  // Fetch modules and lessons separately so ordering stays deterministic.
  const [{ data: modules }, { data: lessons }] = await Promise.all([
    supabase
      .from('course_modules')
      .select('*')
      .eq('course_id', id)
      .order('display_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('*')
      .eq('course_id', id)
      .order('display_order', { ascending: true })
  ])

  // Fetch simple assessment list for the dropdown
  const assessments = getAssessmentList()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/courses" className={styles.backLink}>
          <FaArrowLeft /> Back to Courses
        </Link>
        <h1 className={styles.pageTitle}>Course Modules: {course.title}</h1>

        <LessonListUI 
          courseId={id} 
          initialModules={(modules || []).map((module) => ({
            ...module,
            lessons: (lessons || []).filter((lesson) => lesson.module_id === module.id)
          }))}
          assessments={assessments} 
        />
      </div>
    </div>
  )
}
