'use client'

import { useState } from 'react'
import { deleteCoupon, toggleCouponActive } from './coupons.actions'
import CouponModal from './CouponModal'
import toast from 'react-hot-toast'
import { FaPlus, FaEdit, FaTrash, FaToggleOn, FaToggleOff, FaTag, FaPercent, FaDollarSign } from 'react-icons/fa'
import styles from './admin-coupons.module.css'

export default function CouponsTable({ coupons: initialCoupons, courses }) {
  const [coupons, setCoupons] = useState(initialCoupons)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, couponId: null, couponCode: '' })
  const [isDeleting, setIsDeleting] = useState(false)
  
  const handleCreate = () => {
    setEditingCoupon(null)
    setModalOpen(true)
  }
  
  const handleEdit = (coupon) => {
    setEditingCoupon(coupon)
    setModalOpen(true)
  }
  
  const openDeleteModal = (couponId, couponCode) => {
    setDeleteModal({ show: true, couponId, couponCode })
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ show: false, couponId: null, couponCode: '' })
    }
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    
    const result = await deleteCoupon(deleteModal.couponId)
    
    if (result.success) {
      setCoupons(prev => prev.filter(c => c.id !== deleteModal.couponId))
      toast.success('Coupon deleted successfully!')
      setDeleteModal({ show: false, couponId: null, couponCode: '' })
    } else {
      toast.error(result.error || 'Failed to delete coupon')
    }
    
    setIsDeleting(false)
  }
  
  const handleToggle = async (coupon) => {
    const result = await toggleCouponActive(coupon.id, !coupon.is_active)
    
    if (result.success) {
      setCoupons(prev => prev.map(c => 
        c.id === coupon.id ? { ...c, is_active: !c.is_active } : c
      ))
      toast.success(`Coupon ${!coupon.is_active ? 'activated' : 'deactivated'}`)
    } else {
      toast.error('Failed to toggle coupon status')
    }
  }
  
  const handleModalClose = () => {
    setModalOpen(false)
    setEditingCoupon(null)
    // Force refresh
    window.location.reload()
  }
  
  const formatExpiry = (coupon) => {
    if (!coupon.expires_at) return 'Never'
    const d = new Date(coupon.expires_at)
    const now = new Date()
    if (d < now) return <span className={styles.expiryExpired}>Expired</span>
    return <span className={styles.expiryText}>{d.toLocaleDateString()}</span>
  }
  
  const getDiscountDisplay = (coupon) => {
    return {
      isPercent: coupon.discount_type === 'percentage',
      value: coupon.discount_value || 0
    }
  }
  
  const getMaxUses = (coupon) => {
    return coupon.max_uses_total || null
  }
  
  const getCourseNames = (coupon) => {
    if (coupon.applies_to_all_courses) return 'All Courses'
    if (!coupon.course_ids?.length) return 'None'
    
    const names = coupon.course_ids
      .map(id => courses.find(c => c.id === id)?.title)
      .filter(Boolean)
    
    if (names.length <= 2) return names.join(', ')
    return `${names[0]}, +${names.length - 1} more`
  }
  
  return (
    <div>
      <button
        onClick={handleCreate}
        className={styles.createButton}
      >
        <FaPlus />
        Create New Coupon
      </button>
      
      {coupons.length === 0 ? (
        <div className={styles.emptyState}>
          <FaTag className={styles.emptyIcon} />
          <p className={styles.emptyText}>No coupons created yet. Create your first coupon to get started!</p>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.tableHead}>
              <tr className={styles.tableHeadRow}>
                <th className={styles.tableHeadCell}>Code</th>
                <th className={styles.tableHeadCell}>Discount</th>
                <th className={styles.tableHeadCell}>Total Usage</th>
                <th className={styles.tableHeadCell}>Per User Limit</th>
                <th className={styles.tableHeadCell}>Expires</th>
                <th className={styles.tableHeadCell}>Courses</th>
                <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Status</th>
                <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {coupons.map(coupon => (
                <tr 
                  key={coupon.id} 
                  className={`${styles.tableRow} ${!coupon.is_active ? styles.tableRowInactive : ''}`}
                >
                  <td className={styles.tableCell}>
                    <code className={styles.codeBadge}>
                      {coupon.code}
                    </code>
                  </td>
                  <td className={styles.tableCell}>
                    {(() => {
                      const disc = getDiscountDisplay(coupon)
                      return (
                        <span className={styles.discountDisplay}>
                          {disc.isPercent ? '' : <FaDollarSign className={styles.discountIcon} size={16} />}
                          {disc.value}{disc.isPercent ? '%' : ''}
                        </span>
                      )
                    })()}
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.usageDisplay}>
                      {coupon.uses_count || coupon.usage_count || 0} / {getMaxUses(coupon) || '∞'}
                      <span className={styles.usageLabel}>times used</span>
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    <div className={styles.usageDisplay}>
                      {coupon.max_uses_per_user || 1}
                      <span className={styles.usageLabel}>per user</span>
                    </div>
                  </td>
                  <td className={styles.tableCell}>
                    {formatExpiry(coupon)}
                  </td>
                  <td className={`${styles.tableCell} ${styles.courseNames}`}>
                    {getCourseNames(coupon)}
                  </td>
                  <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                    <button
                      onClick={() => handleToggle(coupon)}
                      className={`${styles.toggleButton} ${coupon.is_active ? styles.toggleActive : styles.toggleInactive}`}
                      title={coupon.is_active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {coupon.is_active ? <FaToggleOn size={34} /> : <FaToggleOff size={34} />}
                    </button>
                  </td>
                  <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                    <div className={styles.actionButtons}>
                      <button
                        onClick={() => handleEdit(coupon)}
                        className={`${styles.actionButton} ${styles.editButton}`}
                        title="Edit"
                      >
                        <FaEdit size={32} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(coupon.id, coupon.code)}
                        disabled={isDeleting}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        title="Delete"
                      >
                        <FaTrash size={28} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {modalOpen && (
        <CouponModal
          coupon={editingCoupon}
          courses={courses}
          onClose={handleModalClose}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className={styles.deleteModalOverlay} onClick={closeDeleteModal}>
          <div className={styles.deleteModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.deleteModalTitle}>Delete Coupon?</h2>
            <p className={styles.deleteModalMessage}>
              Are you sure you want to delete coupon <strong>{deleteModal.couponCode}</strong>?
            </p>
            <p className={styles.deleteModalWarning}>
              <strong>This action cannot be undone!</strong>
            </p>
            
            <div className={styles.deleteModalActions}>
              <button
                type="button"
                onClick={closeDeleteModal}
                className={styles.deleteCancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={styles.deleteConfirmButton}
                disabled={isDeleting}
                style={{ opacity: isDeleting ? 0.6 : 1, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
