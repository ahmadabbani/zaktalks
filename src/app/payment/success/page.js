import Link from 'next/link'
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa'
import {
  fulfillCheckoutSession,
  FulfillmentInProgressError,
} from '@/lib/payments/fulfillment'
import { stripe } from '@/lib/stripe'
import styles from './success.module.css'

export const dynamic = 'force-dynamic'

async function confirmPurchase(sessionId) {
  if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) return { status: 'invalid' }

  try {
    return await fulfillCheckoutSession(sessionId)
  } catch (error) {
    if (error instanceof FulfillmentInProgressError || error?.code === 'FULFILLMENT_IN_PROGRESS') {
      return { status: 'processing', session: error.session }
    }

    console.error('Unable to reconcile Stripe Checkout success:', error.message)

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      if (session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status)) {
        return { status: 'fulfillment_delayed', session }
      }
    } catch (verificationError) {
      console.error('Unable to verify Stripe Checkout success:', verificationError.message)
    }

    return { status: 'invalid' }
  }
}

export default async function PaymentSuccessPage({ searchParams }) {
  const params = await searchParams
  const result = await confirmPurchase(params.session_id)
  const session = result.session
  const isGuest = session?.metadata?.isGuest === 'true'
  const fulfilled = ['fulfilled', 'duplicate_no_cost'].includes(result.status)
  const duplicateRefunded = result.status === 'duplicate_refunded'
  const duplicateNoCost = result.status === 'duplicate_no_cost'
  const delayed = ['processing', 'payment_processing', 'fulfillment_delayed'].includes(result.status)

  if (result.status === 'invalid' || result.status === 'open' || result.status === 'expired') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.iconWrapper}><FaExclamationCircle className={styles.icon} /></div>
          <h1 className={styles.title}>Payment not confirmed</h1>
          <div className={styles.messageBox}>
            <p className={styles.registeredMessage}>
              We could not confirm this payment session. If your card was charged, contact us and include your payment receipt.
            </p>
          </div>
          <div className={styles.actions}><Link href="/contact" className={styles.button}>Contact support</Link></div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          {fulfilled ? <FaCheckCircle className={styles.icon} /> : <FaExclamationCircle className={styles.icon} />}
        </div>
        <h1 className={styles.title}>
          {duplicateRefunded ? 'Duplicate payment refunded' : duplicateNoCost ? 'Course already available' : delayed ? 'Payment received' : 'Payment confirmed!'}
        </h1>
        <div className={styles.messageBox}>
          {duplicateRefunded ? (
            <p className={styles.registeredMessage}>
              You already had access to this course, so the duplicate payment was refunded automatically.
            </p>
          ) : duplicateNoCost ? (
            <p className={styles.registeredMessage}>You already had access to this course. No payment was collected.</p>
          ) : delayed ? (
            isGuest ? (
              <div className={styles.guestMessage}>
                <p className={styles.actionRequired}>Your payment is confirmed</p>
                <p className={styles.guestInstructions}>
                  We are finishing your course access and account setup. Check your inbox, including spam, for your secure password-setup link shortly.
                </p>
              </div>
            ) : (
              <p className={styles.registeredMessage}>
                Your payment is confirmed. Course access is still being finalized automatically; please check your dashboard shortly.
              </p>
            )
          ) : isGuest ? (
            <div className={styles.guestMessage}>
              <p className={styles.actionRequired}>Action required: set your password</p>
              <p className={styles.guestInstructions}>
                Check your inbox, including spam, for the secure account-setup link. Set your password before logging in to access the course.
              </p>
            </div>
          ) : (
            <p className={styles.registeredMessage}>Thank you for your purchase. Your course is ready in your dashboard.</p>
          )}
        </div>
        <div className={styles.actions}>
          <Link href={isGuest ? '/login' : '/dashboard'} className={styles.button}>
            {isGuest ? 'Go to Login' : 'Go to Dashboard'}
          </Link>
          {session?.id && <p className={styles.orderId}>Order ID: {session.id}</p>}
        </div>
      </div>
    </div>
  )
}
