'use client'

import { useState } from 'react'
import styles from './EnrollButton.module.css'
import CheckoutModal from './CheckoutModal'

export default function EnrollButton({ courseId, courseName, price, isLoggedIn, text = "Enroll Now" }) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleEnroll = async () => {
    // For guests, redirect to guest checkout page
    if (!isLoggedIn) {
      window.location.href = `/checkout/guest?courseId=${courseId}`
      return
    }

    // For logged-in users, show the checkout modal
    setShowModal(true)
  }

  return (
    <>
      <button 
        onClick={handleEnroll} 
        disabled={loading}
        className={styles.enrollBtn}
      >
        <span className={styles.btnText}>
          {loading ? 'Processing...' : `${text} - $${(price / 100).toFixed(2)}`}
        </span>
      </button>

      {/* Checkout Modal for logged-in users */}
      {showModal && (
        <CheckoutModal
          courseId={courseId}
          courseName={courseName || 'Course'}
          price={price}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
