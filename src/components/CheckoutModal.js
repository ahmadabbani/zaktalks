'use client'

import { useState, useEffect, useRef } from 'react'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { createPortal } from 'react-dom'
import { FaArrowRight, FaLock, FaTimes } from 'react-icons/fa'
import DiscountSection from './DiscountSection'
import PaymentMethodChoice from './PaymentMethodChoice'
import WhishCheckoutFields from './WhishCheckoutFields'
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
  const [method, setMethod] = useState('stripe')
  const [phone, setPhone] = useState('')
  const [pricingReady, setPricingReady] = useState(false)
  const [pricingRefresh, setPricingRefresh] = useState(0)
  const requestKey = useRef(null)
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
      pointsToUse: discounts.pointsToUse || 0,
      quotedAmountCents: discounts.finalPrice
    })
  }

  const handleProceed = async () => {
    if (method === 'whish' && !isValidPhoneNumber(phone)) {
      setCheckoutError('Enter a valid Whish phone number including country code.')
      return
    }
    if (!pricingReady) return
    if (method === 'whish' && !requestKey.current) requestKey.current = crypto.randomUUID()
    setLoading(true)
    setCheckoutError('')

    try {
      const res = await fetch(method === 'whish' ? '/api/checkout/whish' : '/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          couponCode: discountOptions.couponCode,
          pointsToUse: discountOptions.pointsToUse,
          ...(method === 'whish' ? { phone, requestKey: requestKey.current, quotedAmountCents: discountOptions.quotedAmountCents } : {})
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        if (data.refreshPricing) setPricingRefresh(value => value + 1)
        setCheckoutError(data.error || 'Unable to start payment. Please try again.')
        setLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCheckoutError('Unable to connect to checkout. Please try again.')
      setLoading(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
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
          onPricingStateChange={setPricingReady}
          refreshKey={pricingRefresh}
        />

        <PaymentMethodChoice value={method} onChange={value => { setMethod(value); setCheckoutError('') }} disabled={loading} />
        {method === 'whish' && <WhishCheckoutFields phone={phone} onChange={setPhone} disabled={loading} />}

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
            disabled={loading || !pricingReady}
            className={`${styles.proceedButton} ${loading ? styles.loading : ''}`}
          >
            {loading ? <><span className={styles.spinner} /> {method === 'whish' ? 'Saving your request...' : 'Preparing payment...'}</> : <>{method === 'whish' ? 'Send Payment Instructions' : 'Proceed to payment'} <FaArrowRight /></>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
