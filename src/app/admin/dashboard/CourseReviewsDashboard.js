'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { FaCheck, FaCheckCircle, FaClock, FaEdit, FaEyeSlash, FaSearch, FaSpinner, FaStar, FaTimes, FaTrashAlt, FaUser } from 'react-icons/fa'
import { deleteCourseReview, setCourseReviewPublication, updateCourseReview } from './course-reviews.actions'
import styles from './course-reviews.module.css'

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function learnerName(review) {
  const name = [review.learner?.first_name, review.learner?.last_name].filter(Boolean).join(' ').trim()
  return name || review.learner?.email || 'Learner'
}

function ReviewStars({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || Number(value) || 0

  return <div className={styles.ratingWrap}>
    <div className={`${styles.stars} ${onChange ? styles.starsInteractive : ''}`} role={onChange ? 'group' : 'img'} aria-label={`${Number(value).toFixed(1)} out of 5 stars`} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 5 }, (_, index) => {
        const star = index + 1
        const fill = Math.max(0, Math.min(1, shown - index)) * 100
        return <span className={styles.star} key={star}>
          <FaStar className={styles.starBase} aria-hidden="true" />
          <span className={styles.starFill} style={{ width: `${fill}%` }} aria-hidden="true"><FaStar /></span>
          {onChange && <>
            <button type="button" className={`${styles.starHit} ${styles.starHitLeft}`} aria-label={`${star - 0.5} stars`} aria-pressed={value === star - 0.5} onMouseEnter={() => setHover(star - 0.5)} onFocus={() => setHover(star - 0.5)} onBlur={() => setHover(0)} onClick={() => onChange(star - 0.5)} />
            <button type="button" className={`${styles.starHit} ${styles.starHitRight}`} aria-label={`${star} stars`} aria-pressed={value === star} onMouseEnter={() => setHover(star)} onFocus={() => setHover(star)} onBlur={() => setHover(0)} onClick={() => onChange(star)} />
          </>}
        </span>
      })}
    </div>
    <strong className={styles.ratingValue}>{shown.toFixed(1)} <span>/ 5</span></strong>
  </div>
}

