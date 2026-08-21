'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaExclamationCircle,
  FaKey,
  FaLaptop,
  FaPaperPlane,
  FaSave,
  FaShieldAlt,
  FaSignOutAlt,
  FaUser,
} from 'react-icons/fa'
import { createClient } from '@/lib/supabase/client'
import { updateLearnerProfile } from './profile.actions'
import styles from './dashboard.module.css'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDate(value, withTime = false) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function emailChangeError(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()

  if (
    ['email_exists', 'user_already_exists', 'identity_already_exists'].includes(code)
    || /already (registered|exists|been)/.test(message)
  ) {
    return 'This email address cannot be used. Please choose another one.'
  }
  if (code.includes('rate_limit') || /rate limit|too many/.test(message)) {
    return 'Too many email-change requests. Please wait before trying again.'
  }
  if (code.includes('validation') || /invalid email/.test(message)) {
    return 'Enter a valid email address.'
  }
  if (/same/.test(message) && /email/.test(message)) {
    return 'Enter an email address different from your current one.'
  }

  return 'The email change could not be started. Please try again.'
}

function StatusCard({ icon: Icon, label, value, detail, tone = 'blue' }) {
  return (
    <article className={styles.profileStatusCard} data-tone={tone}>
      <span className={styles.profileStatusIcon}><Icon /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  )
}

