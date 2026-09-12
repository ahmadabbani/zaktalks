'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaAward, FaCertificate, FaCheckCircle, FaChevronLeft, FaChevronRight, FaLock } from 'react-icons/fa'
import CourseReviewModal from '@/components/CourseReviewModal'
import { useCourseProgress } from '../CourseProgressContext'
import styles from './lesson-player.module.css'

export function LessonCompletionBadge({ lessonId }) {
  const { completedMap } = useCourseProgress()

  if (!completedMap[lessonId]) return null

  return (
    <div className={styles.completedBadge} aria-live="polite">
      <FaCheckCircle /> Completed
    </div>
  )
}

export function CourseCompletionCard({ hasCertificate }) {
  return (
    <div className={styles.congratsCard}>
      <div className={styles.congratsContent}>
        <h3 className={styles.congratsTitle}>
          <FaAward className={styles.congratsIcon} />
          Congratulations!
        </h3>
        <p className={styles.congratsMessage}>
          You have completed all lessons in this course.
          {hasCertificate && ' Your certificate is ready in your dashboard.'}
        </p>
      </div>
      {hasCertificate && (
        <Link href="/dashboard?section=certificates" className={styles.certificateButton}>
          <FaCertificate aria-hidden="true" /> View certificate
        </Link>
      )}
    </div>
  )
}

export function CourseCompletionNotice({ lessonIds, courseId, courseName, learnerName, hasCertificate, canReview, hasReview }) {
  const { completedMap } = useCourseProgress()
  const [reviewModalOpen, setReviewModalOpen] = useState(true)
  const isComplete = lessonIds.length > 0 && lessonIds.every((lessonId) => completedMap[lessonId])

  if (!isComplete) return null

  return (
    <>
      <CourseCompletionCard hasCertificate={hasCertificate} />
      {canReview && !hasReview && (
        <CourseReviewModal
          open={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          courseId={courseId}
          courseName={courseName}
          learnerName={learnerName}
          hasCertificate={hasCertificate}
        />
      )}
    </>
  )
}

export function LessonNavigation({ slug, currentLessonId, previousLesson, nextLesson }) {
  const { completedMap, accessMap } = useCourseProgress()
  const nextIsUnlocked = nextLesson ? Boolean(accessMap[nextLesson.id]) : false
  const currentIsCompleted = Boolean(completedMap[currentLessonId])

  return (
    <div className={styles.navigation}>
      {previousLesson ? (
        <Link
          href={`/courses/${slug}/player/${previousLesson.id}`}
          className={`${styles.navButton} ${styles.prevButton}`}
        >
          <FaChevronLeft /> Previous Lesson
        </Link>
      ) : <div />}

      {nextLesson ? (
        nextIsUnlocked ? (
          <Link
            href={`/courses/${slug}/player/${nextLesson.id}`}
            className={`${styles.navButton} ${styles.nextButton}`}
          >
            Next Lesson <FaChevronRight />
          </Link>
        ) : (
          <button
            type="button"
            className={`${styles.navButton} ${styles.nextButtonLocked}`}
            disabled
            title="Complete this lesson to unlock the next one"
          >
            Complete to unlock <FaLock />
          </button>
        )
      ) : (
        <Link
          href="/dashboard"
          className={`${styles.navButton} ${styles.dashboardButton} ${!currentIsCompleted ? styles.dashboardButtonPending : ''}`}
        >
          Return to Dashboard <FaCheckCircle />
        </Link>
      )}
    </div>
  )
}
