'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaArrowRight, FaAward, FaCertificate, FaCheckCircle, FaSpinner, FaStar, FaTimes } from 'react-icons/fa'
import { submitCourseReview } from '@/app/courses/review.actions'
import { submitPreviewCourseReview } from '@/app/course-review-preview/review-preview.actions'
import styles from './CourseReviewModal.module.css'

const STAR_COUNT = 5

function RatingPicker({ rating, onChange }) {
  const [hoveredRating, setHoveredRating] = useState(0)
  const displayRating = hoveredRating || rating

  return (
    <div className={styles.ratingControl}>
      <div
        className={styles.stars}
        role="group"
        aria-label="Rate this course from half a star to five stars"
        onMouseLeave={() => setHoveredRating(0)}
      >
        {Array.from({ length: STAR_COUNT }, (_, index) => {
          const starNumber = index + 1
          const fill = Math.max(0, Math.min(1, displayRating - index)) * 100

          return (
            <span className={styles.star} key={starNumber}>
              <FaStar className={styles.starOutline} aria-hidden="true" />
              <span className={styles.starFill} style={{ width: `${fill}%` }} aria-hidden="true">
                <FaStar />
              </span>
              <button
                type="button"
                className={`${styles.starChoice} ${styles.starChoiceLeft}`}
                aria-label={`Rate ${starNumber - 0.5} out of 5 stars`}
                aria-pressed={rating === starNumber - 0.5}
                onMouseEnter={() => setHoveredRating(starNumber - 0.5)}
                onFocus={() => setHoveredRating(starNumber - 0.5)}
                onBlur={() => setHoveredRating(0)}
                onClick={() => onChange(starNumber - 0.5)}
              />
              <button
                type="button"
                className={`${styles.starChoice} ${styles.starChoiceRight}`}
                aria-label={`Rate ${starNumber} out of 5 stars`}
                aria-pressed={rating === starNumber}
                onMouseEnter={() => setHoveredRating(starNumber)}
                onFocus={() => setHoveredRating(starNumber)}
                onBlur={() => setHoveredRating(0)}
                onClick={() => onChange(starNumber)}
              />
            </span>
          )
        })}
      </div>
      <span className={styles.ratingReadout} aria-live="polite">
        {displayRating ? `${displayRating.toFixed(1)} / 5` : 'Choose your rating'}
      </span>
    </div>
  )
}

export default function CourseReviewModal({
  open,
  onClose,
  courseId,
  courseName,
  learnerName,
  hasCertificate,
  previewSave = false,
}) {
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState('welcome')
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const dialogRef = useRef(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open || !mounted) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (step === 'finished') onClose?.()
        else event.preventDefault()
      }

      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), textarea:not([disabled])') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [mounted, onClose, open, step])

  useEffect(() => {
    if (open && mounted) dialogRef.current?.focus()
  }, [mounted, open, step])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    if (!rating) {
      setError('Choose a star rating to continue.')
      return
    }

    const text = reviewText.trim()
    if (!text) {
      setError('Please write a few words about your experience.')
      return
    }

    setError('')
    setIsSaving(true)
    try {
      const result = previewSave
        ? await submitPreviewCourseReview({ courseId, rating, reviewText: text })
        : await submitCourseReview({ courseId, rating, reviewText: text })

      if (!result.success) {
        setError(result.error || 'Your review could not be saved. Please try again.')
        return
      }

      setStep('finished')
    } catch (submissionError) {
      console.error('Course review submission failed:', submissionError)
      setError('Your review could not be saved. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!mounted || !open) return null

  const firstName = learnerName?.trim().split(/\s+/)[0] || 'there'
  const stepNumber = step === 'welcome' ? '01' : step === 'review' ? '02' : '03'

  return createPortal(
    <div className={styles.backdrop}>
      <section
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="course-review-modal-title"
        tabIndex={-1}
      >
        <div className={styles.topline}>
          <span>YOUR COURSE JOURNEY</span>
          <div className={styles.toplineRight}>
            <span>{stepNumber} / 03</span>
            {step === 'finished' && (
              <button type="button" className={styles.closeButton} aria-label="Close" onClick={onClose}>
                <FaTimes aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className={styles.stepContent} key={step}>
          {step === 'welcome' && (
            <>
              <div className={styles.heroPanel}>
                <span className={styles.heroIcon}><FaAward aria-hidden="true" /></span>
                <p className={styles.eyebrow}>COURSE COMPLETE</p>
                <h2 id="course-review-modal-title">Congratulations, {firstName}.</h2>
                <p>You have completed <strong>{courseName}</strong>.</p>
              </div>
              <div className={styles.body}>
                <p className={styles.lead}>Take a moment to recognise the work you put in. Every lesson you completed brought you here.</p>
                <button type="button" className={styles.primaryButton} onClick={() => setStep('review')}>
                  Continue <FaArrowRight aria-hidden="true" />
                </button>
              </div>
            </>
          )}

          {step === 'review' && (
            <>
              <div className={styles.compactHeader}>
                <p className={styles.eyebrow}>A MOMENT TO REFLECT</p>
                <h2 id="course-review-modal-title">How was {courseName} for you?</h2>
                <p>Your honest experience helps us make this course better for future learners.</p>
              </div>
              <form className={styles.reviewForm} onSubmit={handleSubmit} noValidate>
                <label className={styles.fieldLabel}>Your rating</label>
                <RatingPicker rating={rating} onChange={(value) => { setRating(value); setError('') }} />

                <label htmlFor="course-review-text" className={styles.fieldLabel}>Your review</label>
                <p className={styles.fieldHint}>What stayed with you, or what felt most useful?</p>
                <textarea
                  id="course-review-text"
                  value={reviewText}
                  onChange={(event) => { setReviewText(event.target.value); setError('') }}
                  placeholder="Share your experience in your own words..."
                  maxLength={2000}
                  rows={5}
                  disabled={isSaving}
                />
                <span className={styles.characterCount}>{reviewText.length} / 2000</span>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button type="submit" className={styles.primaryButton} disabled={isSaving}>
                  {isSaving ? <><FaSpinner className={styles.spinner} aria-hidden="true" /> Saving your review...</> : <>Share my review <FaArrowRight aria-hidden="true" /></>}
                </button>
              </form>
            </>
          )}

          {step === 'finished' && (
            <>
              <div className={styles.heroPanel}>
                <span className={styles.heroIcon}>
                  {hasCertificate ? <FaCertificate aria-hidden="true" /> : <FaCheckCircle aria-hidden="true" />}
                </span>
                <p className={styles.eyebrow}>THANK YOU FOR SHARING</p>
                <h2 id="course-review-modal-title">
                  {hasCertificate ? 'Your certificate is ready.' : 'Your course is complete.'}
                </h2>
                <p>Your review of <strong>{courseName}</strong> has been saved.</p>
              </div>
              <div className={styles.body}>
                {hasCertificate ? (
                  <p className={styles.lead}>
                    Your certificate is ready in your dashboard.
                  </p>
                ) : (
                  <p className={styles.lead}>You can return to your lessons and reflections whenever you like.</p>
                )}
                <button type="button" className={styles.primaryButton} onClick={onClose}>
                  Back to my course <FaArrowRight aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>,
    document.body,
  )
}
