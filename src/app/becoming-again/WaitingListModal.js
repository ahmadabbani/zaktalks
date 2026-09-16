'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertCircle, FiArrowUpRight, FiCheck, FiChevronDown, FiX } from 'react-icons/fi'
import InternationalPhoneField from '@/components/InternationalPhoneField'
import TurnstileWidget from '@/components/TurnstileWidget'
import {
  COMMITMENT_OPTIONS,
  LOCATION_OPTIONS,
  PARTICIPATION_OPTIONS,
  ROLE_OPTIONS,
  SOURCE_OPTIONS,
  THEME_OPTIONS,
  WAITING_LIST_INITIAL_VALUES,
  validateWaitingList,
  validateWaitingListField,
} from '@/lib/becomingAgainWaitingList'
import styles from './WaitingListModal.module.css'

function FieldError({ message, id }) {
  return message ? <span id={id} className={styles.fieldError} role="alert"><FiAlertCircle aria-hidden="true" />{message}</span> : null
}

function CustomSelect({ id, value, options, placeholder, invalid, onChange, onBlur }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const [open, setOpen] = useState(false)
  const currentIndex = options.indexOf(value)

  const selectOption = (option) => {
    onChange(option)
    setOpen(false)
    requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }))
  }

  const openAt = (index) => {
    setOpen(true)
    requestAnimationFrame(() => optionRefs.current[index]?.focus())
  }

  return <div ref={rootRef} className={styles.selectRoot} onBlur={(event) => {
    if (rootRef.current?.contains(event.relatedTarget)) return
    setOpen(false)
    onBlur?.()
  }}>
    <button
      id={id}
      ref={triggerRef}
      type="button"
      role="combobox"
      className={`${styles.selectTrigger} ${!value ? styles.placeholder : ''}`}
      aria-haspopup="listbox"
      aria-controls={`${id}-options`}
      aria-expanded={open}
      aria-invalid={invalid}
      aria-describedby={invalid ? `${id}-error` : undefined}
      onClick={() => open ? setOpen(false) : openAt(Math.max(0, currentIndex))}
      onKeyDown={(event) => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault()
          const index = event.key === 'End' ? options.length - 1
            : event.key === 'Home' ? 0
              : event.key === 'ArrowUp' ? Math.max(0, currentIndex - 1)
                : Math.min(options.length - 1, currentIndex + 1)
          openAt(index)
        }
      }}
    >
      <span>{value || placeholder}</span><FiChevronDown aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} className={styles.selectMenu} role="listbox" aria-label={placeholder}>
      {options.map((option, index) => <button
        key={option}
        ref={(node) => { optionRefs.current[index] = node }}
        type="button"
        role="option"
        aria-selected={value === option}
        className={`${styles.selectOption} ${value === option ? styles.selected : ''}`}
        onPointerDown={(event) => {
          if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
          event.preventDefault()
          selectOption(option)
        }}
        onClick={() => selectOption(option)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
            triggerRef.current?.focus()
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            optionRefs.current[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus()
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault()
            optionRefs.current[event.key === 'Home' ? 0 : options.length - 1]?.focus()
          } else if (event.key === 'Tab') setOpen(false)
        }}
      ><span>{option}</span>{value === option && <FiCheck aria-hidden="true" />}</button>)}
    </div>}
  </div>
}

