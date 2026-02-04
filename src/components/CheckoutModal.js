'use client'

import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import DiscountSection from './DiscountSection'

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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 'var(--space-md)'
    }}>
      <div style={{
        backgroundColor: 'var(--color-surface)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-xl)',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 'var(--space-md)' 
        }}>
          <h2 style={{ margin: 0 }}>Complete Your Purchase</h2>
          <button 
            onClick={onClose} 
            disabled={loading}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              color: 'white',
              opacity: loading ? 0.5 : 1
            }}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Course Name */}
        <p style={{ 
          color: 'var(--color-primary)', 
          fontWeight: 'bold',
          marginBottom: 'var(--space-lg)',
          fontSize: '1.1rem'
        }}>
          {courseName}
        </p>

        {/* Discount Section */}
        <DiscountSection
          courseId={courseId}
          onDiscountsCalculated={handleDiscountsCalculated}
          disabled={loading}
        />

        {/* Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--space-md)', 
          marginTop: 'var(--space-xl)' 
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'transparent',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProceed}
            disabled={loading}
            className="btn btn-primary"
            style={{
              flex: 1,
              padding: 'var(--space-md)'
            }}
          >
            {loading ? 'Redirecting...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
