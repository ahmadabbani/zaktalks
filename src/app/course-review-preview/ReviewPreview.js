'use client'

import { useState } from 'react'
import CourseReviewModal from '@/components/CourseReviewModal'
import { CourseCompletionCard } from '@/app/courses/[slug]/player/[lessonId]/LessonStatus'
import styles from './preview.module.css'

export default function ReviewPreview() {
  const [open, setOpen] = useState(true)

  return (
    <main className={styles.page}>
      <div className={styles.playerPreview}>
        <CourseCompletionCard hasCertificate />
        {!open && (
          <button type="button" className={styles.restartButton} onClick={() => setOpen(true)}>
            Replay modal
          </button>
        )}
      </div>
      <CourseReviewModal
        key={open ? 'open' : 'closed'}
        open={open}
        onClose={() => setOpen(false)}
        courseId="00000000-0000-4000-8000-000000000000"
        courseName="Interpersonal Communication Dynamics"
        learnerName="Maya Haddad"
        hasCertificate
        preview
      />
    </main>
  )
}
