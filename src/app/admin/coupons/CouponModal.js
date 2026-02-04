'use client'

import { useState } from 'react'
import { createCoupon, updateCoupon } from './coupons.actions'
import toast from 'react-hot-toast'
import { FaTimes, FaSave, FaExclamationCircle } from 'react-icons/fa'
import styles from './coupon-modal.module.css'

export default function CouponModal({ coupon, courses, onClose }) {
  const isEditing = !!coupon
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    discount_type: coupon?.discount_type || 'percentage',
    discount_value: coupon?.discount_value || 10,
    max_uses_total: coupon?.max_uses_total || '',
    max_uses_per_user: coupon?.max_uses_per_user || 1,
    expires_at: coupon?.expires_at ? coupon.expires_at.split('T')[0] : '',
    is_active: coupon?.is_active ?? true,
    applies_to_all_courses: coupon?.applies_to_all_courses ?? false,
    course_ids: coupon?.course_ids || []
  })
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }
  
  const handleCourseToggle = (courseId) => {
    setFormData(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId]
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const form = new FormData()
    form.append('code', formData.code)
    form.append('discount_type', formData.discount_type)
    form.append('discount_value', formData.discount_value)
    form.append('max_uses_total', formData.max_uses_total)
    form.append('max_uses_per_user', formData.max_uses_per_user)
    form.append('expires_at', formData.expires_at)
    form.append('is_active', formData.is_active)
    form.append('applies_to_all_courses', formData.applies_to_all_courses)
    form.append('course_ids', JSON.stringify(formData.course_ids))
    
    const result = isEditing 
      ? await updateCoupon(coupon.id, form)
      : await createCoupon(form)
    
    if (result.success) {
      toast.success(isEditing ? 'Coupon updated successfully!' : 'Coupon created successfully!')
      onClose()
    } else {
      setError(result.error)
      toast.error(result.error || 'Failed to save coupon')
    }
    
    setLoading(false)
  }
  
  return (
    <div className={styles.modalOverlay} onClick={() => !loading && onClose()}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{isEditing ? 'Edit Coupon' : 'Create New Coupon'}</h2>
          <button onClick={onClose} className={styles.closeButton} disabled={loading}>
            <FaTimes size={18} />
          </button>
        </div>
        
        {error && (
          <div className={styles.errorMessage}>
            <FaExclamationCircle />
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* Coupon Code */}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={`${styles.formLabel} ${styles.required}`}>
                Coupon Code
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="e.g., WELCOME20"
                className={`${styles.formInput} ${styles.codeInput}`}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Discount Type and Value */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={`${styles.formLabel} ${styles.required}`}>
                Discount Type
              </label>
              <select
                name="discount_type"
                value={formData.discount_type}
                onChange={handleChange}
                className={styles.formSelect}
                disabled={loading}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label className={`${styles.formLabel} ${styles.required}`}>
                Discount Value
              </label>
              <input
                type="number"
                name="discount_value"
                value={formData.discount_value}
                onChange={handleChange}
                min="1"
                max={formData.discount_type === 'percentage' ? 100 : undefined}
                className={styles.formInput}
                required
                disabled={loading}
              />
            </div>
          </div>
          
          {/* Usage Limits */}
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Max Uses (Total)
              </label>
              <input
                type="number"
                name="max_uses_total"
                value={formData.max_uses_total}
                onChange={handleChange}
                placeholder="Unlimited"
                min="1"
                className={styles.formInput}
                disabled={loading}
              />
              <small className={styles.formHint}>Leave empty for unlimited</small>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Max Uses Per User
              </label>
              <input
                type="number"
                name="max_uses_per_user"
                value={formData.max_uses_per_user}
                onChange={handleChange}
                min="1"
                className={styles.formInput}
                disabled={loading}
              />
              <small className={styles.formHint}>How many times each user can use this coupon</small>
            </div>
          </div>
          
          {/* Expiration Date */}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Expiration Date
              </label>
              <input
                type="date"
                name="expires_at"
                value={formData.expires_at}
                onChange={handleChange}
                className={styles.formInput}
                disabled={loading}
              />
              <small className={styles.formHint}>Leave empty for no expiration</small>
            </div>
          </div>
          
          {/* Active Status */}
          <div className={styles.formSection}>
            <label className={styles.toggleWrapper}>
              <div className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className={styles.toggleInput}
                  disabled={loading}
                />
                <span className={styles.toggleSlider}></span>
              </div>
              <span className={styles.toggleLabel}>Coupon is Active</span>
            </label>
          </div>
          
          {/* Course Selection */}
          <div className={styles.formSection}>
            <label className={styles.formLabel}>
              Applicable Courses
            </label>
            
            <label className={styles.toggleWrapper}>
              <div className={styles.toggleSwitch}>
                <input
                  type="checkbox"
                  name="applies_to_all_courses"
                  checked={formData.applies_to_all_courses}
                  onChange={handleChange}
                  className={styles.toggleInput}
                  disabled={loading}
                />
                <span className={styles.toggleSlider}></span>
              </div>
              <span className={styles.toggleLabel}>Apply to ALL courses</span>
            </label>
            
            {!formData.applies_to_all_courses && (
              <div className={styles.courseSelectionWrapper}>
                {courses.map(course => (
                  <label
                    key={course.id}
                    className={`${styles.courseCheckbox} ${formData.course_ids.includes(course.id) ? styles.courseCheckboxSelected : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.course_ids.includes(course.id)}
                      onChange={() => handleCourseToggle(course.id)}
                      className={styles.courseCheckboxInput}
                      disabled={loading}
                    />
                    <span className={styles.courseCheckboxLabel}>{course.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          
          {/* Submit Button */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              <FaSave />
              {loading ? 'Saving...' : (isEditing ? 'Update Coupon' : 'Create Coupon')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
