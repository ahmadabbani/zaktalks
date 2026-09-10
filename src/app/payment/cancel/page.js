import Link from 'next/link'
import { redirect } from 'next/navigation'
import { FaTimesCircle } from 'react-icons/fa'
import { markCheckoutTerminal } from '@/lib/payments/fulfillment'
import { stripe } from '@/lib/stripe'
import styles from './cancel.module.css'

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
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.iconWrapper}>
          <FaTimesCircle className={styles.icon} />
        </div>
        <h1 className={styles.title}>{processing ? 'Payment processing' : 'Checkout cancelled'}</h1>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryButton}>Back to Courses</Link>
          {processing && <Link href="/dashboard" className={styles.secondaryButton}>Check Dashboard</Link>}
        </div>
      </section>
    </main>
  )
}
