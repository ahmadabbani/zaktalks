import Link from 'next/link'
import { FaCheckCircle } from 'react-icons/fa'
import styles from './success.module.css'

export default async function PaymentSuccessPage({ searchParams }) {
  const params = await searchParams
  const { session_id, is_guest } = params

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <FaCheckCircle className={styles.icon} />
        </div>
        
        <h1 className={styles.title}>Payment Successful!</h1>
        
        <div className={styles.messageBox}>
          {is_guest === 'true' ? (
            <div className={styles.guestMessage}>
              <p className={styles.actionRequired}>
                Action Required: Set Your Password
              </p>
              <p className={styles.guestInstructions}>
                Check your email inbox (including spam) for a link to set your password. You must do this before you can log in and access your course.
              </p>
            </div>
          ) : (
            <p className={styles.registeredMessage}>
              Thank you for your purchase. Your enrollment has been processed and you can now access the course content.
            </p>
          )}
        </div>
        
        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.button}>
            {is_guest === 'true' ? 'Go to Login' : 'Go to Dashboard'}
          </Link>
          <p className={styles.orderId}>
            Order ID: {session_id}
          </p>
        </div>
      </div>
    </div>
  )
}
