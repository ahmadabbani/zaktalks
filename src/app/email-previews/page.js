import { notFound } from 'next/navigation'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'
import {
  buildCourseAccessEmail,
  buildPaymentReceiptEmail,
} from '@/lib/email/templates/purchase'
import styles from './email-previews.module.css'

export const dynamic = 'force-dynamic'

const SAMPLE_APP_URL = 'http://localhost:3000'

export default function EmailPreviewsPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const welcomeEmail = buildWelcomeEmail({
    firstName: 'Maya',
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })
  const paymentEmail = buildPaymentReceiptEmail({
    recipientFirstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    amountPaid: '96.00 USD',
    originalAmount: '120.00 USD',
    paymentDate: 'September 3, 2026',
    invoiceNumber: 'ZT-81A32FDC29',
    receiptUrl: `${SAMPLE_APP_URL}/dashboard?section=purchases`,
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })
  const courseAccessEmail = buildCourseAccessEmail({
    recipientFirstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    courseUrl: `${SAMPLE_APP_URL}/dashboard?section=courses`,
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })

  const previews = [
    {
      id: 'welcome',
      name: 'Welcome email',
      description: 'Sent after a normal registration is verified or after a guest successfully sets their password.',
      from: 'Okayness Team <noreply@zaktalks.com>',
      height: 820,
      ...welcomeEmail,
    },
    {
      id: 'payment-receipt',
      name: 'Successful payment email',
      description: 'Sent after Stripe payment is verified. It contains learner-safe payment details and no discount source.',
      from: 'Okayness Team <noreply@zaktalks.com>',
      height: 1390,
      ...paymentEmail,
    },
    {
      id: 'course-access',
      name: 'Course access granted email',
      description: 'Sent only after the enrollment and course access have been finalized successfully.',
      from: 'Okayness Team <noreply@zaktalks.com>',
      height: 1660,
      ...courseAccessEmail,
    },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <span>Development preview</span>
        <h1>Email designs</h1>
        <p>This local-only gallery uses the same templates sent through Resend. Sample names and links are used for previewing.</p>
      </header>

      <div className={styles.previewList}>
        {previews.map((preview) => (
          <section className={styles.previewCard} key={preview.id}>
            <div className={styles.previewHeader}>
              <div>
                <h2>{preview.name}</h2>
                <p>{preview.description}</p>
              </div>
              <dl>
                <div><dt>From</dt><dd>{preview.from}</dd></div>
                <div><dt>Subject</dt><dd>{preview.subject}</dd></div>
                <div><dt>Preview</dt><dd>{preview.previewText}</dd></div>
              </dl>
            </div>
            <div className={styles.emailCanvas}>
              <iframe
                title={`${preview.name} preview`}
                srcDoc={preview.html}
                className={styles.emailFrame}
                sandbox=""
                style={{ height: `${preview.height}px` }}
              />
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
