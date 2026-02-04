'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import toast from 'react-hot-toast'
import { resetPassword } from '@/app/auth/actions'
import Link from 'next/link'
import styles from './resetPassword.module.css'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      className={styles.submitBtn}
      disabled={pending}
    >
      {pending ? 'Sending...' : 'Send Reset Link'}
    </button>
  )
}

export default function ResetPasswordPage() {
  const [message, setMessage] = useState(null)
  const [validationError, setValidationError] = useState('')
  const [email, setEmail] = useState('')
  
  function validateEmail(emailValue) {
    if (!emailValue || emailValue.trim() === '') {
      return 'Email is required'
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return 'Please enter a valid email address'
    }
    return ''
  }

  function handleEmailChange(e) {
    const value = e.target.value
    setEmail(value)
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('')
    }

    // Real-time validation
    if (value.trim() !== '') {
      const error = validateEmail(value)
      if (error && error !== 'Email is required') {
        setValidationError(error)
      }
    }
  }

  async function clientAction(formData) {
    setValidationError('')

    // Frontend validation
    const emailValue = formData.get('email')
    const error = validateEmail(emailValue)
    if (error) {
      setValidationError(error)
      return
    }

    // Backend action
    const result = await resetPassword(formData)
    if (result?.error) {
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.message)
      setMessage(result.message)
    }
  }

  return (
    <div className={styles.resetContainer}>
      <div className="container">
        <div className={styles.resetWrapper}>
          <div className={styles.resetCard}>
            <div className={styles.resetHeader}>
              <h2 className={styles.resetTitle}>Reset Password</h2>
              <p className={styles.resetSubtitle}>
                {message 
                  ? "Check your email for the reset link" 
                  : "Enter your email address and we'll send you a link to reset your password"}
              </p>
            </div>
            
            {message ? (
              <div className={styles.successContent}>
                <div className={styles.successBox}>
                  {message}
                </div>
                <Link href="/login" className={styles.backBtn}>
                  Back to Login
                </Link>
              </div>
            ) : (
              <form action={clientAction} className={styles.resetForm}>
                <div className={styles.inputGroup}>
                  <label htmlFor="email" className={styles.label}>
                    Email Address
                  </label>
                  <input 
                    id="email" 
                    name="email" 
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={handleEmailChange}
                    className={`${styles.input} ${validationError ? styles.inputError : ''}`}
                  />
                  {validationError && (
                    <span className={styles.fieldError}>{validationError}</span>
                  )}
                </div>

                <SubmitButton />
                
                <Link href="/login" className={styles.backLink}>
                  Back to Login
                </Link>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}