function EditReviewDialog({ review, onClose, onSaved }) {
  const [rating, setRating] = useState(Number(review.rating))
  const [reviewText, setReviewText] = useState(review.review_text)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef(null)
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement
    document.body.style.overflow = 'hidden'
    textareaRef.current?.focus()
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
      if (event.key !== 'Tab') return
      const focusable = [...(dialogRef.current?.querySelectorAll('button:not([disabled]), textarea:not([disabled])') || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [busy, onClose])

  const save = async (event) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = await updateCourseReview({ reviewId: review.id, rating, reviewText })
      if (result.success) onSaved(result.review)
      else setError(result.error || 'Could not save the review.')
    } catch {
      setError('Could not save the review. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(<div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
    <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="edit-review-title">
      <div className={styles.dialogHeader}>
        <div>
          <span>COURSE REVIEW</span>
          <h2 id="edit-review-title">Edit review</h2>
          <p>{learnerName(review)} · {review.course?.title || 'Course unavailable'}</p>
        </div>
        <button type="button" className={styles.closeButton} aria-label="Close editor" onClick={onClose} disabled={busy}><FaTimes aria-hidden="true" /></button>
      </div>
      <form className={styles.dialogForm} onSubmit={save}>
        <label className={styles.fieldLabel}>Rating</label>
        <ReviewStars value={rating} onChange={setRating} />
        <label className={styles.fieldLabel} htmlFor="admin-review-text">Review</label>
        <textarea id="admin-review-text" ref={textareaRef} value={reviewText} onChange={(event) => setReviewText(event.target.value)} rows={7} maxLength={2000} disabled={busy} />
        <div className={styles.charCount}>{reviewText.length} / 2000</div>
        <p className={styles.editNote}>Saving changes keeps the current publication status.</p>
        {error && <p className={styles.formError} role="alert">{error}</p>}
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className={styles.primaryButton} disabled={busy || !reviewText.trim()}>{busy ? <><FaSpinner className={styles.spinner} aria-hidden="true" /> Saving...</> : <><FaCheck aria-hidden="true" /> Save changes</>}</button>
        </div>
      </form>
    </section>
  </div>, document.body)
}

export default function CourseReviewsDashboard({ initialReviews = [], error = '' }) {
  const [reviews, setReviews] = useState(initialReviews)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [actionError, setActionError] = useState('')

  const counts = useMemo(() => ({
    all: reviews.length,
    unpublished: reviews.filter((review) => !review.is_published).length,
    published: reviews.filter((review) => review.is_published).length,
  }), [reviews])

  const visibleReviews = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return reviews.filter((review) => {
      if (filter !== 'all' && Boolean(review.is_published) !== (filter === 'published')) return false
      if (!query) return true
      return [review.review_text, review.course?.title, learnerName(review), review.learner?.email]
        .some((value) => String(value || '').toLocaleLowerCase().includes(query))
    })
  }, [reviews, filter, search])

  const editing = reviews.find((review) => review.id === editingId)
  const replaceReview = (updated) => setReviews((current) => current.map((review) => review.id === updated.id ? { ...review, ...updated } : review))

  const togglePublished = async (review) => {
    if (busyId) return
    setBusyId(review.id)
    setActionError('')
    try {
      const result = await setCourseReviewPublication({ reviewId: review.id, published: !review.is_published })
      if (result.success) replaceReview(result.review)
      else setActionError(result.error || 'Could not update the review.')
    } catch {
      setActionError('Could not update the review. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const deleteReview = async (reviewId) => {
    if (busyId) return
    setBusyId(reviewId)
    setActionError('')
    try {
      const result = await deleteCourseReview({ reviewId })
      if (result.success) {
        setReviews((current) => current.filter((review) => review.id !== reviewId))
        setConfirmDeleteId(null)
      } else setActionError(result.error || 'Could not delete the review.')
    } catch {
      setActionError('Could not delete the review. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return <div className={styles.workspace}>
    <div className={styles.summary}>
      <div className={styles.summaryCard}><span>All reviews</span><strong>{counts.all}</strong><small>Submitted by learners</small></div>
      <div className={styles.summaryCard}><span>Awaiting approval</span><strong>{counts.unpublished}</strong><small>Not visible publicly</small></div>
      <div className={styles.summaryCard}><span>Published</span><strong>{counts.published}</strong><small>Approved reviews</small></div>
    </div>

    <div className={styles.toolbar}>
      <div className={styles.filters} role="group" aria-label="Filter course reviews">
        {[
          ['all', 'All'],
          ['unpublished', 'Awaiting approval'],
          ['published', 'Published'],
        ].map(([key, label]) => <button type="button" key={key} className={`${styles.filterButton} ${filter === key ? styles.filterActive : ''}`} aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}<span>{counts[key]}</span></button>)}
      </div>
      <label className={styles.searchBox}><FaSearch aria-hidden="true" /><span className={styles.srOnly}>Search reviews</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews, learners, courses" /></label>
    </div>

    {(error || actionError) && <p className={styles.error} role="alert">{error || actionError}</p>}

    {visibleReviews.length ? <div className={styles.reviewGrid}>
      {visibleReviews.map((review) => <article className={styles.reviewCard} key={review.id}>
        <div className={styles.cardTop}>
          <span className={`${styles.statusBadge} ${review.is_published ? styles.statusPublished : styles.statusPending}`}>
            {review.is_published ? <FaCheckCircle aria-hidden="true" /> : <FaClock aria-hidden="true" />}
            {review.is_published ? 'Published' : 'Awaiting approval'}
          </span>
          {review.is_test && <span className={styles.testBadge}>Test review</span>}
          <span className={styles.submittedDate}>Submitted {formatDate(review.created_at)}</span>
        </div>
        <div className={styles.courseLine}>
          <span>COURSE</span>
          {review.course?.slug && !review.course?.deleted_at ? <Link href={`/courses/${review.course.slug}`} target="_blank" rel="noopener noreferrer">{review.course.title}</Link> : <strong>{review.course?.title || 'Course unavailable'}</strong>}
        </div>
        <ReviewStars value={review.rating} />
        <p className={styles.reviewText}>{review.review_text}</p>
        <div className={styles.reviewerLine}>
          <span className={styles.avatar}><FaUser aria-hidden="true" /></span>
          <div><strong>{learnerName(review)}</strong><small>{review.learner?.email || 'Email unavailable'}</small></div>
        </div>
        <div className={styles.cardFooter}>
          <div className={styles.cardDates}>
            {review.updated_at && review.updated_at !== review.created_at && <span>Edited {formatDate(review.updated_at)}</span>}
            {review.is_published && review.published_at && <span>Published {formatDate(review.published_at)}</span>}
          </div>
          <div className={styles.cardActions}>
            <button type="button" className={review.is_published ? styles.unpublishButton : styles.publishButton} onClick={() => togglePublished(review)} disabled={Boolean(busyId)}>
              {busyId === review.id ? <FaSpinner className={styles.spinner} aria-hidden="true" /> : review.is_published ? <FaEyeSlash aria-hidden="true" /> : <FaCheck aria-hidden="true" />}
              {busyId === review.id ? 'Updating...' : review.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button type="button" className={styles.iconButton} onClick={() => setEditingId(review.id)} disabled={Boolean(busyId)} title="Edit review" aria-label={`Edit review by ${learnerName(review)}`}><FaEdit aria-hidden="true" /></button>
            <button type="button" className={`${styles.iconButton} ${styles.deleteButton}`} onClick={() => setConfirmDeleteId(review.id)} disabled={Boolean(busyId)} title="Delete review" aria-label={`Delete review by ${learnerName(review)}`}><FaTrashAlt aria-hidden="true" /></button>
          </div>
        </div>
        {confirmDeleteId === review.id && <div className={styles.deleteConfirm} role="group" aria-label="Confirm review deletion">
          <strong>Delete this review?</strong>
          <div>
            <button type="button" className={styles.editButton} onClick={() => setConfirmDeleteId(null)} disabled={Boolean(busyId)}>Cancel</button>
            <button type="button" className={styles.deleteConfirmButton} onClick={() => deleteReview(review.id)} disabled={Boolean(busyId)}>{busyId === review.id ? <FaSpinner className={styles.spinner} aria-hidden="true" /> : <FaTrashAlt aria-hidden="true" />}{busyId === review.id ? 'Deleting...' : 'Delete review'}</button>
          </div>
        </div>}
      </article>)}
    </div> : !error && <div className={styles.empty}><FaStar aria-hidden="true" /><h3>{reviews.length ? 'No reviews match your filters' : 'No course reviews yet'}</h3></div>}

    {editing && <EditReviewDialog key={editing.id} review={editing} onClose={() => setEditingId(null)} onSaved={(updated) => { replaceReview(updated); setEditingId(null) }} />}
  </div>
}
