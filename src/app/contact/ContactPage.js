'use client'

import { useEffect, useRef, useState } from 'react'
import { FiAlertCircle, FiArrowUpRight, FiCheck, FiChevronDown } from 'react-icons/fi'
import EventsNewsletterSection from '@/app/events/EventsNewsletterSection'
import {
  CONTACT_INITIAL_VALUES,
  CONTACT_SOURCE_OPTIONS,
  validateContactField,
  validateContactForm,
} from '@/lib/contactForm'
import styles from './contact.module.css'

const fieldIds = {
  firstName: 'contact-first-name',
  lastName: 'contact-last-name',
  email: 'contact-email',
  phone: 'contact-phone',
  source: 'contact-source',
  message: 'contact-message',
}

function FieldError({ id, error }) {
  if (!error) return null

  return (
    <span id={id} className={styles.fieldError} role="alert">
      <FiAlertCircle aria-hidden="true" />
      {error}
    </span>
  )
}
function SourceSelect({ value, error, onChange, onValidate }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const [open, setOpen] = useState(false)
  const selectedIndex = CONTACT_SOURCE_OPTIONS.indexOf(value)

  const openMenu = (index = selectedIndex >= 0 ? selectedIndex : 0) => {
    setOpen(true)
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus())
  }

  const choose = (option) => {
    onChange('source', option)
    setOpen(false)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleTriggerKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()

    let index = 0
    if (event.key === 'End') index = CONTACT_SOURCE_OPTIONS.length - 1
    if (event.key === 'ArrowUp') {
      index = selectedIndex >= 0
        ? Math.max(0, selectedIndex - 1)
        : CONTACT_SOURCE_OPTIONS.length - 1
    }
    if (event.key === 'ArrowDown') {
      index = selectedIndex >= 0
        ? Math.min(CONTACT_SOURCE_OPTIONS.length - 1, selectedIndex + 1)
        : 0
    }
    openMenu(index)
  }

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      const next = (index + direction + CONTACT_SOURCE_OPTIONS.length) % CONTACT_SOURCE_OPTIONS.length
      optionRefs.current[next]?.focus()
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      optionRefs.current[event.key === 'Home' ? 0 : CONTACT_SOURCE_OPTIONS.length - 1]?.focus()
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.customSelect} ${open ? styles.customSelectOpen : ''}`}
      onBlur={(event) => {
        if (rootRef.current?.contains(event.relatedTarget)) return
        setOpen(false)
        onValidate('source', value)
      }}
    >
      <button
        ref={triggerRef}
        id={fieldIds.source}
        type="button"
        className={`${styles.selectTrigger} ${!value ? styles.selectPlaceholder : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${fieldIds.source}-options`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldIds.source}-error` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{value || 'Choose one'}</span>
        <FiChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div id={`${fieldIds.source}-options`} className={styles.selectMenu} role="listbox" aria-label="How did you hear about us?">
          {CONTACT_SOURCE_OPTIONS.map((option, index) => (
            <button
              key={option}
              ref={(element) => { optionRefs.current[index] = element }}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`${styles.selectOption} ${value === option ? styles.selectOptionSelected : ''}`}
              onClick={() => choose(option)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
            >
              <span>{option}</span>
              {value === option && <FiCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ContactPage() {
  const sectionRef = useRef(null)
  const formRef = useRef(null)
  const successRef = useRef(null)
  const [revealed, setRevealed] = useState(false)
  const [values, setValues] = useState(CONTACT_INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setRevealed(true)
        observer.disconnect()
      },
      { threshold: 0.14 }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (status === 'success') successRef.current?.focus()
  }, [status])

  const setFieldValue = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setStatus((current) => (current === 'error' ? 'idle' : current))
    setStatusMessage('')

    if (errors[name]) {
      setErrors((current) => ({
        ...current,
        [name]: validateContactField(name, value),
      }))
    }
  }

  const updateField = (event) => {
    setFieldValue(event.target.name, event.target.value)
  }

  const validateOnBlur = (event) => {
    const { name, value } = event.target
    if (!String(value ?? '').trim() && !errors[name] && status !== 'error') return
    setErrors((current) => ({ ...current, [name]: validateContactField(name, value) }))
  }

  const validateCustomField = (name, value) => {
    if (!String(value ?? '').trim() && !errors[name] && status !== 'error') return
    setErrors((current) => ({ ...current, [name]: validateContactField(name, value) }))
  }

  const inputProps = (name) => ({
    id: fieldIds[name],
    name,
    value: values[name],
    onChange: updateField,
    onBlur: validateOnBlur,
    'aria-invalid': Boolean(errors[name]),
    'aria-describedby': errors[name] ? `${fieldIds[name]}-error` : undefined,
  })

  const submitForm = async (event) => {
    event.preventDefault()
    if (status === 'submitting') return

    const validation = validateContactForm(values)
    setErrors(validation.errors)

    if (!validation.isValid) {
      setStatus('error')
      setStatusMessage('Please review the highlighted details.')
      const firstInvalid = Object.keys(validation.errors)[0]
      document.getElementById(fieldIds[firstInvalid])?.focus()
      return
    }

    setStatus('submitting')
    setStatusMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (result.errors && typeof result.errors === 'object') setErrors(result.errors)
        throw new Error(result.error || 'Your message could not be sent. Please try again.')
      }

      setStatus('success')
      setStatusMessage('Your message has been sent. The ZakTalks team will be in touch.')
    } catch (error) {
      setStatus('error')
      setStatusMessage(error.message || 'Your message could not be sent. Please try again.')
    }
  }

  const resetForm = () => {
    setValues(CONTACT_INITIAL_VALUES)
    setErrors({})
    setStatus('idle')
    setStatusMessage('')
    window.requestAnimationFrame(() => formRef.current?.querySelector('input')?.focus())
  }

  return (
    <main className={styles.page}>
      <section
        ref={sectionRef}
        className={`${styles.section} ${revealed ? styles.revealed : ''}`}
        aria-labelledby="contact-heading"
      >
        <div className={styles.container}>
          <div className={styles.layout}>
            <header className={styles.intro}>
              <p className={styles.eyebrow}>Contact ZakTalks</p>
              <h1 id="contact-heading" className={styles.title}>Start a conversation</h1>
              <p className={styles.subheading}>
                Tell us what brings you here. Share a little context, and we will make sure your message reaches the right place.
              </p>
            </header>

            <div className={styles.formPanel}>
              {status === 'success' ? (
                <div ref={successRef} className={styles.successPanel} role="status" tabIndex={-1}>
                  <span className={styles.successIcon}><FiCheck aria-hidden="true" /></span>
                  <p className={styles.successLabel}>Message received</p>
                  <h2>Thank you for reaching out.</h2>
                  <p>{statusMessage}</p>
                  <button type="button" className={styles.newMessageButton} onClick={resetForm}>
                    Send another message
                  </button>
                </div>
              ) : (
                <form ref={formRef} className={styles.form} onSubmit={submitForm} noValidate>
                  <div className={styles.formGrid}>
                    <div className={styles.field}>
                      <label htmlFor={fieldIds.firstName}>First name <span>*</span></label>
                      <input type="text" autoComplete="given-name" maxLength={80} placeholder="First name" {...inputProps('firstName')} />
                      <FieldError id={`${fieldIds.firstName}-error`} error={errors.firstName} />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor={fieldIds.lastName}>Last name <span>*</span></label>
                      <input type="text" autoComplete="family-name" maxLength={80} placeholder="Last name" {...inputProps('lastName')} />
                      <FieldError id={`${fieldIds.lastName}-error`} error={errors.lastName} />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor={fieldIds.email}>Email address <span>*</span></label>
                      <input type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="name@example.com" {...inputProps('email')} />
                      <FieldError id={`${fieldIds.email}-error`} error={errors.email} />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor={fieldIds.phone}>Phone number <span>*</span></label>
                      <input type="tel" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="+961 ..." {...inputProps('phone')} />
                      <FieldError id={`${fieldIds.phone}-error`} error={errors.phone} />
                    </div>

                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label htmlFor={fieldIds.source}>How did you hear about us? <span>*</span></label>
                      <SourceSelect
                        value={values.source}
                        error={errors.source}
                        onChange={setFieldValue}
                        onValidate={validateCustomField}
                      />
                      <FieldError id={`${fieldIds.source}-error`} error={errors.source} />
                    </div>

                    <div className={`${styles.field} ${styles.fieldWide}`}>
                      <label htmlFor={fieldIds.message}>Message <span>*</span></label>
                      <textarea rows={6} maxLength={2500} placeholder="How can we help?" {...inputProps('message')} />
                      <div className={styles.messageMeta}>
                        <FieldError id={`${fieldIds.message}-error`} error={errors.message} />
                        <span className={styles.characterCount}>{values.message.length}/2500</span>
                      </div>
                    </div>

                    <div className={styles.honeypot} aria-hidden="true">
                      <label htmlFor="contact-website">Website</label>
                      <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={updateField} />
                    </div>
                  </div>

                  <div className={styles.formFooter}>
                    <p className={`${styles.formStatus} ${status === 'error' ? styles.formStatusError : ''}`} aria-live="polite">
                      {statusMessage}
                    </p>
                    <button type="submit" className={styles.submitButton} disabled={status === 'submitting'}>
                      <span>{status === 'submitting' ? 'Sending...' : 'Send Message'}</span>
                      <FiArrowUpRight aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
      <EventsNewsletterSection
        headingId="contact-newsletter-heading"
        title="Stay close to the work"
        paragraphs={[
          'Get honest reflections, practical insights, and updates on new episodes, workshops, and courses.',
        ]}
        cta="Join the newsletter"
        idleNote="No noise. Just useful updates worth opening."
        successNote="Thank you. You are on the list."
      />
    </main>
  )
}
