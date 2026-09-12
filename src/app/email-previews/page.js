import { notFound } from 'next/navigation'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'
import { buildPaymentReceiptEmail } from '@/lib/email/templates/purchase'
import { buildCourseInactivityEmail } from '@/lib/email/templates/course-inactivity'
import { buildPasswordSetupEmail } from '@/lib/email/templates/password-setup'
import DownloadPdfButton from './DownloadPdfButton'
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
  const passwordSetupEmail = buildPasswordSetupEmail({
    recipientName: 'Maya',
    setupUrl: `${SAMPLE_APP_URL}/auth/update-password?preview=1`,
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })
  const paymentEmail = buildPaymentReceiptEmail({
    recipientFirstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    amountPaid: '96.00 USD',
    originalAmount: '120.00 USD',
    promotionName: 'September course offer',
    promotionDiscountPercent: 12.5,
    promotionDiscountAmount: '15.00 USD',
    paymentDate: 'September 3, 2026',
    invoiceNumber: 'ZT-81A32FDC29',
    receiptUrl: `${SAMPLE_APP_URL}/dashboard?section=purchases`,
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })
  const courseInactivityEmail = buildCourseInactivityEmail({
    firstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    lastLessonName: 'Listening Beyond the Words',
    nextLessonName: 'Recognising Communication Patterns',
    progressPercentage: 42,
    resumeUrl: `${SAMPLE_APP_URL}/courses/interpersonal-communication-dynamics/player/00000000-0000-4000-8000-000000000000`,
    preferencesUrl: `${SAMPLE_APP_URL}/dashboard?section=profile`,
    appUrl: SAMPLE_APP_URL,
    supportEmail: 'hello@okayness.com',
  })

  const previews = [
    {
      id: 'password-setup',
      name: 'Guest password setup email',
      description: 'Sent after a guest purchase so the learner can securely set a password.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 1160,
      ...passwordSetupEmail,
    },
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
      description: 'Sent after Stripe payment is verified. It includes the saved course promotion when one was applied.',
      from: 'Okayness Team <noreply@zaktalks.com>',
      height: 1390,
      ...paymentEmail,
    },
    {
      id: 'course-inactivity',
      name: 'Course inactivity reminder',
      description: 'Sent once for an inactivity period while an enrolled course remains incomplete.',
      from: 'Zak from Okayness <noreply@zaktalks.com>',
      height: 1770,
      ...courseInactivityEmail,
    },
  ]

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTopline}>
          <span>Development preview</span>
          <DownloadPdfButton />
        </div>
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
