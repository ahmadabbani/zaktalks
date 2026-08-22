'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { login, signup } from '@/app/auth/actions'
import AuthForm from '@/components/AuthForm'
import styles from '@/app/auth.module.css'

const MODE_PATHS = {
  login: '/login',
  register: '/register',
}

export default function AuthExperience({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const experienceRef = useRef(null)

  useLayoutEffect(() => {
    const experience = experienceRef.current
    const navbar = document.querySelector('nav[aria-label="Main navigation"]')

    if (!experience || !navbar) return undefined

    const alignWithNavbar = () => {
      experience.style.setProperty(
        '--auth-nav-offset',
        `${navbar.getBoundingClientRect().bottom}px`,
      )
    }

    alignWithNavbar()

    const resizeObserver = new ResizeObserver(alignWithNavbar)
    resizeObserver.observe(navbar)
    window.addEventListener('resize', alignWithNavbar)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', alignWithNavbar)
    }
  }, [])

  useEffect(() => {
    const syncModeWithHistory = () => {
      setMode(window.location.pathname === MODE_PATHS.register ? 'register' : 'login')
    }

    window.addEventListener('popstate', syncModeWithHistory)
    return () => window.removeEventListener('popstate', syncModeWithHistory)
  }, [])

  function selectMode(nextMode) {
    if (nextMode === mode) return

    setMode(nextMode)
    window.history.pushState({ authMode: nextMode }, '', MODE_PATHS[nextMode])
    document.title = nextMode === 'login'
      ? 'Sign In - ZakTalks'
      : 'Create Account - ZakTalks'
  }

  const isLogin = mode === 'login'

  return (
    <main ref={experienceRef} className={styles.authExperience}>
      <section className={styles.visualPanel} aria-label="ZakTalks learning space">
        <Image
          src="/auth-panel-art-v2.png"
          alt=""
          fill
          priority
          sizes="(max-width: 860px) 100vw, 50vw"
          className={styles.visualArtwork}
        />
        <div className={styles.visualContent}>
          <Image
            src="/logowhite1.png"
            alt="ZakTalks"
            width={220}
            height={132}
            className={styles.visualLogo}
          />
          <div className={styles.visualMessage}>
            <h1>Welcome to ZakTalks.</h1>
            <p>Sign in or create an account to continue.</p>
          </div>
          <p className={styles.visualFooter}>Learn at your own pace.</p>
        </div>
      </section>

      <section className={styles.formPanel}>
        <div className={styles.formShell}>
          <div className={styles.modeSwitch} role="tablist" aria-label="Choose authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={isLogin ? styles.modeActive : ''}
              onClick={() => selectMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={!isLogin ? styles.modeActive : ''}
              onClick={() => selectMode('register')}
            >
              Create account
            </button>
          </div>

          <AuthForm
            key={mode}
            type={mode}
            action={isLogin ? login : signup}
            showSwitch={false}
          />
        </div>
      </section>
    </main>
  )
}
