'use client'

import { useState, Suspense, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FaArrowRight, FaLock } from 'react-icons/fa'
import DiscountSection from '@/components/DiscountSection'
import TurnstileWidget from '@/components/TurnstileWidget'
import PaymentMethodChoice from '@/components/PaymentMethodChoice'
import WhishGuestModal from '@/components/WhishGuestModal'
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
  const [method, setMethod] = useState('stripe')
  const [whishOpen, setWhishOpen] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [pricingReady, setPricingReady] = useState(false)
  const [pricingRefresh, setPricingRefresh] = useState(0)
  const [pricing, setPricing] = useState(null)
  const pendingDetails = useRef(null)
  const requestKey = useRef(null)
  const closeWhish = useCallback(() => setWhishOpen(false), [])

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
    setPricing(discounts)
    setDiscountOptions({
      couponCode: discounts.couponCode,
      pointsToUse: discounts.pointsToUse || 0
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pricingReady) return

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

    if (method === 'whish') {
      pendingDetails.current = payload
      setCheckoutError('')
      setWhishOpen(true)
      return
    }
    await submitCheckout(payload, '/api/checkout')
  }

  const submitCheckout = async (payload, endpoint) => {
    setLoading(true)
    setCheckoutError('')

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        if (data.refreshPricing) setPricingRefresh(value => value + 1)
        setCaptchaReset(value => value + 1)
        setCheckoutError(data.error || 'Something went wrong')
        if (endpoint.endsWith('/whish')) setWhishOpen(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      setCaptchaReset(value => value + 1)
      setCheckoutError('Unable to continue. Please try again.')
      if (endpoint.endsWith('/whish')) setWhishOpen(false)
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
            onPricingStateChange={setPricingReady}
            refreshKey={pricingRefresh}
          />

          <PaymentMethodChoice value={method} onChange={value => { setMethod(value); setCheckoutError('') }} disabled={loading} />

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
            disabled={loading || emailExists || !captchaToken || !pricingReady}
            className={styles.submitButton}
          >
            {loading ? (
              <><span className={styles.spinner} aria-hidden="true" /> Preparing payment...</>
            ) : (
              <>{method === 'whish' ? 'Continue With Whish' : 'Proceed to Payment'} <FaArrowRight aria-hidden="true" /></>
            )}
          </button>
          {checkoutError && <p role="alert" style={{ color: '#a32e2e', lineHeight: 1.6 }}>{checkoutError}</p>}
        </form>
      </section>
      {whishOpen && <WhishGuestModal courseName={courseName} pricing={pricing} loading={loading} error={checkoutError} onClose={closeWhish}
        onConfirm={phone => {
          if (!requestKey.current) requestKey.current = crypto.randomUUID()
          submitCheckout({ ...pendingDetails.current, phone, captchaToken, requestKey: requestKey.current, quotedAmountCents: pricing?.finalPrice }, '/api/checkout/whish')
        }} />}
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
