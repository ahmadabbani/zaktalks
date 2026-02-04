'use client'

import { useState, useEffect, useRef } from 'react'
import { FaTag, FaGift, FaCoins, FaSpinner } from 'react-icons/fa'

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
  const [pointsToUse, setPointsToUse] = useState(0) // Changed from boolean to number
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
      <div style={{ 
        padding: 'var(--space-md)', 
        textAlign: 'center',
        opacity: 0.7 
      }}>
        <FaSpinner className="spin" /> Loading pricing...
        <style jsx>{`
          .spin { animation: spin 1s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  if (!discountData) {
    return null
  }

  const { course, userPoints, discounts } = discountData

  return (
    <div style={{ 
      backgroundColor: 'rgba(255, 215, 0, 0.05)', 
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-lg)',
      marginTop: 'var(--space-md)'
    }}>
      <h3 style={{ 
        marginBottom: 'var(--space-md)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 'var(--space-sm)',
        fontSize: 'var(--font-size-md)'
      }}>
        <FaTag style={{ color: 'var(--color-primary)' }} />
        Price Breakdown
        {loading && <FaSpinner className="spin" style={{ fontSize: '0.8em', marginLeft: 'auto' }} />}
      </h3>

      {/* Price Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
        {/* Original Price */}
        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.8 }}>
          <span>Original Price</span>
          <span>{formatPrice(course.originalPrice)}</span>
        </div>

        {/* First Purchase Discount */}
        {discounts.firstPurchase.eligible && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            color: '#4ade80' 
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <FaGift /> First Purchase ({discounts.firstPurchase.discountPercent}%)
            </span>
            <span>-{formatPrice(discounts.firstPurchase.discountCents)}</span>
          </div>
        )}

        {/* Points Discount - only show if actually used */}
        {discounts.points.eligible && pointsToUse > 0 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            color: '#4ade80' 
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <FaCoins /> Points ({pointsToUse} pts = {discounts.points.discountPercent}%)
            </span>
            <span>-{formatPrice(discounts.points.discountCents)}</span>
          </div>
        )}

        {/* Coupon Discount */}
        {discounts.coupon.valid && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            color: '#4ade80' 
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <FaTag /> Coupon: {discounts.coupon.couponCode}
            </span>
            <span>-{formatPrice(discounts.coupon.discountCents)}</span>
          </div>
        )}

        {/* Divider */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)', margin: 'var(--space-sm) 0' }} />

        {/* Final Price */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontWeight: 'bold',
          fontSize: '1.2rem',
          color: 'var(--color-primary)'
        }}>
          <span>Final Price</span>
          <span>{formatPrice(discounts.finalPrice)}</span>
        </div>

        {discounts.totalDiscount > 0 && (
          <div style={{ 
            textAlign: 'right', 
            fontSize: 'var(--font-size-sm)', 
            color: '#4ade80' 
          }}>
            You save {formatPrice(discounts.totalDiscount)}!
          </div>
        )}
      </div>

      {/* Points Selector - only show if user has 1000+ points */}
      {userPoints >= 1000 && (
        <div style={{ 
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md)',
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 'var(--radius-sm)'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-sm)',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <FaCoins style={{ color: 'var(--color-primary)' }} />
              Use Points:
            </span>
            <select
              value={pointsToUse}
              onChange={(e) => setPointsToUse(parseInt(e.target.value))}
              disabled={disabled}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 215, 0, 0.3)',
                backgroundColor: 'rgba(255, 215, 0, 0.05)',
                color: 'white',
                cursor: disabled ? 'not-allowed' : 'pointer',
                minWidth: '140px'
              }}
            >
              <option value={0}>Don't use points</option>
              {/* Generate options for 1000, 2000, 3000, etc. up to user's balance */}
              {Array.from({ length: Math.floor(userPoints / 1000) }, (_, i) => (i + 1) * 1000).map(pts => (
                <option key={pts} value={pts}>
                  Use {pts.toLocaleString()} points
                </option>
              ))}
            </select>
            <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: 'var(--font-size-sm)' }}>
              Balance: {userPoints} pts
            </span>
          </div>
        </div>
      )}

      {/* Coupon Input */}
      <div style={{ marginTop: 'var(--space-lg)' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: 'var(--space-xs)',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'bold'
        }}>
          Have a coupon?
        </label>
        <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter code"
            disabled={disabled || discounts.coupon.valid}
            style={{
              flex: 1,
              padding: 'var(--space-sm)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              backgroundColor: 'rgba(255, 215, 0, 0.05)',
              color: 'white',
              textTransform: 'uppercase'
            }}
          />
          {discounts.coupon.valid ? (
            <button
              type="button"
              onClick={handleRemoveCoupon}
              disabled={disabled}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 100, 100, 0.5)',
                backgroundColor: 'rgba(255, 100, 100, 0.1)',
                color: '#ff6464',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={disabled || loading || !couponCode.trim()}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary)',
                backgroundColor: 'transparent',
                color: 'var(--color-primary)',
                cursor: couponCode.trim() ? 'pointer' : 'not-allowed',
                opacity: couponCode.trim() ? 1 : 0.5
              }}
            >
              {loading ? '...' : 'Apply'}
            </button>
          )}
        </div>
        {discounts.coupon.error && (
          <p style={{ color: '#ff6464', fontSize: 'var(--font-size-sm)', marginTop: 'var(--space-xs)' }}>
            {discounts.coupon.error}
          </p>
        )}
      </div>

      {error && (
        <p style={{ color: '#ff6464', marginTop: 'var(--space-md)' }}>{error}</p>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
