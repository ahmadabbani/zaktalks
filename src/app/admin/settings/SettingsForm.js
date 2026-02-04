'use client'

import { useState } from 'react'
import { updateAdminSettings } from './settings.actions'
import toast from 'react-hot-toast'
import { FaSave, FaPercentage, FaCoins, FaGift, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import styles from './admin-settings.module.css'

export default function SettingsForm({ initialSettings }) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    const formData = new FormData(e.target)
    const result = await updateAdminSettings(formData)
    
    if (result.success) {
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      toast.success('Settings saved successfully!')
    } else {
      setMessage({ type: 'error', text: result.error })
      toast.error(result.error || 'Failed to save settings')
    }
    
    setLoading(false)
  }
  
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {message && (
        <div className={`${styles.message} ${message.type === 'success' ? styles.messageSuccess : styles.messageError}`}>
          {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
          {message.text}
        </div>
      )}
      
      {/* First Purchase Discount */}
      <div className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <FaGift className={styles.settingIcon} />
          <h3 className={styles.settingTitle}>First Purchase Discount</h3>
        </div>
        <p className={styles.settingDescription}>
          Percentage discount applied to first-time buyers who have never purchased a course before.
        </p>
        <div className={styles.inputGroup}>
          <input
            type="number"
            name="first_purchase_discount_percent"
            defaultValue={initialSettings.first_purchase_discount_percent || 10}
            min="0"
            max="100"
            className={styles.numberInput}
            required
          />
          <FaPercentage className={styles.percentIcon} />
        </div>
      </div>
      
      {/* Points Per Purchase (Readonly) */}
      <div className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <FaCoins className={styles.settingIcon} />
          <h3 className={styles.settingTitle}>Points Per Purchase</h3>
        </div>
        <p className={styles.settingDescription}>
          Number of points earned after each successful course purchase. (Fixed value)
        </p>
        <div className={styles.inputGroup}>
          <input
            type="number"
            value={1000}
            disabled
            className={styles.numberInput}
          />
          <span className={`${styles.label} ${styles.labelDisabled}`}>points</span>
        </div>
      </div>
      
      {/* Points Discount Value */}
      <div className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <FaPercentage className={styles.settingIcon} />
          <h3 className={styles.settingTitle}>Points Discount Value</h3>
        </div>
        <p className={styles.settingDescription}>
          Percentage discount when a user spends 1000 points on a purchase.
        </p>
        <div className={styles.inputGroup}>
          <input
            type="number"
            name="points_discount_percent"
            defaultValue={initialSettings.points_discount_percent || 10}
            min="0"
            max="100"
            className={styles.numberInput}
            required
          />
          <FaPercentage className={styles.percentIcon} />
          <span className={styles.label}>= 1000 points</span>
        </div>
      </div>
      
      {/* Save Button */}
      <button
        type="submit"
        disabled={loading}
        className={styles.saveButton}
      >
        <FaSave className={styles.saveIcon} />
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  )
}
