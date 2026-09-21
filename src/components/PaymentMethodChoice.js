'use client'

import { FaCreditCard } from 'react-icons/fa'
import { useEffect, useState } from 'react'
import styles from './whish-checkout.module.css'

// Official coloured Whish app mark, served from Whish's public website.
const WHISH_LOGO_URL = 'https://cdn.prod.website-files.com/6762f4acf0dd8a6b998dfa16/6aa7b04cc4c07194faa7a37c_whish-logo-square.avif'

export function WhishIcon() {
  return <img src={WHISH_LOGO_URL} alt="" aria-hidden="true" width={32} height={32} style={{ width: '2rem', height: '2rem', objectFit: 'contain' }} />
}

export default function PaymentMethodChoice({value,onChange,disabled}) {
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/checkout/whish', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(result => { if (!controller.signal.aborted) setAvailable(result?.available === true) })
      .catch(() => {}) // Whish availability must never prevent card checkout.
    return () => controller.abort()
  }, [])
  return <fieldset className={styles.methods} disabled={disabled}>
    <legend>How Would You Like To Pay?</legend>
    <div className={styles.methodGrid}>
      {[['stripe','Card / Stripe','Secure online payment',<FaCreditCard key="card"/>],['whish','Whish',available ? 'Transfer · Whish to Whish' : 'Currently unavailable',<WhishIcon key="whish"/>]].map(([key,title,description,icon])=>
        <label key={key} className={`${styles.method} ${value===key?styles.selected:''}`}>
          <input type="radio" name="payment-method" value={key} checked={value===key} disabled={disabled || (key === 'whish' && !available)} onChange={()=>onChange(key)}/>
          <span className={styles.methodIcon}>{icon}</span><span><strong>{title}</strong><small>{description}</small></span>
        </label>)}
    </div>
  </fieldset>
}
