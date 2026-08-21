import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FaTimesCircle } from 'react-icons/fa'
import { markCheckoutTerminal } from '@/lib/payments/fulfillment'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

async function closeCheckout(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return 'unknown'

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status)) {
      return 'paid'
    }
    if (session.status === 'complete') return 'processing'
    if (session.status === 'open') await stripe.checkout.sessions.expire(session.id)

    await markCheckoutTerminal(session.id, 'expired')
    return 'cancelled'
  } catch (error) {
    console.error('Unable to close Stripe Checkout Session:', error.message)
    return 'unknown'
  }
}

export default async function PaymentCancelPage({ searchParams }) {
  const params = await searchParams
  const state = await closeCheckout(params.session_id)
  if (state === 'paid') redirect(`/payment/success?session_id=${encodeURIComponent(params.session_id)}`)

  const processing = state === 'processing'
  const message = processing
    ? 'Your payment is still processing. Please do not start another checkout; access will be added automatically if it succeeds.'
    : state === 'cancelled'
      ? 'The checkout was cancelled before payment was completed. No completed charge was found.'
      : 'The checkout is closed. If you see a completed charge, contact us with your payment receipt so we can verify it.'

  return (
    <div className="container" style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
      <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-xl)' }}>
        <FaTimesCircle style={{ fontSize: '4rem', color: 'var(--color-error)', marginBottom: 'var(--space-md)' }} />
        <h1 style={{ marginBottom: 'var(--space-sm)' }}>{processing ? 'Payment processing' : 'Checkout cancelled'}</h1>
        <p style={{ opacity: 0.8, marginBottom: 'var(--space-xl)' }}>{message}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <Link href="/" className="btn btn-primary">Back to Courses</Link>
          {processing && <Link href="/dashboard" className="btn btn-secondary">Check Dashboard</Link>}
        </div>
      </div>
    </div>
  )
}
