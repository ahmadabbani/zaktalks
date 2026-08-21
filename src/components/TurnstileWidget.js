'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import styles from './TurnstileWidget.module.css'

const DEVELOPMENT_SITE_KEY = '1x00000000000000000000AA'

export default function TurnstileWidget({ onTokenChange, resetSignal = 0 }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const tokenCallbackRef = useRef(onTokenChange)
  const [scriptReady, setScriptReady] = useState(false)
  const [isInteractive, setIsInteractive] = useState(false)
  const configuredSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const siteKey = configuredSiteKey
    || (process.env.NODE_ENV !== 'production' ? DEVELOPMENT_SITE_KEY : '')

  useEffect(() => {
    tokenCallbackRef.current = onTokenChange
  }, [onTokenChange])

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return
    if (widgetIdRef.current !== null) return

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'light',
      size: 'flexible',
      appearance: 'interaction-only',
      'response-field': false,
      'before-interactive-callback': () => setIsInteractive(true),
      'after-interactive-callback': () => setIsInteractive(false),
      callback: (token) => {
        setIsInteractive(false)
        tokenCallbackRef.current(token)
      },
      'expired-callback': () => tokenCallbackRef.current(''),
      'error-callback': () => {
        setIsInteractive(false)
        tokenCallbackRef.current('')
      },
    })
  }, [siteKey])

  useEffect(() => {
    if (scriptReady || window.turnstile) renderWidget()
  }, [renderWidget, scriptReady])

  useEffect(() => {
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      tokenCallbackRef.current('')
    }
  }, [resetSignal])

  useEffect(() => () => {
    if (widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
    }
  }, [])

  if (!siteKey) {
    return (
      <div className={styles.unavailable} role="status">
        Security verification is temporarily unavailable.
      </div>
    )
  }

  return (
    <div className={`${styles.wrapper} ${isInteractive ? styles.interactive : styles.dormant}`}>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} className={styles.widget} />
    </div>
  )
}
