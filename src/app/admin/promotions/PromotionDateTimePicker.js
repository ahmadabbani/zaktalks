'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaClock } from 'react-icons/fa'
import styles from './admin-promotions.module.css'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseLocalDateTime(value) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function localDateTimeValue(date) {
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dateLabel(value) {
  const date = parseLocalDateTime(value)
  if (!date) return 'Choose date and time'
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(date)
}

export default function PromotionDateTimePicker({ label, value, onChange }) {
  const selected = parseLocalDateTime(value) || new Date()
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const days = useMemo(() => {
    const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
    return Array.from({ length: 42 }, (_, index) => (
      new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1)
    ))
  }, [month])

  const chooseDate = (day) => {
    const next = parseLocalDateTime(value) || new Date()
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate())
    next.setSeconds(0, 0)
    onChange(localDateTimeValue(next))
    if (day.getMonth() !== month.getMonth()) {
      setMonth(new Date(day.getFullYear(), day.getMonth(), 1))
    }
  }

  const updateTime = (part, nextValue) => {
    const next = parseLocalDateTime(value) || new Date()
    if (part === 'hour') next.setHours(Number(nextValue))
    if (part === 'minute') next.setMinutes(Number(nextValue))
    next.setSeconds(0, 0)
    onChange(localDateTimeValue(next))
  }

  const selectedDayKey = `${selected.getFullYear()}-${selected.getMonth()}-${selected.getDate()}`
  const minuteOptions = [...new Set([0, 15, 30, 45, selected.getMinutes()])].sort((a, b) => a - b)

  return (
    <div className={styles.dateField} ref={rootRef}>
      <span className={styles.fieldLabel}>{label}</span>
      <button
        type="button"
        className={`${styles.dateTrigger} ${open ? styles.dateTriggerOpen : ''}`}
        onClick={() => {
          setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
          setOpen((current) => !current)
        }}
        aria-expanded={open}
      >
        <FaCalendarAlt aria-hidden="true" />
        <span>{dateLabel(value)}</span>
      </button>

      {open && <div className={styles.calendarPopover} role="dialog" aria-label={`${label} calendar`}>
        <div className={styles.calendarHeader}>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><FaChevronLeft /></button>
          <strong>{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(month)}</strong>
          <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><FaChevronRight /></button>
        </div>
        <div className={styles.calendarWeekdays}>{WEEKDAYS.map((day) => <span key={day}>{day}</span>)}</div>
        <div className={styles.calendarGrid}>
          {days.map((day) => {
            const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`
            return <button
              type="button"
              key={day.toISOString()}
              className={`${day.getMonth() !== month.getMonth() ? styles.calendarOutside : ''} ${dayKey === selectedDayKey ? styles.calendarSelected : ''}`}
              onClick={() => chooseDate(day)}
              aria-label={day.toLocaleDateString()}
              aria-pressed={dayKey === selectedDayKey}
            >{day.getDate()}</button>
          })}
        </div>
        <div className={styles.timePicker}>
          <span><FaClock aria-hidden="true" /> Time</span>
          <label>
            <span className={styles.srOnly}>Hour</span>
            <select value={selected.getHours()} onChange={(event) => updateTime('hour', event.target.value)}>
              {Array.from({ length: 24 }, (_, hour) => <option value={hour} key={hour}>{String(hour).padStart(2, '0')}</option>)}
            </select>
          </label>
          <b>:</b>
          <label>
            <span className={styles.srOnly}>Minute</span>
            <select value={selected.getMinutes()} onChange={(event) => updateTime('minute', event.target.value)}>
              {minuteOptions.map((minute) => <option value={minute} key={minute}>{String(minute).padStart(2, '0')}</option>)}
            </select>
          </label>
          <button type="button" className={styles.calendarDone} onClick={() => setOpen(false)}>Done</button>
        </div>
      </div>}
    </div>
  )
}
