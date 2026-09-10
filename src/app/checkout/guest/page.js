'use client'

import { useState, Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FaArrowRight, FaLock } from 'react-icons/fa'
import DiscountSection from '@/components/DiscountSection'
import TurnstileWidget from '@/components/TurnstileWidget'
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
  const [emailExists, setEmailExists] = useState(false)
  const [courseName, setCourseName] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)

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
    if (discounts.emailExists) {
      setEmailExists(true)
      return
    }
    setEmailExists(false)
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
      pointsToUse: discountOptions.pointsToUse,
      captchaToken,
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
        setCaptchaReset(value => value + 1)
        alert(data.error || 'Something went wrong')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCaptchaReset(value => value + 1)
      alert('Failed to initiate checkout')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.guestCard} aria-labelledby="guest-checkout-title">
        <div className={styles.header}>
          <span className={styles.eyebrow}><FaLock /> Secure checkout</span>
          <h1 className={styles.title} id="guest-checkout-title">Guest Checkout</h1>
          <p className={styles.subtitle}>
            Please provide your details to receive access to the course and your receipt.
          </p>
        </div>

        <div className={styles.courseSummary}>
          <span>Selected course</span>
          <strong className={courseName ? '' : styles.courseNameLoading}>
            {courseName || 'Loading course'}
          </strong>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.detailsFields}>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="guest-first-name">First Name</label>
                <input
                  id="guest-first-name"
                  type="text"
                  name="first_name"
                  required
                  placeholder="First name"
                  autoComplete="given-name"
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="guest-last-name">Last Name</label>
                <input
                  id="guest-last-name"
                  type="text"
                  name="last_name"
                  required
                  placeholder="Last name"
                  autoComplete="family-name"
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="guest-email">Email Address</label>
              <input 
                id="guest-email"
                type="email"
                name="email"
                required
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Discount Section */}
          <DiscountSection
            courseId={courseId}
            email={email}
            onDiscountsCalculated={handleDiscountsCalculated}
            disabled={loading}
            variant="checkout"
          />

          {emailExists && (
            <div className={styles.emailExistsWarning}>
              <p>An account with this email already exists.</p>
              <p>Please <Link href="/login" className={styles.loginLink}>log in</Link> to continue your purchase.</p>
            </div>
          )}

          <div className={styles.verification}>
            <TurnstileWidget
              onTokenChange={setCaptchaToken}
              resetSignal={captchaReset}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || emailExists || !captchaToken}
            className={styles.submitButton}
          >
            {loading ? (
              <><span className={styles.spinner} aria-hidden="true" /> Preparing payment...</>
            ) : (
              <>Proceed to Payment <FaArrowRight aria-hidden="true" /></>
            )}
          </button>
        </form>
      </section>
    </main>
  )
}

function CheckoutFallback() {
  return (
    <main className={styles.page}>
      <section className={`${styles.guestCard} ${styles.fallbackCard}`} role="status" aria-label="Loading checkout">
        <span className={styles.pageLoader} aria-hidden="true" />
      </section>
    </main>
  )
}

export default function GuestCheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <GuestForm />
    </Suspense>
  )
}
