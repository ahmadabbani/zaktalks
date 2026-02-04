'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const [status, setStatus] = useState('Verifying your session...')

  useEffect(() => {
    // Flag to prevent double firing in dev mode
    let mounted = true

    const handleAuth = async () => {
      setStatus('Initializing auth...')
      const supabase = createClient()
      
      // Debug: Log what's in the URL
      console.log('Callback URL:', window.location.href)
      console.log('Hash:', window.location.hash)
      console.log('Search:', window.location.search)
      
      // Check if URL contains recovery/auth tokens in hash
      const hash = window.location.hash
      const hasTokensInHash = hash && hash.includes('access_token')
      
      // PRIORITY 1: If we have tokens in the hash, process them FIRST
      // This handles recovery links and email confirmation links
      if (hasTokensInHash) {
        setStatus('Processing authentication link...')
        try {
          const params = new URLSearchParams(hash.substring(1)) // remove #
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          
          if (accessToken) {
            // Set the new session with the tokens from the link
            const { data, error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })
            
            if (setSessionError) {
              console.error('setSession error:', setSessionError)
              if(mounted) {
                setStatus(`Verification Failed: ${setSessionError.message}`)
                toast.error(setSessionError.message)
              }
              return
            }
            
            if (data.session) {
              console.log('Session established from link, user:', data.session.user?.id)
              console.log('Redirecting to:', next)
              if(mounted) {
                setStatus('Verified! Redirecting...')
                toast.success('Successfully verified!')
                // Clear the hash to prevent reprocessing
                window.history.replaceState(null, '', window.location.pathname + window.location.search)
                // Use window.location for more reliable redirect
                window.location.href = next
              }
              return
            }
          }
        } catch (err) {
          console.error('Hash parsing error', err)
          if(mounted) setStatus(`Error processing link: ${err.message}`)
        }
        return
      }
      
      // PRIORITY 2: Check for Code (PKCE flow)
      const code = searchParams.get('code')
      if (code) {
        setStatus('Exchanging code for session...')
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Exchange error:', error)
          if(mounted) {
             setStatus(`Code Exchange Failed: ${error.message}`)
             toast.error(error.message)
          }
          return
        }
        // If success, check session below
      }

      // PRIORITY 3: Setup listener for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth Event:', event)
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
           if(mounted) {
             setStatus('Verified! Redirecting...')
             toast.success('Successfully verified!')
             router.push(next)
             router.refresh()
           }
        }
        if (event === 'SIGNED_OUT') {
           if(mounted) setStatus('User signed out. Please login.')
        }
      })

      // PRIORITY 4: Check current session (for PKCE code exchange result or existing session)
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
         console.error('Session Error:', error)
         if(mounted) setStatus(`Session Error: ${error.message}`)
      } else if (session) {
         console.log('Session found, user:', session.user?.id)
         if(mounted) {
             setStatus('Verified! Redirecting...')
             router.push(next)
             router.refresh()
         }
      } else {
        if(mounted) setStatus('Waiting for authentication...')
      }
      
      return () => {
        mounted = false
        subscription.unsubscribe()
      }
    }


    handleAuth()
  }, [router, searchParams, next])

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto var(--space-md)' }}></div>
        <h2>{status}</h2>
        <p>Please wait while we log you in...</p>
      </div>
    </div>
  )
}
