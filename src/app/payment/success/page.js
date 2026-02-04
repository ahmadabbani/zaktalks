import Link from 'next/link'
import { FaCheckCircle } from 'react-icons/fa'

export default async function PaymentSuccessPage({ searchParams }) {
  const params = await searchParams
  const { session_id, is_guest } = params

  return (
    <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-xl)' }}>
        <FaCheckCircle style={{ fontSize: '4rem', color: '#4CAF50', marginBottom: 'var(--space-md)' }} />
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>Payment Successful!</h1>
        
        {is_guest === 'true' ? (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <p style={{ fontWeight: 'bold', color: 'var(--color-primary)', marginBottom: 'var(--space-sm)' }}>
              Action Required: Set Your Password
            </p>
            <p style={{ opacity: 0.8 }}>
              Check your email inbox (**including spam**) for a link to set your password. You must do this before you can log in and access your course.
            </p>
          </div>
        ) : (
          <p style={{ opacity: 0.8, marginBottom: 'var(--space-xl)' }}>
            Thank you for your purchase. Your enrollment has been processed and you can now access the course content.
          </p>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Link href="/dashboard" className="btn btn-primary">
            {is_guest === 'true' ? 'Go to Login' : 'Go to Dashboard'}
          </Link>
          <p style={{ fontSize: 'var(--font-size-xs)', opacity: 0.6 }}>
            Order ID: {session_id}
          </p>
        </div>
      </div>
    </div>
  )
}
