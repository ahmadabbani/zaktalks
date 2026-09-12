'use client'

import { useState } from 'react'
import CourseReviewModal from '@/components/CourseReviewModal'
import { CourseCompletionCard } from '@/app/courses/[slug]/player/[lessonId]/LessonStatus'
import styles from './preview.module.css'

export default function ReviewPreview({ courses = [], learnerName }) {
  const [open, setOpen] = useState(false)
  const [courseId, setCourseId] = useState(courses[0]?.id || '')
  const [run, setRun] = useState(0)
  const course = courses.find((item) => item.id === courseId)

  const startPreview = () => {
    setRun((current) => current + 1)
    setOpen(true)
  }

  return (
    <main className={styles.page}>
      <div className={styles.playerPreview}>
        <div className={styles.setup}>
          <div><span>LOCAL TEST</span><h1>Course review preview</h1></div>
          <label htmlFor="review-preview-course">Course</label>
          <select id="review-preview-course" value={courseId} onChange={(event) => setCourseId(event.target.value)} disabled={open}>
            {courses.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
          <button type="button" className={styles.restartButton} onClick={startPreview} disabled={!course || open}>
            Open review modal
          </button>
        </div>
        {run > 0 && <CourseCompletionCard hasCertificate={course?.hasCertificate} />}
      </div>
      {open && <CourseReviewModal
        key={run}
        open={open}
        onClose={() => setOpen(false)}
        courseId={course.id}
        courseName={course.title}
        learnerName={learnerName}
        hasCertificate={course.hasCertificate}
        previewSave
      />}
    </main>
  )
}
