'use client'

import { useState } from 'react'
import { getPointsExpiryUsers, setFirstPurchaseDiscountEnabled, updateAdminSettings } from './settings.actions'
import toast from 'react-hot-toast'
import { FaSave, FaPercentage, FaGift, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import styles from './admin-settings.module.css'

export default function SettingsForm({ initialSettings }) {
  const [loading, setLoading] = useState(false)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [firstPurchaseEnabled, setFirstPurchaseEnabled] = useState(
    initialSettings.first_purchase_discount_enabled !== 'false'
  )
  const [message, setMessage] = useState(null)
  const [pointsUsers, setPointsUsers] = useState(null)
  const [pointsUsersLoading, setPointsUsersLoading] = useState(false)
  const [pointsUsersError, setPointsUsersError] = useState('')
  const loadPointsUsers = async () => {
    if(pointsUsersLoading)return
    setPointsUsersLoading(true);setPointsUsersError('')
    try {
      const result=await getPointsExpiryUsers()
      if(!result.success)throw new Error(result.error)
      setPointsUsers(result.users)
    } catch(error){setPointsUsersError(error.message||'Unable to load reset dates.')}
    finally{setPointsUsersLoading(false)}
  }
  const pointsDate = value => value ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Beirut',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)) : 'Not scheduled'

  const handleFirstPurchaseToggle = async () => {
    if (toggleLoading || loading) return
    setToggleLoading(true)
    try {
      const result = await setFirstPurchaseDiscountEnabled(!firstPurchaseEnabled)
      if (!result.success) throw new Error(result.error || 'Failed to update the first-purchase discount.')
      setFirstPurchaseEnabled(result.enabled)
      toast.success(result.enabled ? 'First-purchase discount enabled' : 'First-purchase discount disabled')
    } catch (error) {
      toast.error(error.message || 'Failed to update the first-purchase discount.')
    } finally {
      setToggleLoading(false)
    }
  }
  
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
      
      <div className={styles.settingsGrid}>
        {/* First Purchase Discount */}
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <span className={styles.settingIcon}><FaGift /></span>
            <h3 className={styles.settingTitle}>First Purchase Discount</h3>
          </div>
          <p className={styles.settingDescription}>
            Percentage discount applied to first-time buyers who have never purchased a course before.
          </p>
          <div className={styles.toggleRow}>
            <span className={styles.toggleStatus}>{firstPurchaseEnabled ? 'Enabled' : 'Disabled'}</span>
            <button
              type="button"
              role="switch"
              aria-checked={firstPurchaseEnabled}
              aria-label="First-purchase discount"
              className={`${styles.toggleSwitch} ${firstPurchaseEnabled ? styles.toggleSwitchOn : ''}`}
              onClick={handleFirstPurchaseToggle}
              disabled={toggleLoading || loading}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
          <div className={styles.inputGroup}>
            <input
              type="number"
              name="first_purchase_discount_percent"
              defaultValue={initialSettings.first_purchase_discount_percent ?? 10}
              min="0"
              max="100"
              className={styles.numberInput}
              required
            />
            <span className={styles.inputSuffix}><FaPercentage /></span>
          </div>
        </div>

        {/* Points Discount Value */}
        <div className={styles.settingCard}>
          <div className={styles.settingHeader}>
            <span className={styles.settingIcon}><FaPercentage /></span>
            <h3 className={styles.settingTitle}>Points Discount Value</h3>
          </div>
          <p className={styles.settingDescription}>
            Convert the selected points into a dollar discount at this rate. At 10%, 5,000 points give $500 off and 6,000 points give $600 off. The discount cannot exceed the remaining course price.
          </p>
          <p className={styles.settingDescription}>
            Customers earn points equal to the final price paid in whole dollars. For example, $1,200 paid earns 1,200 points.
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
            <span className={styles.inputSuffix}><FaPercentage /></span>
            <span className={styles.inputNote}>of selected points</span>
          </div>
          <p className={styles.settingDescription}>The remaining points balance expires after one year, at the next 4 AM Lebanon time. The next points-earning purchase after a reset starts a new year.</p>
          <button type="button" className={styles.saveButton} onClick={loadPointsUsers} disabled={pointsUsersLoading}>
            {pointsUsersLoading?'Loading Reset Dates…':pointsUsers===null?'View Points & Reset Dates':'Refresh Points & Reset Dates'}
          </button>
        </div>
      </div>

      {pointsUsersError && <p className={`${styles.message} ${styles.messageError}`} role="alert">{pointsUsersError}</p>}
      {pointsUsers!==null && <section className={styles.pointsExpiryPanel} aria-label="User points reset dates">
        <h3>Points & Reset Dates</h3>
        <p>Dates are shown in Lebanon time. First earned is the original reward date; current period is the year now running.</p>
        {!pointsUsers.length ? <p>No accounts currently have points.</p> : <div className={styles.pointsExpiryScroll}><table>
          <thead><tr><th>Account</th><th>Points</th><th>First Earned</th><th>Current Period Started</th><th>Next Reset</th></tr></thead>
          <tbody>{pointsUsers.map(user=><tr key={user.id}>
            <td><strong>{[user.first_name,user.last_name].filter(Boolean).join(' ')||'Account'}</strong><small>{user.email}</small></td>
            <td>{user.points.toLocaleString()}</td><td>{pointsDate(user.first_earned_at)}</td>
            <td>{pointsDate(user.cycle_started_at)}</td><td>{pointsDate(user.resets_at)}</td>
          </tr>)}</tbody>
        </table></div>}
      </section>}
      
      {/* Save Button */}
      <div className={styles.formActions}>
        <button
          type="submit"
          disabled={loading || toggleLoading}
          className={styles.saveButton}
        >
          <FaSave className={styles.saveIcon} />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
