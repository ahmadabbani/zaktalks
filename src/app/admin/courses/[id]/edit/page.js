import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { updateCourse, deleteCourse } from '../../actions'
import CourseForm from '@/components/admin/CourseForm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DeleteCourseBtn from '@/components/admin/DeleteCourseBtn'
import { FaArrowLeft } from 'react-icons/fa'
import styles from '@/components/admin/CourseForm.module.css'

export default async function EditCoursePage({ params }) {
  const { id } = await params
  const supabase = await createAdminClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*, faqs:course_faqs(*), images:course_images(*)')
    .eq('id', id)
    .single()

  if (error || !course) {
    notFound()
  }

  // Bind the ID to the update action
  const updateCourseWithId = updateCourse.bind(null, id)

  return (
    <div className={styles.formContainer}>
      <div className={styles.formWrapper}>
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <Link href="/admin/courses" className={styles.backButton}>
            <FaArrowLeft /> Back to Courses
          </Link>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <h1 className={styles.pageTitle} style={{ marginBottom: 0 }}>Edit Course: {course.title}</h1>
            
            <div>
              <DeleteCourseBtn courseId={id} courseName={course.title} />
            </div>
          </div>
        </div>
        <CourseForm 
          initialData={course} 
          action={updateCourseWithId} 
          buttonText="Update Course" 
        />
      </div>
    </div>
  )
}
