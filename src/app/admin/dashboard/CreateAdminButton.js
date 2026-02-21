'use client'

import { useState } from 'react'
import { FaUserShield, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa'
import { createAdminUser } from './admin.actions'
import styles from './admin-dashboard.module.css'

export default function CreateAdminButton() {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.target)
    const result = await createAdminUser(formData)

    if (result.success) {
      setMessage({ type: 'success', text: result.message })
      e.target.reset()
      setTimeout(() => {
        setShowForm(false)
        setMessage(null)
      }, 2000)
    } else {
      setMessage({ type: 'error', text: result.error })
    }

    setLoading(false)
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className={styles.createAdminBtn}
      >
        <FaUserShield /> Create Admin Account
      </button>
    )
  }

  return (
    <div className={styles.createAdminOverlay} onClick={() => { setShowForm(false); setMessage(null) }}>
      <div className={styles.createAdminModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.createAdminHeader}>
          <h3>Create Admin Account</h3>
          <button
            onClick={() => { setShowForm(false); setMessage(null) }}
            className={styles.closeBtn}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.createAdminForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>First Name</label>
              <input
                type="text"
                name="first_name"
                required
                placeholder="name"
                className={styles.fieldInput}
                disabled={loading}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Last Name</label>
              <input
                type="text"
                name="last_name"
                required
                placeholder="last name"
                className={styles.fieldInput}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Email</label>
            <input
              type="email"
              name="email"
              required
              placeholder="admin@example.com"
              className={styles.fieldInput}
              disabled={loading}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Password</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className={styles.fieldInput}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          {message && (
            <div className={`${styles.formMessage} ${message.type === 'success' ? styles.formSuccess : styles.formError}`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={styles.submitAdminBtn}
          >
            {loading ? 'Creating...' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  )
}
