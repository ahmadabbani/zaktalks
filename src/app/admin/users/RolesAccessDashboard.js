'use client'

import { useMemo, useState } from 'react'
import {
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaLock,
  FaShieldAlt,
  FaTimes,
  FaUserPlus,
  FaUserShield,
} from 'react-icons/fa'
import { PERMISSION_GROUPS } from '@/lib/auth/permission-registry'
import PasswordStrength from '@/components/PasswordStrength'
import { PASSWORD_MAX_LENGTH, validateNewPassword } from '@/lib/auth/password-policy'
import { createAdminUser, createCreatorUser, updateCreatorPermission } from './roles.actions'
import styles from './admin-users.module.css'

const EMPTY_ERRORS = { first_name: '', last_name: '', email: '', password: '' }

function displayName(account) {
  return [account.first_name, account.last_name].filter(Boolean).join(' ').trim()
    || account.email?.split('@')[0]
    || 'Privileged account'
}

function initials(account) {
  return displayName(account).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A'
}

function validate(form) {
  const errors = { ...EMPTY_ERRORS }
  const firstName = String(form.get('first_name') || '').trim()
  const lastName = String(form.get('last_name') || '').trim()
  const email = String(form.get('email') || '').trim()
  const password = String(form.get('password') || '')

  if (!firstName) errors.first_name = 'Enter a first name.'
  else if (firstName.length > 80) errors.first_name = 'Use 80 characters or fewer.'
  if (!lastName) errors.last_name = 'Enter a last name.'
  else if (lastName.length > 80) errors.last_name = 'Use 80 characters or fewer.'
  if (!email) errors.email = 'Enter an email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.'
  errors.password = validateNewPassword(password) || ''

  return errors
}