export default function ProfileSecurityDashboard({ profile }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [firstName, setFirstName] = useState(profile.first_name || '')
  const [lastName, setLastName] = useState(profile.last_name || '')
  const [profileErrors, setProfileErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [emailErrors, setEmailErrors] = useState({})
  const [sendingEmail, setSendingEmail] = useState(false)
  const [pendingEmail, setPendingEmail] = useState(profile.pending_email || '')
  const [emailNotice, setEmailNotice] = useState('')
  const [endingSessions, setEndingSessions] = useState(false)

  const displayName = useMemo(
    () => [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'ZakTalks learner',
    [profile.first_name, profile.last_name],
  )

  useEffect(() => {
    setFirstName(profile.first_name || '')
    setLastName(profile.last_name || '')
    setPendingEmail(profile.pending_email || '')
  }, [profile.first_name, profile.last_name, profile.pending_email])

  useEffect(() => {
    if (searchParams.get('email') !== 'confirmed') return

    setEmailNotice(profile.pending_email
      ? 'One confirmation is complete. Confirm the link sent to the other email address to finish the change.'
      : 'Your email address has been updated successfully.')
  }, [profile.pending_email, searchParams])

  const submitProfile = async (event) => {
    event.preventDefault()
    const errors = {}
    const cleanFirstName = firstName.trim().replace(/\s+/g, ' ')
    const cleanLastName = lastName.trim().replace(/\s+/g, ' ')

    if (!cleanFirstName) errors.first_name = 'Enter your first name.'
    else if (cleanFirstName.length > 80) errors.first_name = 'Use 80 characters or fewer.'
    if (!cleanLastName) errors.last_name = 'Enter your last name.'
    else if (cleanLastName.length > 80) errors.last_name = 'Use 80 characters or fewer.'

    setProfileErrors(errors)
    if (Object.keys(errors).length) return

    setSavingProfile(true)
    const formData = new FormData()
    formData.set('first_name', cleanFirstName)
    formData.set('last_name', cleanLastName)

    try {
      const result = await updateLearnerProfile(formData)
      if (!result?.success) {
        toast.error(result?.error || 'Your profile could not be updated.')
        return
      }

      setFirstName(result.profile.first_name)
      setLastName(result.profile.last_name)
      toast.success(result.message)
      router.refresh()
    } catch (error) {
      console.error('Profile update request failed:', error)
      toast.error('Your profile could not be updated. Please try again.')
    } finally {
      setSavingProfile(false)
    }
  }

  const submitEmailChange = async (event) => {
    event.preventDefault()
    const normalizedEmail = newEmail.trim().toLowerCase()
    const normalizedConfirmation = confirmEmail.trim().toLowerCase()
    const currentEmail = profile.email.trim().toLowerCase()
    const errors = {}

    if (!normalizedEmail || !EMAIL_PATTERN.test(normalizedEmail) || normalizedEmail.length > 254) {
      errors.new_email = 'Enter a valid email address.'
    } else if (normalizedEmail === currentEmail) {
      errors.new_email = 'Enter an email address different from your current one.'
    }
    if (!normalizedConfirmation) {
      errors.confirm_email = 'Confirm your new email address.'
    } else if (normalizedEmail !== normalizedConfirmation) {
      errors.confirm_email = 'The email addresses do not match.'
    }

    setEmailErrors(errors)
    setEmailNotice('')
    if (Object.keys(errors).length) return

    setSendingEmail(true)

    try {
      const supabase = createClient()
      const callbackUrl = new URL('/auth/callback', window.location.origin)
      callbackUrl.searchParams.set('next', '/dashboard?section=profile&email=confirmed')

      const { data, error } = await supabase.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: callbackUrl.toString() },
      )

      if (error) {
        const safeError = emailChangeError(error)
        setEmailErrors({ new_email: safeError })
        toast.error(safeError)
        return
      }

      setPendingEmail(data.user?.new_email || normalizedEmail)
      setNewEmail('')
      setConfirmEmail('')
      setEmailNotice('Confirmation links were sent to your current and new email addresses. Open both links to complete the change.')
      toast.success('Email confirmation links sent.')
    } catch (error) {
      console.error('Email change request failed:', error)
      const safeError = 'The email change could not be started. Please try again.'
      setEmailErrors({ new_email: safeError })
      toast.error(safeError)
    } finally {
      setSendingEmail(false)
    }
  }

  const signOutOtherSessions = async () => {
    if (endingSessions) return
    setEndingSessions(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
      toast.success('Other sessions have been signed out.')
    } catch (error) {
      console.error('Unable to sign out other sessions:', error)
      toast.error('Other sessions could not be signed out. Please try again.')
    } finally {
      setEndingSessions(false)
    }
  }

  return (
    <section className={styles.profileSecurityDashboard}>
      <header className={styles.profileSecurityIntro}>
        <div>
          <span>Profile &amp; security</span>
          <h1>Your account, clearly managed</h1>
          <p>Keep your personal details current and manage the security of your ZakTalks account.</p>
        </div>
        <div className={styles.profileIdentityCard}>
          <span>{[profile.first_name, profile.last_name].filter(Boolean).map((value) => value.charAt(0)).join('').toUpperCase() || 'ZT'}</span>
          <div><small>Signed in as</small><strong>{displayName}</strong><p>{profile.email}</p></div>
        </div>
      </header>

      <div className={styles.profileStatusGrid}>
        <StatusCard
          icon={profile.email_verified ? FaCheckCircle : FaExclamationCircle}
          label="Email status"
          value={profile.email_verified ? 'Verified' : 'Verification pending'}
          detail={profile.email_verified ? 'Your account email is confirmed.' : 'Confirm your email to secure access.'}
          tone={profile.email_verified ? 'success' : 'warning'}
        />
        <StatusCard
          icon={FaKey}
          label="Password"
          value={profile.password_set ? 'Ready' : 'Setup pending'}
          detail={profile.password_set ? 'Password access is active.' : 'Complete your password setup.'}
          tone={profile.password_set ? 'success' : 'warning'}
        />
        <StatusCard icon={FaCalendarAlt} label="Member since" value={formatDate(profile.created_at)} detail="Your ZakTalks account start date." />
        <StatusCard icon={FaClock} label="Last sign-in" value={formatDate(profile.last_sign_in_at, true)} detail="Latest successful account access." />
      </div>

      <div className={styles.profileSecurityGrid}>
        <article className={`${styles.profilePanel} ${styles.profileDetailsPanel}`}>
          <header className={styles.profilePanelHeader}>
            <span><FaUser /></span>
            <div><small>Personal details</small><h2>Your profile</h2><p>These details appear across your learning account and certificates.</p></div>
          </header>

          <form className={styles.profileForm} onSubmit={submitProfile} noValidate>
            <div className={styles.profileFieldRow}>
              <label className={styles.profileField}>
                <span>First name</span>
                <input
                  type="text"
                  name="first_name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => { setFirstName(event.target.value); setProfileErrors((current) => ({ ...current, first_name: '' })) }}
                  aria-invalid={Boolean(profileErrors.first_name)}
                  aria-describedby={profileErrors.first_name ? 'profile-first-name-error' : undefined}
                  disabled={savingProfile}
                />
                {profileErrors.first_name && <small id="profile-first-name-error" className={styles.profileFieldError}>{profileErrors.first_name}</small>}
              </label>
              <label className={styles.profileField}>
                <span>Last name</span>
                <input
                  type="text"
                  name="last_name"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => { setLastName(event.target.value); setProfileErrors((current) => ({ ...current, last_name: '' })) }}
                  aria-invalid={Boolean(profileErrors.last_name)}
                  aria-describedby={profileErrors.last_name ? 'profile-last-name-error' : undefined}
                  disabled={savingProfile}
                />
                {profileErrors.last_name && <small id="profile-last-name-error" className={styles.profileFieldError}>{profileErrors.last_name}</small>}
              </label>
            </div>
            <div className={styles.profileFormFooter}>
              <span>Last updated {formatDate(profile.updated_at, true)}</span>
              <button type="submit" disabled={savingProfile}><FaSave />{savingProfile ? 'Saving...' : 'Save changes'}</button>
            </div>
          </form>
        </article>

        <article className={`${styles.profilePanel} ${styles.profileEmailPanel}`}>
          <header className={styles.profilePanelHeader}>
            <span><FaEnvelope /></span>
            <div><small>Verified email change</small><h2>Email address</h2><p>Your email changes only after the required confirmation links are opened.</p></div>
          </header>

          <div className={styles.profileCurrentEmail}>
            <span><FaCheckCircle /></span>
            <div><small>Current email</small><strong>{profile.email}</strong></div>
            <em>{profile.email_verified ? 'Verified' : 'Pending'}</em>
          </div>

          {pendingEmail && (
            <div className={styles.profilePendingEmail} role="status">
              <FaClock />
              <div><strong>Change awaiting confirmation</strong><span>{pendingEmail}</span><small>Open the links sent to both email addresses.</small></div>
            </div>
          )}

          {emailNotice && <div className={styles.profileSuccessNotice} role="status"><FaCheckCircle /><span>{emailNotice}</span></div>}

          <form className={styles.profileForm} onSubmit={submitEmailChange} noValidate>
            <label className={styles.profileField}>
              <span>New email address</span>
              <input
                type="email"
                name="new_email"
                autoComplete="email"
                placeholder="new@email.com"
                value={newEmail}
                onChange={(event) => { setNewEmail(event.target.value); setEmailErrors((current) => ({ ...current, new_email: '' })) }}
                aria-invalid={Boolean(emailErrors.new_email)}
                aria-describedby={emailErrors.new_email ? 'profile-new-email-error' : undefined}
                disabled={sendingEmail}
              />
              {emailErrors.new_email && <small id="profile-new-email-error" className={styles.profileFieldError}>{emailErrors.new_email}</small>}
            </label>
            <label className={styles.profileField}>
              <span>Confirm new email</span>
              <input
                type="email"
                name="confirm_email"
                autoComplete="off"
                placeholder="Repeat your new email"
                value={confirmEmail}
                onChange={(event) => { setConfirmEmail(event.target.value); setEmailErrors((current) => ({ ...current, confirm_email: '' })) }}
                aria-invalid={Boolean(emailErrors.confirm_email)}
                aria-describedby={emailErrors.confirm_email ? 'profile-confirm-email-error' : undefined}
                disabled={sendingEmail}
              />
              {emailErrors.confirm_email && <small id="profile-confirm-email-error" className={styles.profileFieldError}>{emailErrors.confirm_email}</small>}
            </label>
            <div className={styles.profileFormFooter}>
              <span>Both addresses must confirm the request.</span>
              <button type="submit" disabled={sendingEmail}><FaPaperPlane />{sendingEmail ? 'Sending...' : 'Send confirmation'}</button>
            </div>
          </form>
        </article>
      </div>

      <div className={styles.profileSecurityActions}>
        <article className={styles.profileActionCard}>
          <span><FaShieldAlt /></span>
          <div><small>Password security</small><h2>Change your password</h2><p>Use the tested secure-link flow to choose a new password. Your course access and learning history stay unchanged.</p></div>
          <Link href="/reset-password"><FaKey />Send reset link</Link>
        </article>

        <article className={styles.profileActionCard}>
          <span><FaLaptop /></span>
          <div><small>Account sessions</small><h2>Other signed-in devices</h2><p>End every other active session while keeping this browser signed in.</p></div>
          <button type="button" onClick={signOutOtherSessions} disabled={endingSessions}><FaSignOutAlt />{endingSessions ? 'Signing out...' : 'Sign out others'}</button>
        </article>
      </div>
    </section>
  )
}
