'use client'

import { useMemo, useState } from 'react'
import { FaBolt, FaCheck, FaGlobe, FaSave, FaTimes } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { saveCoursePromotion } from './promotions.actions'
import PromotionDateTimePicker from './PromotionDateTimePicker'
import styles from './admin-promotions.module.css'

function localDateTimeValue(date) {
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function initialDate(hoursFromNow = 0) {
  const date = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)
  date.setSeconds(0, 0)
  return localDateTimeValue(date)
}

function storedDateToLocal(value, fallbackHours) {
  if (!value) return initialDate(fallbackHours)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? initialDate(fallbackHours) : localDateTimeValue(date)
}

export default function PromotionModal({ promotion, courses, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: promotion?.name || '',
    discountPercent: promotion ? String(Number(promotion.discount_percent)) : '',
    startsAt: storedDateToLocal(promotion?.starts_at, 0),
    endsAt: storedDateToLocal(promotion?.ends_at, 24 * 7),
    isActive: promotion?.is_active ?? true,
    appliesToAllCourses: promotion?.applies_to_all_courses ?? true,
    courseIds: promotion?.course_ids || [],
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCount = form.appliesToAllCourses ? courses.length : form.courseIds.length
  const selectedTitles = useMemo(() => new Set(form.courseIds), [form.courseIds])

  const toggleCourse = (courseId) => {
    setForm((current) => ({
      ...current,
      courseIds: current.courseIds.includes(courseId)
        ? current.courseIds.filter((id) => id !== courseId)
        : [...current.courseIds, courseId],
    }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Enter a promotion name.')
    if (!/^\d+(?:\.\d{1,2})?$/.test(form.discountPercent)
      || Number(form.discountPercent) <= 0
      || Number(form.discountPercent) > 100) {
      return setError('Enter a percentage greater than zero and no more than 100.')
    }
    if (!form.startsAt || !form.endsAt || new Date(form.endsAt) <= new Date(form.startsAt)) {
      return setError('The end date must be after the start date.')
    }
    if (!form.appliesToAllCourses && form.courseIds.length === 0) {
      return setError('Choose at least one course.')
    }

    setSaving(true)
    const payload = new FormData()
    payload.set('promotion_id', promotion?.id || '')
    payload.set('name', form.name.trim())
    payload.set('discount_percent', form.discountPercent)
    payload.set('starts_at', new Date(form.startsAt).toISOString())
    payload.set('ends_at', new Date(form.endsAt).toISOString())
    payload.set('is_active', String(form.isActive))
    payload.set('applies_to_all_courses', String(form.appliesToAllCourses))
    payload.set('course_ids', JSON.stringify(form.courseIds))

    try {
      const result = await saveCoursePromotion(payload)
      if (!result.success) {
        setError(result.error || 'The promotion could not be saved.')
        return
      }
      toast.success(promotion ? 'Promotion updated' : 'Promotion created')
      onSaved()
    } catch (submissionError) {
      console.error(submissionError)
      setError('The promotion could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.modalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="promotion-modal-title">
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}><FaBolt aria-hidden="true" /></span>
          <div>
            <span>{promotion ? 'Edit promotion' : 'New promotion'}</span>
            <h3 id="promotion-modal-title">{promotion ? promotion.name : 'Schedule a course promotion'}</h3>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} disabled={saving} aria-label="Close"><FaTimes /></button>
        </header>

        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Promotion name</span>
              <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} maxLength={120} placeholder="September course offer" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Discount percentage</span>
              <span className={styles.percentageInput}><input inputMode="decimal" value={form.discountPercent} onChange={(event) => setForm((current) => ({ ...current, discountPercent: event.target.value }))} placeholder="20" /><b>%</b></span>
            </label>
          </div>

          <div className={styles.dateGrid}>
            <PromotionDateTimePicker label="Starts" value={form.startsAt} onChange={(startsAt) => setForm((current) => ({ ...current, startsAt }))} />
            <PromotionDateTimePicker label="Ends" value={form.endsAt} onChange={(endsAt) => setForm((current) => ({ ...current, endsAt }))} />
          </div>

          <fieldset className={styles.scopeFieldset}>
            <legend>Applies to</legend>
            <div className={styles.scopeOptions}>
              <button type="button" className={form.appliesToAllCourses ? styles.scopeOptionActive : styles.scopeOption} onClick={() => setForm((current) => ({ ...current, appliesToAllCourses: true }))}>
                <FaGlobe /><span><strong>All courses</strong><small>{courses.length} available</small></span>{form.appliesToAllCourses && <FaCheck className={styles.scopeCheck} />}
              </button>
              <button type="button" className={!form.appliesToAllCourses ? styles.scopeOptionActive : styles.scopeOption} onClick={() => setForm((current) => ({ ...current, appliesToAllCourses: false }))}>
                <FaBolt /><span><strong>Selected courses</strong><small>{form.courseIds.length} selected</small></span>{!form.appliesToAllCourses && <FaCheck className={styles.scopeCheck} />}
              </button>
            </div>

            {!form.appliesToAllCourses && <div className={styles.coursePicker}>
              {courses.map((course) => <label key={course.id} className={selectedTitles.has(course.id) ? styles.courseChoiceSelected : styles.courseChoice}>
                <input type="checkbox" checked={selectedTitles.has(course.id)} onChange={() => toggleCourse(course.id)} />
                <span className={styles.courseCheck}><FaCheck /></span>
                <strong>{course.title}</strong>
              </label>)}
            </div>}
          </fieldset>

          <label className={styles.activeSwitch}>
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span className={styles.switchTrack}><i /></span>
            <span><strong>Promotion enabled</strong><small>{form.isActive ? `Scheduled for ${selectedCount} course${selectedCount === 1 ? '' : 's'}` : 'Saved without applying to checkout'}</small></span>
          </label>

          {error && <p className={styles.formError} role="alert">{error}</p>}

          <footer className={styles.modalActions}>
            <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className={styles.primaryButton} disabled={saving}><FaSave />{saving ? 'Saving' : promotion ? 'Update promotion' : 'Create promotion'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
