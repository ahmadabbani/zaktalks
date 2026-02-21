'use client'

import { useState, useEffect, useRef } from 'react'
import { FaTag, FaGift, FaCoins, FaSpinner } from 'react-icons/fa'
import styles from './DiscountSection.module.css'

/**
 * Discount Section Component
 * Shows discount options and price breakdown before checkout
 */
export default function DiscountSection({ 
  courseId, 
  email = null, 
  onDiscountsCalculated,
  disabled = false 
}) {
  const [couponCode, setCouponCode] = useState('')
  const [pointsToUse, setPointsToUse] = useState(0)
  const [loading, setLoading] = useState(true)
  const [discountData, setDiscountData] = useState(null)
  const [error, setError] = useState(null)
  const lastEmailRef = useRef(null)

  // Check if email looks valid
  const isValidEmail = (e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  // Fetch discounts - called on mount and when dependencies change
  const fetchDiscounts = async (emailToUse) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/checkout/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          email: emailToUse || null,
          couponCode: couponCode || null,
          pointsToUse: pointsToUse || 0
        })
      })

      const data = await res.json()
      
      // Check if email already exists (guest trying to use a registered email)
      if (data.emailExists) {
        setDiscountData(null)
        setError(null)
        if (onDiscountsCalculated) {
          onDiscountsCalculated({ emailExists: true })
        }
        setLoading(false)
        return
      }

      if (res.ok) {
        setDiscountData(data)
        if (onDiscountsCalculated) {
          onDiscountsCalculated({
            couponCode: data.discounts.coupon.valid ? data.discounts.coupon.couponCode : null,
            pointsToUse: pointsToUse,
            ...data.discounts
          })
        }
      } else {
        setError(data.error || 'Failed to calculate discounts')
      }
    } catch (err) {
      setError('Failed to fetch discount preview')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchDiscounts(email)
    lastEmailRef.current = email
  }, [courseId])

  // Refetch when email changes (debounced)
  useEffect(() => {
    // Skip if email hasn't changed
    if (email === lastEmailRef.current) return
    
    // If email is empty string, don't refetch
    if (email === '') return
    
    // Only fetch if email looks valid OR is null (logged-in user)
    if (email !== null && !isValidEmail(email)) return
    
    const timer = setTimeout(() => {
      fetchDiscounts(email)
      lastEmailRef.current = email
    }, 500)
    
    return () => clearTimeout(timer)
  }, [email])

  // Refetch when pointsToUse changes
  useEffect(() => {
    if (discountData) {
      fetchDiscounts(lastEmailRef.current)
    }
  }, [pointsToUse])

  const handleApplyCoupon = () => {
    if (couponCode.trim()) {
      fetchDiscounts(lastEmailRef.current)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode('')
    setTimeout(() => fetchDiscounts(lastEmailRef.current), 0)
  }

  const formatPrice = (cents) => `$${(cents / 100).toFixed(2)}`

  if (loading && !discountData) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spin} /> Loading pricing...
      </div>
    )
  }

  if (!discountData) {
    return null
  }

  const { course, userPoints, discounts } = discountData

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>
        <FaTag className={styles.icon} />
        Price Breakdown
        {loading && <FaSpinner className={styles.spin} style={{ fontSize: '0.8em', marginLeft: 'auto' }} />}
      </h3>

      {/* Price Breakdown */}
      <div className={styles.breakdown}>
        {/* Original Price */}
        <div className={`${styles.row} ${styles.rowStandard}`}>
          <span>Original Price</span>
          <span>{formatPrice(course.originalPrice)}</span>
        </div>

        {/* First Purchase Discount */}
        {discounts.firstPurchase.eligible && (
          <div className={`${styles.row} ${styles.rowDiscount}`}>
            <span className={styles.discountLabel}>
              <FaGift /> First Purchase ({discounts.firstPurchase.discountPercent}%)
            </span>
            <span>-{formatPrice(discounts.firstPurchase.discountCents)}</span>
          </div>
        )}

        {/* Points Discount - only show if actually used */}
        {discounts.points.eligible && pointsToUse > 0 && (
          <div className={`${styles.row} ${styles.rowDiscount}`}>
            <span className={styles.discountLabel}>
              <FaCoins /> Points ({pointsToUse} pts = {discounts.points.discountPercent}%)
            </span>
            <span>-{formatPrice(discounts.points.discountCents)}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {discounts.coupon.valid && (
          <div className={`${styles.row} ${styles.rowDiscount}`}>
            <span className={styles.discountLabel}>
              <FaTag /> Coupon: {discounts.coupon.couponCode}
            </span>
            <span>-{formatPrice(discounts.coupon.discountCents)}</span>
          </div>
        )}

        {/* Divider */}
        <hr className={styles.divider} />

        {/* Final Price */}
        <div className={`${styles.row} ${styles.finalRow}`}>
          <span>Final Price</span>
          <span>{formatPrice(discounts.finalPrice)}</span>
        </div>

        {discounts.totalDiscount > 0 && (
          <div className={styles.savingsText}>
            You save {formatPrice(discounts.totalDiscount)}!
          </div>
        )}
      </div>

      {/* Points Selector - only show if user has 1000+ points */}
      {userPoints >= 1000 && (
        <div className={styles.pointsSection}>
          <div className={styles.pointsHeader}>
            <span className={styles.discountLabel}>
              <FaCoins className={styles.icon} />
              Use Your Points
            </span>
            <p className={styles.pointsHint}>
              You can use your points to get a discount on this course!
            </p>
          </div>
          <div className={styles.pointsWrapper}>
            <select
              value={pointsToUse}
              onChange={(e) => setPointsToUse(parseInt(e.target.value))}
              disabled={disabled}
              className={styles.pointsSelect}
            >
              <option value={0}>Don't use points</option>
              {/* Generate options for 1000, 2000, 3000, etc. up to user's balance */}
              {Array.from({ length: Math.floor(userPoints / 1000) }, (_, i) => (i + 1) * 1000).map(pts => (
                <option key={pts} value={pts}>
                  Use {pts.toLocaleString()} points
                </option>
              ))}
            </select>
            <span className={styles.pointsBalance}>
              Balance: {userPoints.toLocaleString()} pts
            </span>
          </div>
        </div>
      )}

      {/* Coupon Input */}
      <div className={styles.couponSection}>
        <label className={styles.couponLabel}>
          Have a coupon?
        </label>
        <div className={styles.couponInputWrapper}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            disabled={disabled || discounts.coupon.valid}
            className={styles.couponInput}
          />
          {discounts.coupon.valid ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              disabled={disabled}
              className={styles.removeButton}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={disabled || loading || !couponCode.trim()}
              className={styles.applyButton}
            >
              {loading ? '...' : 'Apply'}
            </button>
          )}
        </div>
        {discounts.coupon.error && (
          <p className={styles.errorText}>
            {discounts.coupon.error}
          </p>
        )}
      </div>
    </div>
  )
}
