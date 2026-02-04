'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DiscountSection from '@/components/DiscountSection'
import styles from './guest.module.css'

function GuestForm() {
  const searchParams = useSearchParams()
  const courseId = searchParams.get('courseId')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [discountOptions, setDiscountOptions] = useState({
    couponCode: null,
    pointsToUse: 0
  })
  const [courseName, setCourseName] = useState('')

  // Fetch course name on load
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch('/api/checkout/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ courseId })
        })
        const data = await res.json()
        if (data.course) {
          setCourseName(data.course.title)
        }
      } catch (err) {
        console.error('Failed to fetch course:', err)
      }
    }
    if (courseId) fetchCourse()
  }, [courseId])

  const handleDiscountsCalculated = (discounts) => {
    setDiscountOptions({
      couponCode: discounts.couponCode,
      pointsToUse: discounts.pointsToUse || 0
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.target)
    const payload = {
      courseId,
      email: formData.get('email'),
      firstName: formData.get('first_name'),
      lastName: formData.get('last_name'),
      isGuest: true,
      // Include discount options
      couponCode: discountOptions.couponCode,
      pointsToUse: discountOptions.pointsToUse
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to initiate checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.guestCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>Guest Checkout</h2>
          {courseName && (
            <p className={styles.courseName}>
              {courseName}
            </p>
          )}
          <p className={styles.subtitle}>
            Please provide your details to receive access to the course and your receipt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.formGroup}>
              <label className={styles.label}>First Name</label>
              <input 
                type="text" 
                name="first_name" 
                required 
                placeholder="John" 
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Last Name</label>
              <input 
                type="text" 
                name="last_name" 
                required 
                placeholder="Doe" 
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
            />
          </div>

          {/* Discount Section */}
          <DiscountSection
            courseId={courseId}
            email={email}
            onDiscountsCalculated={handleDiscountsCalculated}
            disabled={loading}
          />

          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitButton}
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Loading Checkout...</div>}>
      <GuestForm />
    </Suspense>
  )
}
