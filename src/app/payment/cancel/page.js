import Link from 'next/link'
import { FaTimesCircle } from 'react-icons/fa'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

export default async function PaymentCancelPage({ searchParams }) {
  const params = await searchParams
  const { session_id } = params

  if (session_id) {
    console.log('Cancelling session:', session_id)
    const supabaseAdmin = await createAdminClient()
    // Mark the session as failed in the DB
    const { data, error } = await supabaseAdmin
      .from('checkout_sessions')
      .update({ status: 'failed' })
      .eq('stripe_session_id', session_id)
      .eq('status', 'pending')
    
    if (error) console.error('Error cancelling session:', error)
    else console.log('Session marked as cancelled in DB')
  }

  return (
    <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-xl)' }}>
        <FaTimesCircle style={{ fontSize: '4rem', color: 'var(--color-error)', marginBottom: 'var(--space-md)' }} />
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>Payment Cancelled</h1>
        <p style={{ opacity: 0.8, marginBottom: 'var(--space-xl)' }}>
          The payment process was cancelled. No charges were made.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Link href="/" className="btn btn-primary">Back to Courses</Link>
        </div>
      </div>
    </div>
  )
}
