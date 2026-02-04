'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DiscountSection from '@/components/DiscountSection'

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
    <div className="container" style={{ padding: 'var(--space-xl) 0' }}>
      <div className="card" style={{ maxWidth: '550px', margin: '0 auto', padding: 'var(--space-xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-sm)' }}>Express Checkout</h2>
        {courseName && (
          <p style={{ 
            color: 'var(--color-primary)', 
            fontWeight: 'bold',
            marginBottom: 'var(--space-md)'
          }}>
            {courseName}
          </p>
        )}
        <p style={{ opacity: 0.7, marginBottom: 'var(--space-lg)', fontSize: 'var(--font-size-sm)' }}>
          Please provide your details to receive access to the course and your receipt.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label>First Name</label>
              <input type="text" name="first_name" required placeholder="John" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input type="text" name="last_name" required placeholder="Doe" />
            </div>
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            className="btn btn-primary" 
            style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)' }}
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </form>
      </div>

      <style jsx>{`
        .form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }
        label {
          font-weight: bold;
          font-size: var(--font-size-sm);
        }
        input {
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 215, 0, 0.2);
          background: rgba(255, 215, 0, 0.05);
          color: white;
        }
      `}</style>
    </div>
  )
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>Loading...</div>}>
      <GuestForm />
    </Suspense>
  )
}
