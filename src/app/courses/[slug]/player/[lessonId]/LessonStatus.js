'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaAward, FaCertificate, FaCheckCircle, FaChevronLeft, FaChevronRight, FaLock } from 'react-icons/fa'
import CourseReviewModal from '@/components/CourseReviewModal'
import DownloadCertificateBtn from '@/components/DownloadCertificateBtn'
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

export function CourseCompletionCard() {
  return (
    <div className={styles.congratsCard}>
      <div className={styles.congratsContent}>
        <h3 className={styles.congratsTitle}>
          <FaAward className={styles.congratsIcon} />
          Congratulations!
        </h3>
        <p className={styles.congratsMessage}>
          You have completed all lessons in this course.
        </p>
      </div>
    </div>
  )
}

export function CourseCertificateCard({ courseId, courseName, isComplete }) {
  if (!isComplete) {
    return (
      <section className={`${styles.certificateCard} ${styles.certificateCardLocked}`} aria-label="Certificate locked">
        <span className={styles.certificateStatusIcon}><FaLock aria-hidden="true" /></span>
        <div className={styles.certificateCardCopy}>
          <span className={styles.certificateEyebrow}>Certification</span>
          <h3>Your certificate is locked</h3>
          <p>Complete every lesson in {courseName || 'this course'} to unlock your personalized certificate.</p>
        </div>
        <span className={styles.certificateLockedStatus}><FaLock aria-hidden="true" /> Complete course to unlock</span>
      </section>
    )
  }

  return (
    <section className={`${styles.certificateCard} ${styles.certificateCardReady}`} aria-label="Certificate ready">
      <span className={styles.certificateStatusIcon}><FaAward aria-hidden="true" /></span>
      <div className={styles.certificateCardCopy}>
        <span className={styles.certificateEyebrow}>Certification</span>
        <h3>Congratulations! Your certificate is ready.</h3>
        <p>You have completed every lesson in {courseName || 'this course'} and can download your personalized certificate now.</p>
        <p className={styles.certificateDashboardHint}>You can also find this and your other certificates anytime in your Certificates dashboard.</p>
      </div>
      <div className={styles.certificateActions}>
        <DownloadCertificateBtn
          courseId={courseId}
          buttonClassName={styles.certificateButton}
          controlClassName={styles.certificateDownloadControl}
          errorClassName={styles.certificateDownloadError}
          spinnerClassName={styles.certificateSpinner}
        />
        <Link href="/dashboard?section=certificates" className={styles.certificateDashboardButton}>
          <FaCertificate aria-hidden="true" /> View all certificates
        </Link>
      </div>
    </section>
  )
}

export function CourseCompletionNotice({ lessonIds, courseId, courseName, learnerName, hasCertificate, canReview, hasReview }) {
  const { completedMap } = useCourseProgress()
  const [reviewModalOpen, setReviewModalOpen] = useState(true)
  const isComplete = lessonIds.length > 0 && lessonIds.every((lessonId) => completedMap[lessonId])

  return (
    <>
      {hasCertificate ? (
        <CourseCertificateCard courseId={courseId} courseName={courseName} isComplete={isComplete} />
      ) : isComplete ? (
        <CourseCompletionCard />
      ) : null}
      {isComplete && canReview && !hasReview && (
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
