'use client'

import { useState } from 'react'
import { FaBolt, FaCalendarAlt, FaEdit, FaGlobe, FaPlus, FaPowerOff, FaTrash } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { deleteCoursePromotion, toggleCoursePromotion } from './promotions.actions'
import PromotionModal from './PromotionModal'
import styles from './admin-promotions.module.css'

function formatPercent(value) {
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed.toFixed(0) : parsed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(value))
}

function promotionStatus(promotion) {
  if (!promotion.is_active) return { label: 'Disabled', tone: 'disabled' }
  const now = Date.now()
  if (new Date(promotion.starts_at).getTime() > now) return { label: 'Scheduled', tone: 'scheduled' }
  if (new Date(promotion.ends_at).getTime() <= now) return { label: 'Ended', tone: 'ended' }
  return { label: 'Live', tone: 'live' }
}

export default function CoursePromotionsPanel({ initialPromotions, courses }) {
  const [promotions, setPromotions] = useState(initialPromotions)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (promotion) => { setEditing(promotion); setModalOpen(true) }

  const toggle = async (promotion) => {
    setBusyId(promotion.id)
    try {
      const result = await toggleCoursePromotion(promotion.id, !promotion.is_active)
      if (!result.success) return toast.error(result.error || 'Unable to update promotion')
      setPromotions((current) => current.map((item) => item.id === promotion.id ? { ...item, is_active: !item.is_active } : item))
      toast.success(promotion.is_active ? 'Promotion disabled' : 'Promotion enabled')
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusyId(deleting.id)
    try {
      const result = await deleteCoursePromotion(deleting.id)
      if (!result.success) return toast.error(result.error || 'Unable to delete promotion')
      setPromotions((current) => current.filter((item) => item.id !== deleting.id))
      setDeleting(null)
      toast.success('Promotion deleted')
    } finally {
      setBusyId(null)
    }
  }

  const courseNames = (promotion) => {
    if (promotion.applies_to_all_courses) return 'All courses'
    const names = promotion.course_ids.map((id) => courses.find((course) => course.id === id)?.title).filter(Boolean)
    if (names.length <= 2) return names.join(', ') || 'No courses'
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`
  }

  return <div className={styles.panel}>
    <div className={styles.toolbar}>
      <div><strong>{promotions.length}</strong><span>promotions</span></div>
      <button type="button" className={styles.createButton} onClick={openCreate}><FaPlus />New promotion</button>
    </div>

    {promotions.length === 0 ? <div className={styles.emptyState}>
      <span><FaBolt /></span>
      <h3>No course promotions yet</h3>
      <p>Schedule your first automatic course offer.</p>
      <button type="button" className={styles.primaryButton} onClick={openCreate}><FaPlus />Create promotion</button>
    </div> : <div className={styles.promotionGrid}>
      {promotions.map((promotion) => {
        const status = promotionStatus(promotion)
        return <article className={styles.promotionCard} key={promotion.id}>
          <header>
            <span className={styles.cardIcon}><FaBolt /></span>
            <div><span className={`${styles.status} ${styles[`status${status.tone}`]}`}>{status.label}</span><h3>{promotion.name}</h3></div>
            <strong className={styles.amount}>{formatPercent(promotion.discount_percent)}% off</strong>
          </header>
          <div className={styles.cardDetails}>
            <div><FaCalendarAlt /><span><small>Starts</small><strong>{formatDate(promotion.starts_at)}</strong></span></div>
            <div><FaCalendarAlt /><span><small>Ends</small><strong>{formatDate(promotion.ends_at)}</strong></span></div>
            <div><FaGlobe /><span><small>Applies to</small><strong>{courseNames(promotion)}</strong></span></div>
          </div>
          <footer>
            <button type="button" onClick={() => toggle(promotion)} disabled={busyId === promotion.id} className={promotion.is_active ? styles.disableButton : styles.enableButton}><FaPowerOff />{promotion.is_active ? 'Disable' : 'Enable'}</button>
            <div>
              <button type="button" onClick={() => openEdit(promotion)} className={styles.iconButton} title="Edit promotion" aria-label={`Edit ${promotion.name}`}><FaEdit /></button>
              <button type="button" onClick={() => setDeleting(promotion)} className={`${styles.iconButton} ${styles.deleteButton}`} title="Delete promotion" aria-label={`Delete ${promotion.name}`}><FaTrash /></button>
            </div>
          </footer>
        </article>
      })}
    </div>}

    {modalOpen && <PromotionModal promotion={editing} courses={courses} onClose={() => setModalOpen(false)} onSaved={() => window.location.reload()} />}

    {deleting && <div className={styles.confirmLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busyId && setDeleting(null)}>
      <div className={styles.confirmModal} role="alertdialog" aria-modal="true" aria-labelledby="delete-promotion-title">
        <span><FaTrash /></span>
        <h3 id="delete-promotion-title">Delete {deleting.name}?</h3>
        <p>Existing payment records will keep their saved promotion details.</p>
        <div><button type="button" className={styles.secondaryButton} onClick={() => setDeleting(null)} disabled={Boolean(busyId)}>Cancel</button><button type="button" className={styles.dangerButton} onClick={confirmDelete} disabled={Boolean(busyId)}>{busyId ? 'Deleting' : 'Delete promotion'}</button></div>
      </div>
    </div>}
  </div>
}