function Field({ label, name, type = 'text', placeholder, error, disabled, children }) {
  return <label className={styles.rolesField}>
    <span>{label}</span>
    {children || <input
      type={type}
      name={name}
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${name}-error` : undefined}
    />}
    {error && <small id={`${name}-error`}>{error}</small>}
  </label>
}

export default function RolesAccessDashboard({ initialAccounts = [], initialPermissions = [] }) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [isOpen, setIsOpen] = useState(false)
  const [creationRole, setCreationRole] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [creationPassword, setCreationPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState(EMPTY_ERRORS)
  const [notice, setNotice] = useState(null)
  const [permissionMap, setPermissionMap] = useState(() => Object.fromEntries(initialPermissions.map((item) => [item.permission_key, Boolean(item.enabled)])))
  const [updatingPermission, setUpdatingPermission] = useState(null)
  const [permissionError, setPermissionError] = useState('')

  const adminCount = useMemo(() => accounts.filter((account) => account.role === 'admin').length, [accounts])
  const creatorCount = useMemo(() => accounts.filter((account) => account.role === 'creator').length, [accounts])
  const readyAccounts = useMemo(() => accounts.filter((account) => account.password_set).length, [accounts])

  const openCreator = (role) => {
    setCreationRole(role)
    setNotice(null)
    setErrors(EMPTY_ERRORS)
    setCreationPassword('')
    setIsOpen(true)
  }

  const close = () => {
    if (submitting) return
    setIsOpen(false)
    setCreationRole('admin')
    setShowPassword(false)
    setCreationPassword('')
    setErrors(EMPTY_ERRORS)
    setNotice(null)
  }

  const togglePermission = async (permissionKey) => {
    if (updatingPermission) return
    const previous = Boolean(permissionMap[permissionKey])
    const enabled = !previous
    setPermissionError('')
    setPermissionMap((current) => ({ ...current, [permissionKey]: enabled }))
    setUpdatingPermission(permissionKey)
    try {
      const result = await updateCreatorPermission(permissionKey, enabled)
      if (!result.success) {
        setPermissionMap((current) => ({ ...current, [permissionKey]: previous }))
        setPermissionError(result.error)
      } else {
        setPermissionMap((current) => ({
          ...current,
          ...Object.fromEntries(result.permissions.map((permission) => [permission.permission_key, permission.enabled])),
        }))
      }
    } catch (error) {
      console.error('Creator permission request failed:', error)
      setPermissionMap((current) => ({ ...current, [permissionKey]: previous }))
      setPermissionError('The permission could not be updated. Please try again.')
    } finally {
      setUpdatingPermission(null)
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const nextErrors = validate(formData)
    setErrors(nextErrors)
    setNotice(null)
    if (Object.values(nextErrors).some(Boolean)) return

    setSubmitting(true)
    try {
      const createAccount = creationRole === 'creator' ? createCreatorUser : createAdminUser
      const result = await createAccount(formData)
      if (!result.success) {
        setNotice({ type: 'error', text: result.error })
        return
      }
      setAccounts((current) => [result.account, ...current.filter((account) => account.id !== result.account.id)])
      form.reset()
      setShowPassword(false)
      setCreationPassword('')
      setNotice({ type: 'success', text: result.message })
    } catch (error) {
      console.error('Privileged account creation request failed:', error)
      setNotice({ type: 'error', text: 'The request could not be completed. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  return <div className={styles.rolesDashboard}>
    <section className={styles.rolesSummary}>
      <article><span><FaUserShield /></span><div><small>Administrators</small><strong>{adminCount}</strong><p>Accounts with full administrative access.</p></div></article>
      <article><span><FaUserPlus /></span><div><small>Creators</small><strong>{creatorCount}</strong><p>Accounts awaiting defined creator permissions.</p></div></article>
      <article><span><FaKey /></span><div><small>Password ready</small><strong>{readyAccounts}</strong><p>Privileged accounts ready for direct sign-in.</p></div></article>
      <div className={styles.rolesCreateActions}>
        <button type="button" onClick={() => openCreator('creator')}><FaUserPlus /> Create creator</button>
        <button type="button" onClick={() => openCreator('admin')}><FaUserShield /> Create administrator</button>
      </div>
    </section>

    <section className={styles.rolesAccessNotice}>
      <FaShieldAlt />
      <div><strong>Access remains explicit</strong><p>Administrators retain full access. Creator accounts can be created and signed in, but receive no administrative page or operation access until their permission boundaries are defined.</p></div>
    </section>

    <section className={styles.rolesPermissionPanel}>
      <header>
        <div><span>Creator permissions</span><h3>Choose what creators can access</h3><p>Each switch controls the visible interface and its protected server operations.</p></div>
        <i><FaLock /> Admin-only controls</i>
      </header>
      {permissionError && <div className={styles.rolesError} role="alert">{permissionError}</div>}
      <div className={styles.rolesPermissionGroups}>
        {PERMISSION_GROUPS.map((group) => <article key={group.id}>
          <div className={styles.rolesPermissionGroupHeading}><div><strong>{group.label}</strong><p>{group.description}</p></div><small>{group.permissions.filter((permission) => permissionMap[permission.key]).length}/{group.permissions.length} enabled</small></div>
          <div className={styles.rolesPermissionList}>
            {group.permissions.map((permission) => {
              const enabled = Boolean(permissionMap[permission.key])
              const updating = updatingPermission === permission.key
              return <div key={permission.key} className={enabled ? styles.rolesPermissionEnabled : ''}>
                <span><strong>{permission.label}</strong><small>{permission.description}</small></span>
                <button type="button" role="switch" aria-checked={enabled} aria-label={`${enabled ? 'Disable' : 'Enable'} ${permission.label} for creators`} disabled={Boolean(updatingPermission)} onClick={() => togglePermission(permission.key)}>
                  <i />
                  <span>{updating ? 'Saving' : enabled ? 'Allowed' : 'Blocked'}</span>
                </button>
              </div>
            })}
          </div>
        </article>)}
      </div>
    </section>

    <section className={styles.rolesDirectory}>
      <header><div><span>Current access</span><h3>Privileged accounts</h3></div><p>{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</p></header>
      <div className={styles.rolesTable}>
        <div className={styles.rolesTableHeader}><span>Account</span><span>Email</span><span>Email status</span><span>Sign-in</span><span>Role</span></div>
        {accounts.map((account) => <article key={account.id}>
          <span className={styles.rolesIdentity}><i>{initials(account)}</i><strong>{displayName(account)}</strong></span>
          <span>{account.email}</span>
          <span className={account.email_verified ? styles.rolesReady : styles.rolesPending}>{account.email_verified ? 'Confirmed' : 'Pending'}</span>
          <span className={account.password_set ? styles.rolesReady : styles.rolesPending}>{account.password_set ? 'Password ready' : 'Password pending'}</span>
          <span className={account.role === 'admin' ? styles.rolesAdminPill : styles.rolesCreatorPill}>{account.role === 'admin' ? 'Administrator' : 'Creator'}</span>
        </article>)}
      </div>
    </section>

    {isOpen && <div className={styles.rolesModalLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <section className={styles.rolesModal} role="dialog" aria-modal="true" aria-labelledby="create-account-title">
        <header><div><span>{creationRole === 'creator' ? <FaUserPlus /> : <FaUserShield />}</span><div><small>Roles & Access</small><h3 id="create-account-title">Create {creationRole === 'creator' ? 'creator' : 'administrator'}</h3></div></div><button type="button" onClick={close} disabled={submitting} aria-label="Close"><FaTimes /></button></header>
        <div className={styles.rolesModalIntro}><strong>{creationRole === 'creator' ? 'Creator account only' : 'Immediate full access'}</strong><p>The email is confirmed automatically. {creationRole === 'creator' ? 'No admin access is granted until creator permissions are configured.' : 'This account receives full administrative access.'} Set a strong temporary password and share it through a secure channel.</p></div>
        <form onSubmit={submit} noValidate>
          <div className={styles.rolesNameGrid}>
            <Field label="First name" name="first_name" placeholder="First name" error={errors.first_name} disabled={submitting} />
            <Field label="Last name" name="last_name" placeholder="Last name" error={errors.last_name} disabled={submitting} />
          </div>
          <Field label="Email address" name="email" type="email" placeholder={creationRole === 'creator' ? 'creator@example.com' : 'admin@example.com'} error={errors.email} disabled={submitting} />
          <Field label="Temporary password" name="password" error={errors.password} disabled={submitting}>
            <span className={styles.rolesPasswordShell}>
              <input type={showPassword ? 'text' : 'password'} name="password" placeholder="Create a strong password" value={creationPassword} onChange={(event) => { setCreationPassword(event.target.value); setErrors((current) => ({ ...current, password: '' })) }} maxLength={PASSWORD_MAX_LENGTH} disabled={submitting} aria-invalid={Boolean(errors.password)} aria-describedby="staff-password-guidance" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} disabled={submitting} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FaEyeSlash /> : <FaEye />}</button>
            </span>
          </Field>
          <PasswordStrength password={creationPassword} id="staff-password-guidance" />
          {notice && <div className={notice.type === 'success' ? styles.rolesSuccess : styles.rolesError} role={notice.type === 'error' ? 'alert' : 'status'}>{notice.type === 'success' && <FaCheckCircle />}<span>{notice.text}</span></div>}
          <button type="submit" className={styles.rolesSubmit} disabled={submitting}>{submitting ? 'Creating account...' : `Create ${creationRole === 'creator' ? 'creator' : 'administrator'}`}</button>
        </form>
      </section>
    </div>}
  </div>
}
