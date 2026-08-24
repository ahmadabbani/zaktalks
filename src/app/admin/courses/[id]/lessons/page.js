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

  let resources = []
  const lessonIds = (lessons || []).map((lesson) => lesson.id)
  if (lessonIds.length) {
    const { data } = await supabase
      .from('lesson_resources')
      .select('id, lesson_id, resource_type, text_content, external_url, storage_path, original_file_name, file_size_bytes')
      .in('lesson_id', lessonIds)
    resources = data || []
  }
  const resourceByLesson = new Map(resources.map((resource) => [resource.lesson_id, resource]))

  // Fetch simple assessment list for the dropdown
  const assessments = getAssessmentList()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/dashboard?view=courses" className={styles.backLink}>
          <FaArrowLeft /> Back to Courses
        </Link>
        <h1 className={styles.pageTitle}>Course Modules: {course.title}</h1>

        <LessonListUI 
          courseId={id} 
          initialModules={(modules || []).map((module) => ({
            ...module,
            lessons: (lessons || [])
              .filter((lesson) => lesson.module_id === module.id)
              .map((lesson) => ({
                ...lesson,
                additional_resource: resourceByLesson.get(lesson.id) || null
              }))
          }))}
          assessments={assessments} 
        />
      </div>
    </div>
  )
}
