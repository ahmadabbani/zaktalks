import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdminPagePermission } from '@/lib/auth/admin-page-access'
import Link from 'next/link'
import { FaArrowLeft, FaPlus, FaGraduationCap } from 'react-icons/fa'
import styles from './admin-courses.module.css'
import CourseSuccessToast from './CourseSuccessToast'
import CoursesTableRow from './CoursesTableRow'
import { ASSESSMENTS } from '@/assessments/registry'
import ExternalAssessmentLinks from '../dashboard/ExternalAssessmentLinks'

export default async function AdminCoursesPage() {
  const access = await requireAdminPagePermission('courses.view')
  const can = (permission) => access.role === 'admin' || access.permissions.includes(permission)
  const supabase = await createAdminClient()
  const canManageExternalAssessments = can('external_assessments.manage')
  
  const [{ data: courses, error }, { data: externalLinks }] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        *,
        lessons:lessons(count),
        enrollments:user_enrollments(
          id,
          payment_status,
          user:users(email_verified)
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    canManageExternalAssessments
      ? supabase.from('external_assessment_links').select('id, assessment_key, token, created_at, expires_at, revoked_at').order('created_at', { ascending: false }).limit(20)
      : Promise.resolve({ data: [] }),
  ])

  // Process courses to add counts
  const coursesWithStats = courses?.map(course => {
    const lessonCount = course.lessons?.[0]?.count || 0
    const verifiedEnrollments = course.enrollments?.filter(
      e => e.payment_status === 'completed' && e.user?.email_verified === true
    ) || []
    
    return {
      ...course,
      lessonCount,
      enrolledUsersCount: verifiedEnrollments.length
    }
  })

  return (
    <div className={styles.page}>
      <CourseSuccessToast />
      <div className={styles.header}>
        <h1>Manage Courses</h1>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <Link href="/admin/dashboard" className={styles.backLink}>
            <FaArrowLeft /> Back to Dashboard
          </Link>
          {can('courses.create') && <Link href="/admin/courses/new" className={styles.createButton}>
            <FaPlus /> Create New Course
          </Link>}
        </div>
      </div>

      {error && (
        <div className={styles.errorState}>
          Error loading courses: {error.message}
        </div>
      )}

      {!coursesWithStats || coursesWithStats.length === 0 ? (
        <div className={styles.emptyState}>
          <FaGraduationCap />
          <p>No courses found. Start by creating your first course!</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr>
                <th>Course</th>
                <th>Price</th>
                <th>Stats</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {coursesWithStats.map((course) => (
                <CoursesTableRow key={course.id} course={course} canEdit={can('courses.edit')} canManageContent={can('courses.content')} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManageExternalAssessments && <div className={styles.externalAssessmentTools}>
        <ExternalAssessmentLinks
          assessments={Object.values(ASSESSMENTS).map((assessment) => ({
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
          }))}
          initialLinks={(externalLinks || []).map((link) => ({
            ...link,
            path: `/assessments/external/${link.token}`,
          }))}
        />
      </div>}
    </div>
  )
}
