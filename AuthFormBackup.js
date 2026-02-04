'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function SubmitButton({ label, loadingLabel }) {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      className="btn btn-primary" 
      disabled={pending}
      style={{ width: '100%', marginTop: 'var(--space-md)' }}
    >
      {pending ? (loadingLabel || 'Processing...') : label}
    </button>
  )
}

export default function AuthForm({ type, action }) {
  const [error, setError] = useState(null)
  const router = useRouter()
  const isLogin = type === 'login'

  async function clientAction(formData) {
    setError(null)
    const result = await action(formData)
    
    if (result?.error) {
      setError(result.error)
      toast.error(result.error)
    } else if (result?.success) {
      toast.success(result.message)
      // Optional: redirect logic handled in server action or here
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '2rem 0' }}>
      <div className="card">
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        <form action={clientAction}>
          {!isLogin && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: 'var(--space-md)' }}>
              <div>
                <label htmlFor="first_name">First Name</label>
                <input id="first_name" name="first_name" required placeholder="John" />
              </div>
              <div>
                <label htmlFor="last_name">Last Name</label>
                <input id="last_name" name="last_name" required placeholder="Doe" />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label htmlFor="email">Email Address</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="you@example.com"
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <label htmlFor="password">Password</label>
              {isLogin && (
                <Link 
                  href="/reset-password" 
                  style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary-dark)' }}
                >
                  Forgot password?
                </Link>
              )}
            </div>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ 
              backgroundColor: '#FEE2E2', 
              color: '#B91C1C', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-md)',
              fontSize: 'var(--font-size-sm)'
            }}>
              {error}
            </div>
          )}

          <SubmitButton 
            label={isLogin ? 'Sign In' : 'Create Account'} 
            loadingLabel={isLogin ? 'Signing in...' : 'Creating account...'} 
          />
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <Link href={isLogin ? '/register' : '/login'} style={{ fontWeight: 600 }}>
            {isLogin ? 'Sign up' : 'Sign in'}
          </Link>
        </p>
      </div>
    </div>
  )
}
