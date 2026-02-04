'use client'

import Link from 'next/link'
import { FaBook, FaUsers } from 'react-icons/fa'
import DeleteCourseBtn from '@/components/admin/DeleteCourseBtn'
import styles from './admin-courses.module.css'

export default function CoursesTableRow({ course }) {
  return (
    <tr>
      <td>
        <div className={styles.courseTitle}>{course.title}</div>
        <div className={styles.courseSlug}>{course.slug}</div>
      </td>
      <td>
        <div className={styles.price}>
          ${(course.price_cents / 100).toFixed(2)}
        </div>
      </td>
      <td>
        <div className={styles.statsCell}>
          <div className={styles.statItem}>
            <FaBook />
            <span className={styles.statValue}>{course.lessonCount}</span> Lessons
          </div>
          <div className={styles.statItem}>
            <FaUsers />
            <span className={styles.statValue}>{course.enrolledUsersCount}</span> Students
          </div>
        </div>
      </td>
      <td>
        <span className={`${styles.badge} ${course.is_published ? styles.badgePublished : styles.badgeDraft}`}>
          {course.is_published ? 'Published' : 'Draft'}
        </span>
      </td>
      <td>
        <div className={styles.actions}>
          <Link href={`/admin/courses/${course.id}/lessons`} className={styles.actionButton}>
            Lessons
          </Link>
          <Link href={`/admin/courses/${course.id}/edit`} className={styles.actionButton}>
            Edit
          </Link>
          <div className={styles.deleteButtonWrapper}>
            <DeleteCourseBtn courseId={course.id} courseName={course.title} />
          </div>
        </div>
      </td>
    </tr>
  )
}
