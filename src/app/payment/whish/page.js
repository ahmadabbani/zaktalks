import Link from 'next/link'
import { FaEnvelopeOpenText } from 'react-icons/fa'
import styles from '@/components/whish-checkout.module.css'

export default async function WhishConfirmationPage({searchParams}) {
  const params=await searchParams
  const sent=params.instructions==='sent'
  const setup=params.setup
  return <main className={styles.confirmation}><article>
    <FaEnvelopeOpenText aria-hidden="true"/>
    <h1>Your Whish Request Is Saved</h1>
    <p>{sent?'We sent your payment instructions by email. You will find the amount to transfer, recipient number, Whish app link, and step-by-step guidance inside.':'Your request is saved, but we could not confirm delivery of the instructions email. Please check your inbox and spam folder, or contact us for help before paying.'}</p>
    {setup==='sent'&&<p><strong>Finish setting up your account.</strong> We also sent a separate secure email to set your password. Follow that link to create your password and open your dashboard.</p>}
    {['pending','sending','failed'].includes(setup)&&<p>Your account-setup email has not been confirmed as sent. If it does not arrive, please contact us so we can send it again.</p>}
    <p>Your course access will be activated within <strong>48 hours after we receive and verify your payment.</strong> We will email you when it is ready.</p>
    <p>Need help? <a href="mailto:hello@okayness.com">hello@okayness.com</a></p>
    <Link href="/dashboard" className={styles.primary}>Go To My Dashboard</Link>
  </article></main>
}
