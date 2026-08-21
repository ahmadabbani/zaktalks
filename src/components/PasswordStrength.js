'use client'

import { passwordStrength, PASSWORD_MAX_LENGTH } from '@/lib/auth/password-policy'
import styles from './PasswordStrength.module.css'

export default function PasswordStrength({ password, id = 'password-guidance' }) {
  const strength = passwordStrength(password)

  return (
    <div className={styles.panel} id={id} aria-live="polite">
      <div className={styles.summary}>
        <span className={`${styles.label} ${styles[strength.tone]}`}>{strength.label}</span>
        <span className={styles.count}>{password.length}/{PASSWORD_MAX_LENGTH}</span>
      </div>
      <div className={styles.meter} aria-hidden="true">
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={level <= strength.level ? styles[`meter${strength.tone}`] : ''}
          />
        ))}
      </div>
      <ul className={styles.requirements}>
        {strength.checks.map((check) => (
          <li key={check.key} className={check.met ? styles.met : ''}>
            <span aria-hidden="true">{check.met ? '✓' : '•'}</span>
            {check.label}
          </li>
        ))}
        {strength.tooLong && (
          <li className={styles.invalid}>
            <span aria-hidden="true">!</span>
            Use no more than {PASSWORD_MAX_LENGTH} characters
          </li>
        )}
      </ul>
    </div>
  )
}
