'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import toast from 'react-hot-toast'
import { updatePassword } from '@/app/auth/actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button 
      type="submit" 
      className="btn btn-primary" 
      disabled={pending}
      style={{ width: '100%', marginTop: 'var(--space-md)' }}
    >
      {pending ? 'Updating...' : 'Update Password'}
    </button>
  )
}

export default function UpdatePasswordPage() {
  async function clientAction(formData) {
    const result = await updatePassword(formData)
    if (result?.error) {
      toast.error(result.error)
    }
  }

  return (
    <div className="container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>Set New Password</h2>
          
          <form action={clientAction}>
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor="password">New Password</label>
              <input 
                id="password" 
                name="password" 
                type="password" 
                required 
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <label htmlFor="confirm_password">Confirm Password</label>
              <input 
                id="confirm_password" 
                name="confirm_password" 
                type="password" 
                required 
                minLength={6}
                placeholder="••••••••"
              />
            </div>

            <SubmitButton />
          </form>
        </div>
      </div>
    </div>
  )
}