export default function WaitingListModal({ open, onClose }) {
  const id = useId().replaceAll(':', '')
  const dialogRef = useRef(null)
  const firstInputRef = useRef(null)
  const successRef = useRef(null)
  const previousFocusRef = useRef(null)
  const closeRef = useRef(null)
  const statusRef = useRef('idle')
  const [mounted, setMounted] = useState(false)
  const [values, setValues] = useState(WAITING_LIST_INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  statusRef.current = status

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (status === 'success') requestAnimationFrame(() => successRef.current?.focus({ preventScroll: true }))
  }, [status])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => firstInputRef.current?.focus())

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && statusRef.current !== 'submitting') {
        closeRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      if (event.shiftKey && document.activeElement === focusable[0]) {
        event.preventDefault()
        focusable.at(-1).focus()
      } else if (!event.shiftKey && document.activeElement === focusable.at(-1)) {
        event.preventDefault()
        focusable[0].focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  const fieldId = (name) => `${id}-${name}`
  const clearStatus = () => { setMessage(''); if (status === 'error') setStatus('idle') }
  const setField = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    clearStatus()
    if (errors[name]) setErrors((current) => ({ ...current, [name]: validateWaitingListField(name, value) }))
  }
  const validateField = (name) => {
    if (!values[name] && !errors[name] && status !== 'error') return
    setErrors((current) => ({ ...current, [name]: validateWaitingListField(name, values[name]) }))
  }
  const inputProps = (name) => ({
    id: fieldId(name), name, value: values[name],
    onChange: (event) => setField(name, event.target.value),
    onBlur: () => validateField(name),
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${fieldId(name)}-error` : undefined,
  })
  const focusFirstError = (nextErrors) => {
    const first = Object.keys(nextErrors)[0]
    if (!first) return
    requestAnimationFrame(() => {
      const element = dialogRef.current?.querySelector(`[data-field="${first}"]`)
      element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
      element?.querySelector('input:not([type="hidden"]),button,textarea')?.focus({ preventScroll: true })
    })
  }
  const close = () => {
    if (status === 'submitting') return
    onClose()
    if (status === 'success') {
      setValues(WAITING_LIST_INITIAL_VALUES)
      setErrors({})
      setStatus('idle')
      setCaptchaToken('')
      setCaptchaReset((count) => count + 1)
    }
  }
  closeRef.current = close
  const submit = async (event) => {
    event.preventDefault()
    if (status === 'submitting') return
    const validation = validateWaitingList(values)
    setErrors(validation.errors)
    if (!validation.isValid) {
      setStatus('error')
      setMessage('Please review the highlighted fields.')
      focusFirstError(validation.errors)
      return
    }
    if (!captchaToken) {
      setStatus('error')
      setMessage('Please complete the security check and try again.')
      return
    }
    setStatus('submitting')
    setMessage('')
    try {
      const response = await fetch('/api/becoming-again/waiting-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, captchaToken }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        if (result.errors && typeof result.errors === 'object') {
          setErrors(result.errors)
          focusFirstError(result.errors)
        }
        throw new Error(result.error || 'Your request could not be sent. Please try again.')
      }
      setStatus('success')
      setMessage('Your waiting-list request has been sent. We will be in touch when priority enrollment opens.')
      requestAnimationFrame(() => dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' }))
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Your request could not be sent. Please try again.')
    } finally {
      setCaptchaToken('')
      setCaptchaReset((count) => count + 1)
    }
  }

  if (!mounted || !open) return null
  return createPortal(<div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Becoming Again Program</p>
          <h2 id={`${id}-title`}>{status === 'success' ? 'Request received' : 'Join the waiting list'}</h2>
          {status !== 'success' && <p>Tell us a little about yourself and what you hope to gain from the experience.</p>}
        </div>
        <button type="button" className={styles.close} onClick={close} disabled={status === 'submitting'} aria-label="Close waiting list form"><FiX aria-hidden="true" /></button>
      </header>

      {status === 'success' ? <div ref={successRef} className={styles.success} role="status" tabIndex={-1}>
        <span className={styles.successIcon}><FiCheck aria-hidden="true" /></span>
        <h3>Thank you for your interest.</h3>
        <p>{message}</p>
        <button type="button" className={styles.submitButton} onClick={close}>Close</button>
      </div> : <form onSubmit={submit} noValidate className={styles.form}>
        <div className={styles.sectionHeading}><span>01</span><div><h3>About you</h3><p>How we can reach you.</p></div></div>
        <div className={styles.grid}>
          <div className={styles.field} data-field="fullName">
            <label htmlFor={fieldId('fullName')}>Full name <strong>*</strong></label>
            <input ref={firstInputRef} type="text" autoComplete="name" maxLength={120} placeholder="Your full name" {...inputProps('fullName')} />
            <FieldError id={`${fieldId('fullName')}-error`} message={errors.fullName} />
          </div>
          <div className={styles.field} data-field="email">
            <label htmlFor={fieldId('email')}>Email address <strong>*</strong></label>
            <input type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="you@example.com" {...inputProps('email')} />
            <FieldError id={`${fieldId('email')}-error`} message={errors.email} />
          </div>
          <div className={styles.field} data-field="phone">
            <label htmlFor={fieldId('phone')}>Mobile / WhatsApp number <strong>*</strong></label>
            <InternationalPhoneField id={fieldId('phone')} value={values.phone} onChange={(value) => setField('phone', value)} onBlur={() => validateField('phone')} error={errors.phone} describedBy={`${fieldId('phone')}-error`} variant="booking" disabled={status === 'submitting'} />
            <FieldError id={`${fieldId('phone')}-error`} message={errors.phone} />
          </div>
          <div className={styles.field} data-field="location">
            <label htmlFor={fieldId('location')}>Where are you currently based? <strong>*</strong></label>
            <CustomSelect id={fieldId('location')} value={values.location} options={LOCATION_OPTIONS} placeholder="Choose a region" invalid={Boolean(errors.location)} onChange={(value) => setField('location', value)} onBlur={() => validateField('location')} />
            <FieldError id={`${fieldId('location')}-error`} message={errors.location} />
          </div>
        </div>

        <div className={styles.sectionHeading}><span>02</span><div><h3>Your interest</h3><p>What brings you to Becoming Again.</p></div></div>
        <div className={styles.stack}>
          <fieldset className={styles.choiceField} data-field="role" aria-invalid={Boolean(errors.role)} aria-describedby={errors.role ? `${fieldId('role')}-error` : undefined}>
            <legend>What best describes you right now? <strong>*</strong></legend>
            <div className={styles.choiceGrid}>{ROLE_OPTIONS.map((option) => <label key={option} className={`${styles.choice} ${values.role === option ? styles.choiceActive : ''}`}><input type="radio" name="role" value={option} checked={values.role === option} onChange={() => setField('role', option)} /><span className={styles.choiceMark} aria-hidden="true" />{option}</label>)}</div>
            <FieldError id={`${fieldId('role')}-error`} message={errors.role} />
          </fieldset>
          <div className={styles.field} data-field="interest">
            <label htmlFor={fieldId('interest')}>What made you interested in Becoming Again Program? <strong>*</strong></label>
            <p className={styles.helper}>Tell us a little about what feels difficult, unclear, or ready to change in your life right now.</p>
            <textarea rows={4} maxLength={2000} placeholder="Share what brought you here" {...inputProps('interest')} />
            <FieldError id={`${fieldId('interest')}-error`} message={errors.interest} />
          </div>
          <div className={styles.field} data-field="goal">
            <label htmlFor={fieldId('goal')}>What would you most like to gain from this experience? <strong>*</strong></label>
            <p className={styles.helper}>There is no perfect answer. We simply want to understand what meaningful change would look like for you.</p>
            <textarea rows={4} maxLength={2000} placeholder="What would meaningful change look like?" {...inputProps('goal')} />
            <FieldError id={`${fieldId('goal')}-error`} message={errors.goal} />
          </div>
        </div>

        <div className={styles.sectionHeading}><span>03</span><div><h3>Taking part</h3><p>Your availability and preferred format.</p></div></div>
        <div className={styles.stack}>
          <fieldset className={styles.choiceField} data-field="commitment" aria-invalid={Boolean(errors.commitment)} aria-describedby={errors.commitment ? `${fieldId('commitment')}-error` : undefined}>
            <legend>Are you available to commit to live biweekly sessions over several months? <strong>*</strong></legend>
            <div className={styles.choiceGrid}>{COMMITMENT_OPTIONS.map((option) => <label key={option} className={`${styles.choice} ${values.commitment === option ? styles.choiceActive : ''}`}><input type="radio" name="commitment" value={option} checked={values.commitment === option} onChange={() => setField('commitment', option)} /><span className={styles.choiceMark} aria-hidden="true" />{option}</label>)}</div>
            <FieldError id={`${fieldId('commitment')}-error`} message={errors.commitment} />
          </fieldset>
          <fieldset className={styles.choiceField} data-field="participation" aria-invalid={Boolean(errors.participation)} aria-describedby={errors.participation ? `${fieldId('participation')}-error` : undefined}>
            <legend>How would you prefer to participate? <strong>*</strong></legend>
            <div className={styles.choiceGrid}>{PARTICIPATION_OPTIONS.map((option) => <label key={option} className={`${styles.choice} ${values.participation === option ? styles.choiceActive : ''}`}><input type="radio" name="participation" value={option} checked={values.participation === option} onChange={() => setField('participation', option)} /><span className={styles.choiceMark} aria-hidden="true" />{option}</label>)}</div>
            <FieldError id={`${fieldId('participation')}-error`} message={errors.participation} />
          </fieldset>
          <label className={styles.consent} data-field="waitingListAcknowledged"><input type="checkbox" checked={values.waitingListAcknowledged} aria-invalid={Boolean(errors.waitingListAcknowledged)} aria-describedby={errors.waitingListAcknowledged ? `${fieldId('waitingListAcknowledged')}-error` : undefined} onChange={(event) => setField('waitingListAcknowledged', event.target.checked)} /><span>I understand this is a waiting list, not confirmation of enrollment. <strong>*</strong></span></label>
          <FieldError id={`${fieldId('waitingListAcknowledged')}-error`} message={errors.waitingListAcknowledged} />
        </div>

        <div className={styles.sectionHeading}><span>04</span><div><h3>A little more context</h3><p>Share what feels relevant.</p></div></div>
        <div className={styles.stack}>
          <fieldset className={styles.choiceField} data-field="themes">
            <legend>Which themes feel most relevant to you right now? <small>Optional</small></legend>
            <div className={styles.choiceGrid}>{THEME_OPTIONS.map((option) => <label key={option} className={`${styles.choice} ${values.themes.includes(option) ? styles.choiceActive : ''}`}><input type="checkbox" checked={values.themes.includes(option)} onChange={(event) => setField('themes', event.target.checked ? [...values.themes, option] : values.themes.filter((theme) => theme !== option))} /><span className={styles.choiceMark} aria-hidden="true" />{option}</label>)}</div>
            <FieldError id={`${fieldId('themes')}-error`} message={errors.themes} />
          </fieldset>
          <div className={styles.grid}>
            <div className={styles.field} data-field="source">
              <label htmlFor={fieldId('source')}>How did you hear about Becoming Again Program? <small>Optional</small></label>
              <CustomSelect id={fieldId('source')} value={values.source} options={SOURCE_OPTIONS} placeholder="Choose one, if you like" invalid={Boolean(errors.source)} onChange={(value) => setField('source', value)} onBlur={() => validateField('source')} />
              <FieldError id={`${fieldId('source')}-error`} message={errors.source} />
            </div>
            <div className={styles.field} data-field="additionalNotes">
              <label htmlFor={fieldId('additionalNotes')}>Anything else you would like Zak to know? <small>Optional</small></label>
              <textarea rows={3} maxLength={2000} placeholder="Anything else you would like to share" {...inputProps('additionalNotes')} />
              <FieldError id={`${fieldId('additionalNotes')}-error`} message={errors.additionalNotes} />
            </div>
          </div>
          <div className={styles.consentGroup}>
            <p className={styles.consentQuestion}>Would you like to be contacted when priority enrollment opens? <strong>*</strong></p>
            <label className={styles.consent} data-field="contactConsent"><input type="checkbox" checked={values.contactConsent} aria-invalid={Boolean(errors.contactConsent)} aria-describedby={errors.contactConsent ? `${fieldId('contactConsent')}-error` : undefined} onChange={(event) => setField('contactConsent', event.target.checked)} /><span>Yes, I would like you to contact me by email and/or WhatsApp with updates about the next Becoming Again Program cohort. I can unsubscribe at any time.</span></label>
            <FieldError id={`${fieldId('contactConsent')}-error`} message={errors.contactConsent} />
          </div>
        </div>

        <div className={styles.honeypot} aria-hidden="true"><label htmlFor={fieldId('website')}>Website</label><input id={fieldId('website')} name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={(event) => setField('website', event.target.value)} /></div>
        <div className={styles.security}><TurnstileWidget onTokenChange={setCaptchaToken} resetSignal={captchaReset} /></div>
        <div className={styles.formFooter}>
          <p className={`${styles.statusMessage} ${status === 'error' ? styles.statusError : ''}`} role="status" aria-live="polite">{message}</p>
          <button type="submit" className={styles.submitButton} disabled={status === 'submitting'}><span>{status === 'submitting' ? 'Sending request…' : 'Join the waiting list'}</span>{status === 'submitting' ? <span className={styles.spinner} aria-hidden="true" /> : <FiArrowUpRight aria-hidden="true" />}</button>
        </div>
      </form>}
    </section>
  </div>, document.body)
}
