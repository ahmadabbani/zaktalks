import { createCourse } from '../actions'
import CourseForm from '@/components/admin/CourseForm'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import styles from '@/components/admin/CourseForm.module.css'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function NewCoursePage() {
  return (
    <div className={styles.formContainer}>
      <div className={styles.formWrapper}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: 'var(--space-sm)' }}>
          <Link href="/admin/courses" className={styles.backButton}>
            <FaArrowLeft /> Back
          </Link>
          <h1 className={styles.pageTitle}>Create New Course</h1>
        </div>
        <CourseForm action={createCourse} />
      </div>
    </div>
  )
}
