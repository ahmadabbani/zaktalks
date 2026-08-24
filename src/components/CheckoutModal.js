'use client'

import { useState, useEffect } from 'react'
import { FaArrowRight, FaLock, FaTimes } from 'react-icons/fa'
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
  const [checkoutError, setCheckoutError] = useState('')
  const [discountOptions, setDiscountOptions] = useState({
    couponCode: null,
    pointsToUse: 0
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [loading, onClose])

  const handleDiscountsCalculated = (discounts) => {
    setDiscountOptions({
      couponCode: discounts.couponCode,
      pointsToUse: discounts.pointsToUse || 0
    })
  }

  const handleProceed = async () => {
    setLoading(true)
    setCheckoutError('')

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
        setCheckoutError(data.error || 'Unable to start payment. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCheckoutError('Unable to connect to checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !loading) onClose()
    }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        {/* Header */}
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}><FaLock /> Secure checkout</span>
            <h2 className={styles.title} id="checkout-title">Complete your purchase</h2>
          </div>
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
        <div className={styles.courseName}>
          <span>Selected course</span>
          <strong>{courseName}</strong>
          <em>${(Number(price || 0) / 100).toFixed(2)}</em>
        </div>

        {/* Discount Section */}
        <DiscountSection
          courseId={courseId}
          onDiscountsCalculated={handleDiscountsCalculated}
          disabled={loading}
          variant="checkout"
        />

        {checkoutError && <p className={styles.checkoutError} role="alert">{checkoutError}</p>}

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
            {loading ? <><span className={styles.spinner} /> Preparing payment...</> : <>Proceed to payment <FaArrowRight /></>}
          </button>
        </div>
      </div>
    </div>
  )
}
