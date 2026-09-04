import { createCourse } from '../actions'
import CourseForm from '@/components/admin/CourseForm'
import Link from 'next/link'
import { FaArrowLeft } from 'react-icons/fa'
import styles from '@/components/admin/CourseForm.module.css'
import { requireAdminPagePermission } from '@/lib/auth/admin-page-access'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default async function NewCoursePage() {
  await requireAdminPagePermission('courses.create')
  const supabase = await createAdminClient()
  const { data: availableCourses } = await supabase
    .from('courses')
    .select('id, title, slug')
    .is('deleted_at', null)
    .order('title', { ascending: true })

  return (
    <div className={styles.formContainer}>
      <div className={styles.formWrapper}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: 'var(--space-sm)' }}>
          <Link href="/admin/dashboard?view=courses" className={styles.backButton}>
            <FaArrowLeft /> Back
          </Link>
          <h1 className={styles.pageTitle}>Create New Course</h1>
        </div>
        <CourseForm action={createCourse} availableCourses={availableCourses || []} />
      </div>
    </div>
  )
}
