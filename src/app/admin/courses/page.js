import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FaArrowLeft, FaPlus, FaGraduationCap } from 'react-icons/fa'
import styles from './admin-courses.module.css'
import CourseSuccessToast from './CourseSuccessToast'
import CoursesTableRow from './CoursesTableRow'

export default async function AdminCoursesPage() {
  const supabase = await createClient()
  
  // Fetch courses with lesson count and enrollment count
  const { data: courses, error } = await supabase
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
    .order('created_at', { ascending: false })

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
          <Link href="/admin/courses/new" className={styles.createButton}>
            <FaPlus /> Create New Course
          </Link>
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
                <CoursesTableRow key={course.id} course={course} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
