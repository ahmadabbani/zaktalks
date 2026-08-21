'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

function safeRedirectPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard'
  }

  return value
}

function AuthContent() {
  const searchParams = useSearchParams()
  const next = useMemo(
    () => safeRedirectPath(searchParams.get('next')),
    [searchParams],
  )
  const isEmailChange = next.includes('section=profile') && next.includes('email=confirmed')
  const [status, setStatus] = useState(isEmailChange ? 'Confirming your email change...' : 'Confirming your secure link...')
  const shouldSendWelcome = searchParams.get('welcome') === 'signup'

  useEffect(() => {
    let active = true
    let subscription = null
    let redirectStarted = false
    const supabase = createClient()

    const finish = async (session) => {
      if (!active || redirectStarted) return
      redirectStarted = true

      setStatus(isEmailChange ? 'Email confirmation recorded. Redirecting...' : 'Secure link confirmed. Redirecting...')
      toast.success(isEmailChange ? 'Email confirmation recorded' : 'Secure link confirmed')

      if (shouldSendWelcome && session?.access_token) {
        try {
          await fetch('/api/auth/welcome', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            cache: 'no-store',
          })
        } catch (error) {
          // Welcome delivery is retried on the user's next successful login.
          console.error('Welcome email request failed:', error.message)
        }
      }

      // Supabase has persisted the new session in browser cookies at this point.
      // Use a full navigation so the destination request is made only after those
      // cookies are available, and remove the one-time auth callback from history.
      window.location.replace(next)
    }

    const fail = (message) => {
      if (!active || redirectStarted) return
      const safeMessage = message || 'This secure link is invalid or has expired.'
      setStatus(safeMessage)
      toast.error(safeMessage)
    }

    const handleAuth = async () => {
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        setStatus(isEmailChange ? 'Confirming your email change...' : 'Confirming your secure link...')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })

        if (error || !data.session) {
          fail(error?.message)
          return
        }

        await finish(data.session)
        return
      }

      const code = searchParams.get('code')
      if (code) {
        setStatus(isEmailChange ? 'Confirming your email change...' : 'Confirming your secure link...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (error || !data.session) {
          fail(error?.message)
          return
        }

        await finish(data.session)
        return
      }

      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        if (
          session
          && ['SIGNED_IN', 'PASSWORD_RECOVERY', 'INITIAL_SESSION'].includes(event)
        ) {
          finish(session)
        }
      })
      subscription = authListener.subscription

      const { data, error } = await supabase.auth.getSession()

      if (error) {
        fail(error.message)
      } else if (data.session) {
        finish(data.session)
      } else if (active) {
        setStatus('This secure link is invalid or has expired.')
      }
    }

    handleAuth().catch((error) => fail(error.message))

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [isEmailChange, next, searchParams, shouldSendWelcome])

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>{isEmailChange ? 'Email confirmation' : 'Account setup'}</h2>
        <p>{status}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Confirming your secure link...</div>}>
      <AuthContent />
    </Suspense>
  )
}
