'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { FiAlertCircle, FiArrowUpRight, FiCheck, FiChevronDown, FiX } from 'react-icons/fi'
import InternationalPhoneField from '@/components/InternationalPhoneField'
import {
  EVENT_BOOKING_INITIAL_VALUES,
  EVENT_BUDGET_OPTIONS,
  EVENT_DELIVERY_OPTIONS,
  EVENT_FORMAT_OPTIONS,
  validateEventBooking,
  validateEventBookingField,
} from '@/lib/eventBooking'
import styles from './EventsBookingSection.module.css'

const fieldIds = {
  organisation: 'organisation',
  contactName: 'contact-name',
  contactRole: 'contact-role',
  email: 'booking-email',
  phone: 'booking-phone',
  eventDate: 'event-date',
  delivery: 'event-delivery',
  location: 'event-location',
  audience: 'event-audience',
  attendance: 'event-attendance',
  topic: 'event-topic',
  format: 'event-format',
  budget: 'event-budget',
  context: 'event-context',
}

function FieldMessage({ id, error }) {
  if (!error) return null

  return (
    <span id={id} className={styles.fieldError} role="alert">
      <FiAlertCircle aria-hidden="true" />
      {error}
    </span>
  )
}

function CustomSelect({ id, name, value, options, placeholder, error, onChange, onValidate }) {
  const wrapperRef = useRef(null)
  const buttonRef = useRef(null)
  const optionRefs = useRef([])
  const [isOpen, setIsOpen] = useState(false)
  const selectedIndex = options.indexOf(value)

  const openMenu = (preferredIndex = selectedIndex >= 0 ? selectedIndex : 0) => {
    setIsOpen(true)
    window.requestAnimationFrame(() => optionRefs.current[preferredIndex]?.focus())
  }

  const chooseOption = (option) => {
    onChange({ target: { name, value: option } })
    setIsOpen(false)
    window.requestAnimationFrame(() => buttonRef.current?.focus())
  }

  const handleButtonKeyDown = (event) => {
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const targetIndex = event.key === 'End'
        ? options.length - 1
        : event.key === 'ArrowUp'
          ? Math.max(0, selectedIndex >= 0 ? selectedIndex - 1 : options.length - 1)
          : event.key === 'Home'
            ? 0
            : Math.min(options.length - 1, selectedIndex >= 0 ? selectedIndex + 1 : 0)
      openMenu(targetIndex)
    }
  }

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      optionRefs.current[(index + direction + options.length) % options.length]?.focus()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      optionRefs.current[event.key === 'Home' ? 0 : options.length - 1]?.focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      buttonRef.current?.focus()
    } else if (event.key === 'Tab') {
      setIsOpen(false)
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`${styles.customSelect} ${isOpen ? styles.customSelectOpen : ''}`}
      onBlur={(event) => {
        if (wrapperRef.current?.contains(event.relatedTarget)) return
        setIsOpen(false)
        onValidate(name, value)
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`${styles.selectButton} ${!value ? styles.selectPlaceholder : ''}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={`${id}-options`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onClick={() => (isOpen ? setIsOpen(false) : openMenu())}
        onKeyDown={handleButtonKeyDown}
      >
        <span>{value || placeholder}</span>
        <FiChevronDown aria-hidden="true" />
      </button>

      {isOpen && (
        <div id={`${id}-options`} className={styles.selectMenu} role="listbox" aria-label={placeholder}>
          {options.map((option, index) => (
            <button
              key={option}
              ref={(element) => { optionRefs.current[index] = element }}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`${styles.selectOption} ${value === option ? styles.selectOptionSelected : ''}`}
              onClick={() => chooseOption(option)}
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

export default function EventsBookingSection() {
  const sectionRef = useRef(null)
  const openerRef = useRef(null)
  const dialogRef = useRef(null)
  const firstInputRef = useRef(null)
  const successRef = useRef(null)
  const statusRef = useRef('idle')
  const titleId = useId()
  const descriptionId = useId()
  const [mounted, setMounted] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [values, setValues] = useState(EVENT_BOOKING_INITIAL_VALUES)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [submitMessage, setSubmitMessage] = useState('')

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    statusRef.current = status

    if (status === 'success') {
      window.requestAnimationFrame(() => {
        dialogRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        successRef.current?.focus({ preventScroll: true })
      })
    }
  }, [status])

  useEffect(() => {
    const element = sectionRef.current
    if (!element) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setRevealed(true)
        observer.disconnect()
      },
      { threshold: 0.18, rootMargin: '0px 0px -7% 0px' }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const openFromHero = () => {
      setStatus('idle')
      setSubmitMessage('')
      setIsOpen(true)
    }

    window.addEventListener('events:open-booking', openFromHero)
    return () => window.removeEventListener('events:open-booking', openFromHero)
  }, [])

  useEffect(() => {
    if (!isOpen) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.requestAnimationFrame(() => firstInputRef.current?.focus())

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && statusRef.current !== 'submitting') {
        setIsOpen(false)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(
        'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )]

      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      openerRef.current?.focus()
    }
  }, [isOpen])

  const openDialog = () => {
    setStatus('idle')
    setSubmitMessage('')
    setIsOpen(true)
  }

  const closeDialog = () => {
    if (status === 'submitting') return
    setIsOpen(false)
    if (status === 'success') {
      setValues(EVENT_BOOKING_INITIAL_VALUES)
      setErrors({})
    }
  }

  const updateField = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))
    setStatus((current) => (current === 'error' ? 'idle' : current))
    setSubmitMessage('')

    if (errors[name]) {
      const nextError = validateEventBookingField(name, value)
      setErrors((current) => ({ ...current, [name]: nextError }))
    }
  }

  const updatePhone = (value) => {
    setValues((current) => ({ ...current, phone: value }))
    setStatus((current) => (current === 'error' ? 'idle' : current))
    setSubmitMessage('')

    if (errors.phone) {
      setErrors((current) => ({
        ...current,
        phone: validateEventBookingField('phone', value),
      }))
    }
  }

  const validateOnBlur = (event) => {
    const { name, value } = event.target
    if (!String(value ?? '').trim() && !errors[name] && status !== 'error') return
    const error = validateEventBookingField(name, value)
    setErrors((current) => ({ ...current, [name]: error }))
  }

  const validateCustomSelect = (name, value) => {
    if (!String(value ?? '').trim() && !errors[name] && status !== 'error') return
    const error = validateEventBookingField(name, value)
    setErrors((current) => ({ ...current, [name]: error }))
  }

  const submitRequest = async (event) => {
    event.preventDefault()
    if (status === 'submitting') return

    const validation = validateEventBooking(values)
    setErrors(validation.errors)

    if (!validation.isValid) {
      setStatus('error')
      setSubmitMessage('Please review the highlighted details.')
      const firstInvalid = Object.keys(validation.errors)[0]
      event.currentTarget.elements.namedItem(firstInvalid)?.focus()
      return
    }

    setStatus('submitting')
    setSubmitMessage('')

    try {
      const response = await fetch('/api/event-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (result.errors && typeof result.errors === 'object') setErrors(result.errors)
        throw new Error(result.error || 'Your request could not be sent. Please try again.')
      }

      setStatus('success')
      setSubmitMessage('Your event request has been sent. The ZakTalks team will be in touch.')
      setIsOpen(true)
    } catch (error) {
      setStatus('error')
      setSubmitMessage(error.message || 'Your request could not be sent. Please try again.')
    }
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

  const modal = isOpen ? (
    <div className={styles.modalBackdrop} onMouseDown={(event) => {
      if (event.currentTarget === event.target) closeDialog()
    }}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={`${styles.dialogHeader} ${status === 'success' ? styles.dialogHeaderSuccess : ''}`}>
          {status !== 'success' && (
            <div>
              <p className={styles.dialogEyebrow}>Event booking request</p>
              <h2 id={titleId} className={styles.dialogTitle}>Tell us what you are planning</h2>
              <p id={descriptionId} className={styles.dialogIntro}>
                Share the essential details so we can understand the room, the purpose, and the right format.
              </p>
            </div>
          )}
          {status === 'success' && (
            <h2 id={titleId} className={styles.srOnly}>Event booking request received</h2>
          )}
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeDialog}
            disabled={status === 'submitting'}
            aria-label="Close booking form"
          >
            <FiX aria-hidden="true" />
          </button>
        </div>

        {status === 'success' ? (
          <div ref={successRef} className={styles.successPanel} role="status" tabIndex={-1}>
            <span className={styles.successIcon}><FiCheck aria-hidden="true" /></span>
            <h3>Request received</h3>
            <p>{submitMessage}</p>
            <button type="button" className={styles.successClose} onClick={closeDialog}>Close</button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submitRequest} noValidate>
            <div className={styles.formGrid}>
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor={fieldIds.organisation}>Organisation name <span>*</span></label>
                <input ref={firstInputRef} type="text" autoComplete="organization" maxLength={120} placeholder="Organisation or company" {...inputProps('organisation')} />
                <FieldMessage id={`${fieldIds.organisation}-error`} error={errors.organisation} />
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldIds.contactName}>Contact person <span>*</span></label>
                <input type="text" autoComplete="name" maxLength={100} placeholder="Full name" {...inputProps('contactName')} />
                <FieldMessage id={`${fieldIds.contactName}-error`} error={errors.contactName} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fieldIds.contactRole}>Role <span>*</span></label>
                <input type="text" autoComplete="organization-title" maxLength={100} placeholder="Your role" {...inputProps('contactRole')} />
                <FieldMessage id={`${fieldIds.contactRole}-error`} error={errors.contactRole} />
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldIds.email}>Email address <span>*</span></label>
                <input type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="name@organisation.com" {...inputProps('email')} />
                <FieldMessage id={`${fieldIds.email}-error`} error={errors.email} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fieldIds.phone}>Phone number <span>*</span></label>
                <InternationalPhoneField
                  id={fieldIds.phone}
                  value={values.phone}
                  error={errors.phone}
                  describedBy={`${fieldIds.phone}-error`}
                  variant="booking"
                  disabled={status === 'submitting'}
                  onChange={updatePhone}
                  onBlur={() => validateCustomSelect('phone', values.phone)}
                />
                <FieldMessage id={`${fieldIds.phone}-error`} error={errors.phone} />
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldIds.eventDate}>Event date or preferred range <span>*</span></label>
                <input type="text" maxLength={120} placeholder="For example, 12-18 October 2026" {...inputProps('eventDate')} />
                <FieldMessage id={`${fieldIds.eventDate}-error`} error={errors.eventDate} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fieldIds.delivery}>Event setting <span>*</span></label>
                <CustomSelect
                  id={fieldIds.delivery}
                  name="delivery"
                  value={values.delivery}
                  options={EVENT_DELIVERY_OPTIONS}
                  placeholder="Choose one"
                  error={errors.delivery}
                  onChange={updateField}
                  onValidate={validateCustomSelect}
                />
                <FieldMessage id={`${fieldIds.delivery}-error`} error={errors.delivery} />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor={fieldIds.location}>Location or online platform <span>*</span></label>
                <input type="text" maxLength={160} placeholder="City and venue, or online platform" {...inputProps('location')} />
                <FieldMessage id={`${fieldIds.location}-error`} error={errors.location} />
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldIds.audience}>Audience type <span>*</span></label>
                <input type="text" maxLength={180} placeholder="Leaders, employees, community..." {...inputProps('audience')} />
                <FieldMessage id={`${fieldIds.audience}-error`} error={errors.audience} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fieldIds.attendance}>Expected attendance <span>*</span></label>
                <input type="text" inputMode="numeric" maxLength={7} placeholder="For example, 250" {...inputProps('attendance')} />
                <FieldMessage id={`${fieldIds.attendance}-error`} error={errors.attendance} />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor={fieldIds.topic}>Preferred topic or desired outcome <span>*</span></label>
                <textarea rows={3} maxLength={600} placeholder="What should this conversation help your audience see, understand, or change?" {...inputProps('topic')} />
                <FieldMessage id={`${fieldIds.topic}-error`} error={errors.topic} />
              </div>

              <div className={styles.field}>
                <label htmlFor={fieldIds.format}>Preferred format <span>*</span></label>
                <CustomSelect
                  id={fieldIds.format}
                  name="format"
                  value={values.format}
                  options={EVENT_FORMAT_OPTIONS}
                  placeholder="Choose one"
                  error={errors.format}
                  onChange={updateField}
                  onValidate={validateCustomSelect}
                />
                <FieldMessage id={`${fieldIds.format}-error`} error={errors.format} />
              </div>
              <div className={styles.field}>
                <label htmlFor={fieldIds.budget}>Available budget range <span>*</span></label>
                <CustomSelect
                  id={fieldIds.budget}
                  name="budget"
                  value={values.budget}
                  options={EVENT_BUDGET_OPTIONS}
                  placeholder="Choose one"
                  error={errors.budget}
                  onChange={updateField}
                  onValidate={validateCustomSelect}
                />
                <FieldMessage id={`${fieldIds.budget}-error`} error={errors.budget} />
              </div>

              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label htmlFor={fieldIds.context}>Additional context <small>Optional</small></label>
                <textarea rows={4} maxLength={2000} placeholder="Anything else that would help us understand the event?" {...inputProps('context')} />
                <span className={styles.characterCount}>{values.context.length}/2000</span>
                <FieldMessage id={`${fieldIds.context}-error`} error={errors.context} />
              </div>

              <div className={styles.honeypot} aria-hidden="true">
                <label htmlFor="booking-website">Website</label>
                <input id="booking-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={values.website} onChange={updateField} />
              </div>
            </div>

            <div className={styles.formFooter}>
              <p className={`${styles.submitStatus} ${status === 'error' ? styles.submitError : ''}`} aria-live="polite">
                {submitMessage}
              </p>
              <button type="submit" className={styles.submitButton} disabled={status === 'submitting'}>
                <span>{status === 'submitting' ? 'Submitting...' : 'Submit'}</span>
                <FiArrowUpRight aria-hidden="true" />
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  ) : null

  return (
    <>
      <section
        ref={sectionRef}
        className={`${styles.section} ${revealed ? styles.revealed : ''}`}
        aria-labelledby="events-booking-heading"
      >
        <div className={styles.container}>
          <div className={styles.layout}>
            <div className={styles.content}>
              <p className={styles.eyebrow}>Plan your event</p>
              <h2 id="events-booking-heading" className={styles.title}>Planning an event with depth?</h2>
              <div className={styles.copy}>
                <p>Whether you are hosting a conference, employee experience, leadership gathering, learning programme, or community event, share what you are building.</p>
                <p>Tell us about your audience, event date, format, topic, and the kind of shift you want the session to create. We will explore whether Zak is the right fit.</p>
              </div>
              <button ref={openerRef} type="button" className={styles.cta} onClick={openDialog}>
                <span>Start a Booking Request</span>
                <FiArrowUpRight aria-hidden="true" />
              </button>
            </div>

            <div className={styles.visualWrap}>
              <div className={styles.imageFrame}>
                <Image
                  src="/events-planning.jpg"
                  alt="Zak Dakkash leading a learning session"
                  width={1000}
                  height={1333}
                  sizes="(max-width: 700px) 70vw, (max-width: 1024px) 25vw, 18vw"
                  unoptimized
                  className={styles.image}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  )
}
