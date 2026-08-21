'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import toast from 'react-hot-toast'
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5'
import { updatePassword } from '@/app/auth/actions'
import PasswordStrength from '@/components/PasswordStrength'
import { PASSWORD_MAX_LENGTH, validateNewPassword } from '@/lib/auth/password-policy'
import styles from './update-password.module.css'

function SubmitButton({ disabled }) {
  const { pending } = useFormStatus()

  return (
    <button type="submit" className={styles.submit} disabled={pending || disabled}>
      {pending ? 'Updating password...' : 'Update Password'}
    </button>
  )
}

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [errors, setErrors] = useState({ password: '', confirmation: '' })

  async function clientAction(formData) {
    const passwordError = validateNewPassword(password)
    const confirmationError = !confirmation
      ? 'Please confirm your password.'
      : password !== confirmation
        ? 'Passwords do not match.'
        : ''

    setErrors({ password: passwordError || '', confirmation: confirmationError })
    if (passwordError || confirmationError) return

    const result = await updatePassword(formData)
    if (result?.error) toast.error(result.error)
  }

  const updatePasswordValue = (value) => {
    setPassword(value)
    setErrors({
      password: '',
      confirmation: confirmation && value !== confirmation ? 'Passwords do not match.' : '',
    })
  }

  const updateConfirmationValue = (value) => {
    setConfirmation(value)
    setErrors((current) => ({
      ...current,
      confirmation: value && value !== password ? 'Passwords do not match.' : '',
    }))
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <header>
          <span>Account security</span>
          <h1>Set New Password</h1>
          <p>Create a strong, unique password you do not use anywhere else.</p>
        </header>

        <form action={clientAction} className={styles.form} noValidate>
          <label className={styles.field}>
            <span>New password</span>
            <span className={styles.passwordShell}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => updatePasswordValue(event.target.value)}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="new-password-guidance"
                placeholder="Enter a strong password"
              />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </span>
            {errors.password && <small className={styles.error}>{errors.password}</small>}
          </label>

          <PasswordStrength password={password} id="new-password-guidance" />

          <label className={styles.field}>
            <span>Confirm password</span>
            <span className={styles.passwordShell}>
              <input
                name="confirm_password"
                type={showConfirmation ? 'text' : 'password'}
                value={confirmation}
                onChange={(event) => updateConfirmationValue(event.target.value)}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmation)}
                placeholder="Enter it again"
              />
              <button type="button" onClick={() => setShowConfirmation((current) => !current)} aria-label={showConfirmation ? 'Hide password' : 'Show password'}>
                {showConfirmation ? <IoEyeOffOutline /> : <IoEyeOutline />}
              </button>
            </span>
            {errors.confirmation && <small className={styles.error}>{errors.confirmation}</small>}
          </label>

          <SubmitButton disabled={!password || !confirmation} />
        </form>
      </section>
    </main>
  )
}
