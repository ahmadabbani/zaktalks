'use client'

import { useState, useEffect } from 'react'
import { FaTimes } from 'react-icons/fa'
import DiscountSection from './DiscountSection'
import styles from './CheckoutModal.module.css'

/**
 * Checkout Modal for logged-in users
 * Shows discount options before proceeding to payment
 */
export default function CheckoutModal({ 
  courseId, 
  courseName,
  price,
  onClose 
}) {
  const [loading, setLoading] = useState(false)
  const [discountOptions, setDiscountOptions] = useState({
    couponCode: null,
    pointsToUse: 0
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    // Save current overflow value
    const originalOverflow = document.body.style.overflow
    // Lock scroll
    document.body.style.overflow = 'hidden'
    
    // Restore on unmount
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  const handleDiscountsCalculated = (discounts) => {
    setDiscountOptions({
      couponCode: discounts.couponCode,
      pointsToUse: discounts.pointsToUse || 0
    })
  }

  const handleProceed = async () => {
    setLoading(true)

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          couponCode: discountOptions.couponCode,
          pointsToUse: discountOptions.pointsToUse
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to initiate checkout')
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Complete Your Purchase</h2>
          <button 
            onClick={onClose} 
            disabled={loading}
            className={styles.closeButton}
            aria-label="Close modal"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Course Name */}
        <p className={styles.courseName}>
          {courseName}
        </p>

        {/* Discount Section */}
        <DiscountSection
          courseId={courseId}
          onDiscountsCalculated={handleDiscountsCalculated}
          disabled={loading}
        />

        {/* Buttons */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={styles.cancelButton}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={loading}
            className={`${styles.proceedButton} ${loading ? styles.loading : ''}`}
          >
            {loading ? 'Redirecting...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
