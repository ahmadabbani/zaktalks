'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import PhoneInput, { getCountries, getCountryCallingCode } from 'react-phone-number-input'
import flags from 'react-phone-number-input/flags'
import { FiCheck, FiChevronDown, FiSearch } from 'react-icons/fi'
import styles from './InternationalPhoneField.module.css'

const supportedCountries = new Set(getCountries())

function localeCountry() {
  if (typeof navigator === 'undefined') return undefined

  for (const locale of navigator.languages || [navigator.language]) {
    try {
      const country = new Intl.Locale(locale).region?.toUpperCase()
      if (country && supportedCountries.has(country)) return country
    } catch {
      // Continue to the next browser locale.
    }
  }

  return undefined
}

async function detectVisitorCountry(signal) {
  try {
    const response = await fetch('/api/location/country', { signal })
    if (response.ok) {
      const result = await response.json()
      const country = String(result?.country || '').toUpperCase()
      if (supportedCountries.has(country)) return country
    }
  } catch (error) {
    if (error?.name === 'AbortError') return undefined
  }

  return localeCountry()
}

function CountrySelector({ value, options, onChange, onFocus, onBlur, disabled, readOnly, iconComponent: Icon }) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const searchRef = useRef(null)
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const countries = useMemo(
    () => options.filter((option) => option.value && !option.divider),
    [options]
  )

  const filteredCountries = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase().replace(/^\+/, '')
    if (!cleanQuery) return countries

    return countries.filter((option) => {
      const callingCode = getCountryCallingCode(option.value)
      return option.label.toLowerCase().includes(cleanQuery)
        || option.value.toLowerCase().includes(cleanQuery)
        || callingCode.includes(cleanQuery)
    })
  }, [countries, query])

  const selected = countries.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return undefined

    const closeOnPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnPointerDown)
    window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => document.removeEventListener('pointerdown', closeOnPointerDown)
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    setQuery('')
  }

  const chooseCountry = (country) => {
    onChange(country)
    closeMenu()
  }

  return (
    <div
      ref={rootRef}
      className={styles.countrySelector}
      onBlur={(event) => {
        if (rootRef.current?.contains(event.relatedTarget)) return
        closeMenu()
        onBlur?.(event)
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={styles.countryTrigger}
        aria-label={selected ? `Country: ${selected.label}, +${getCountryCallingCode(value)}` : 'Select country code'}
        aria-haspopup="listbox"
        aria-controls={menuId}
        aria-expanded={open}
        disabled={disabled || readOnly}
        onFocus={onFocus}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closeMenu()
            triggerRef.current?.focus()
          }
        }}
      >
        {selected ? (
          <>
            <span className={styles.flag} aria-hidden="true">
              <Icon country={value} label={selected.label} />
            </span>
            <span className={styles.callingCode}>+{getCountryCallingCode(value)}</span>
          </>
        ) : (
          <span className={styles.countryPlaceholder}>Country</span>
        )}
        <FiChevronDown className={open ? styles.chevronOpen : ''} aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} className={styles.countryMenu} role="listbox" aria-label="Countries and calling codes">
          <div className={styles.countrySearch}>
            <FiSearch aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              placeholder="Search country or code"
              aria-label="Search countries"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  closeMenu()
                  triggerRef.current?.focus()
                }
              }}
            />
          </div>

          <div className={styles.countryOptions}>
            {filteredCountries.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                className={`${styles.countryOption} ${value === option.value ? styles.countryOptionSelected : ''}`}
                onClick={() => chooseCountry(option.value)}
              >
                <span className={styles.optionFlag} aria-hidden="true">
                  <Icon country={option.value} label={option.label} />
                </span>
                <span className={styles.countryName}>{option.label}</span>
                <span className={styles.optionCode}>+{getCountryCallingCode(option.value)}</span>
                {value === option.value && <FiCheck className={styles.selectedIcon} aria-hidden="true" />}
              </button>
            ))}

            {filteredCountries.length === 0 && (
              <p className={styles.noCountries}>No country found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function InternationalPhoneField({
  id,
  name = 'phone',
  value,
  onChange,
  onBlur,
  error,
  describedBy,
  variant = 'contact',
  disabled = false,
}) {
  const [defaultCountry, setDefaultCountry] = useState()

  useEffect(() => {
    const controller = new AbortController()

    detectVisitorCountry(controller.signal).then((country) => {
      if (country) setDefaultCountry(country)
    })

    return () => controller.abort()
  }, [])

  return (
    <PhoneInput
      id={id}
      name={name}
      value={value || undefined}
      defaultCountry={defaultCountry}
      onChange={(nextValue) => onChange(nextValue || '')}
      onBlur={onBlur}
      disabled={disabled}
      autoComplete="tel"
      placeholder="Phone number"
      limitMaxLength
      flags={flags}
      countrySelectComponent={CountrySelector}
      className={`${styles.phoneField} ${styles[variant]} ${error ? styles.invalid : ''}`}
      numberInputProps={{
        inputMode: 'tel',
        maxLength: 30,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? describedBy : undefined,
      }}
    />
  )
}
