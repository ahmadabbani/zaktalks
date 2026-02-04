'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { IoEyeOutline, IoEyeOffOutline } from 'react-icons/io5'
import styles from './AuthForm.module.css'

function SubmitButton({ label, loadingLabel }) {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      className={styles.submitBtn}
      disabled={pending}
    >
      {pending ? (loadingLabel || 'Processing...') : label}
    </button>
  )
}

export default function AuthForm({ type, action }) {
  const [error, setError] = useState(null)
  const [validationErrors, setValidationErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const isLogin = type === 'login'

  const [formValues, setFormValues] = useState({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  confirm_password: ''
})

function handleInputChange(e) {
  const { name, value } = e.target
  
  // Update form values
  setFormValues(prev => ({
    ...prev,
    [name]: value
  }))

  // Clear validation error for this field when user starts typing
  if (validationErrors[name]) {
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }

  // Real-time validation for email
  if (name === 'email' && value.trim() !== '') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setValidationErrors(prev => ({
        ...prev,
        email: 'Please enter a valid email address'
      }))
    }
  }

  // Real-time validation for confirm password
  if (name === 'confirm_password' && value.trim() !== '') {
    if (value !== formValues.password) {
      setValidationErrors(prev => ({
        ...prev,
        confirm_password: 'Passwords do not match'
      }))
    }
  }

  // Clear confirm password error when password changes and they match
  if (name === 'password' && formValues.confirm_password) {
    if (value === formValues.confirm_password) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.confirm_password
        return newErrors
      })
    } else {
      setValidationErrors(prev => ({
        ...prev,
        confirm_password: 'Passwords do not match'
      }))
    }
  }
}

function validateForm() {
  const errors = {}
  
  // Email validation
  if (!formValues.email || formValues.email.trim() === '') {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email)) {
    errors.email = 'Please enter a valid email address'
  }

  // Password validation
  if (!formValues.password || formValues.password.trim() === '') {
    errors.password = 'Password is required'
  } else if (formValues.password.length < 6) {
    errors.password = 'Password must be at least 6 characters'
  }

  // Register-specific validation
  if (!isLogin) {
    if (!formValues.first_name || formValues.first_name.trim() === '') {
      errors.first_name = 'First name is required'
    }

    if (!formValues.last_name || formValues.last_name.trim() === '') {
      errors.last_name = 'Last name is required'
    }

    if (!formValues.confirm_password || formValues.confirm_password.trim() === '') {
      errors.confirm_password = 'Please confirm your password'
    } else if (formValues.password !== formValues.confirm_password) {
      errors.confirm_password = 'Passwords do not match'
    }
  }

  return errors
}

 async function clientAction(formData) {
  setError(null)
  setValidationErrors({})

  // Frontend validation
  const errors = validateForm()
  if (Object.keys(errors).length > 0) {
    setValidationErrors(errors)
    return
  }

  // Backend action
  const result = await action(formData)
  
  if (result?.error) {
    setError(result.error)
    toast.error(result.error)
  } else if (result?.success) {
    toast.success(result.message)
  }
}

  return (
    <div className={styles.authWrapper}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <h2 className={styles.authTitle}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className={styles.authSubtitle}>
            {isLogin 
              ? 'Sign in to continue your journey' 
              : 'Start your journey with us today'}
          </p>
        </div>
        
        <form action={clientAction} className={styles.authForm}>
          {!isLogin && (
            <div className={styles.nameGrid}>
              <div className={styles.inputGroup}>
                <label htmlFor="first_name" className={styles.label}>
                  First Name
                </label>
                <input 
                  id="first_name" 
                  name="first_name"
                  placeholder="firt name"
                  value={formValues.first_name}
                  onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.first_name ? styles.inputError : ''}`}
                />
                {validationErrors.first_name && (
                  <span className={styles.fieldError}>{validationErrors.first_name}</span>
                )}
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="last_name" className={styles.label}>
                  Last Name
                </label>
                <input 
                  id="last_name" 
                  name="last_name"
                  placeholder="last name"
                   value={formValues.last_name}
                   onChange={handleInputChange}
                  className={`${styles.input} ${validationErrors.last_name ? styles.inputError : ''}`}
                />
                {validationErrors.last_name && (
                  <span className={styles.fieldError}>{validationErrors.last_name}</span>
                )}
              </div>
            </div>
          )}

          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input 
              id="email" 
              name="email" 
              type="email"
              placeholder="email"
              value={formValues.email}
              onChange={handleInputChange}
              className={`${styles.input} ${validationErrors.email ? styles.inputError : ''}`}
            />
            {validationErrors.email && (
              <span className={styles.fieldError}>{validationErrors.email}</span>
            )}
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="password" className={styles.label}>
                Password
              </label>
              {isLogin && (
                <Link href="/reset-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
              )}
            </div>
            <div className={styles.passwordWrapper}>
              <input 
                id="password" 
                name="password" 
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formValues.password}
                onChange={handleInputChange}
                className={`${styles.input} ${styles.passwordInput} ${validationErrors.password ? styles.inputError : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </div>
            {validationErrors.password && (
              <span className={styles.fieldError}>{validationErrors.password}</span>
            )}
          </div>

          {!isLogin && (
            <div className={styles.inputGroup}>
              <label htmlFor="confirm_password" className={styles.label}>
                Confirm Password
              </label>
              <div className={styles.passwordWrapper}>
                <input 
                  id="confirm_password" 
                  name="confirm_password" 
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formValues.confirm_password}
                  onChange={handleInputChange}
                  className={`${styles.input} ${styles.passwordInput} ${validationErrors.confirm_password ? styles.inputError : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={styles.eyeButton}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
                </button>
              </div>
              {validationErrors.confirm_password && (
                <span className={styles.fieldError}>{validationErrors.confirm_password}</span>
              )}
            </div>
          )}

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          <SubmitButton 
            label={isLogin ? 'Sign In' : 'Create Account'} 
            loadingLabel={isLogin ? 'Signing in...' : 'Creating account...'} 
          />
        </form>

        <p className={styles.switchText}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link href={isLogin ? '/register' : '/login'} className={styles.switchLink}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}