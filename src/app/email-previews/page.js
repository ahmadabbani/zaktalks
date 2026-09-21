import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { buildWelcomeEmail } from '@/lib/email/templates/welcome'
import { buildWhishEmail } from '@/lib/email/templates/whish'
import { buildPaymentReceiptEmail } from '@/lib/email/templates/purchase'
import { buildCourseInactivityEmail } from '@/lib/email/templates/course-inactivity'
import { buildPasswordSetupEmail } from '@/lib/email/templates/password-setup'
import { AUTH_EMAIL_BUTTON_STYLE, buildConfirmationEmail, buildPasswordResetEmail } from '@/lib/email/templates/auth-notices'
import { buildContactAdminHtml, buildEventBookingAdminHtml, buildWaitingListAdminHtml } from '@/lib/email/templates/admin-notices'
import { secureActionLink } from '@/lib/email/action-link'
import { emailLogoUrl } from '@/lib/email/branding'
import { buildFulfillmentNoticePreview } from '@/lib/payments/fulfillment-emails'
import DownloadPdfButton from './DownloadPdfButton'
import styles from './email-previews.module.css'

export const dynamic = 'force-dynamic'

export default async function EmailPreviewsPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const requestHeaders = await headers()
  const sampleAppUrl = `http://${requestHeaders.get('host') || 'localhost:3000'}`
  const whishSample = {
    id: '00000000-0000-4000-8000-000000000001', first_name: 'Maya', course_title: 'Interpersonal Communication Dynamics',
    phone: '+961 XX XXX XXX', recipient_number: '+961 XX XXX XXX', original_price_cents: 20000,
    quoted_amount_cents: 15300, amount_received_cents: 15300, transfer_reference: 'SAMPLE-TRANSFER',
    points_to_spend: 0, discounts: { promotion: { applied: true, name: 'Course promotion', discountCents: 3000 }, firstPurchase: { eligible: true, discountCents: 1700 } },
  }

  const welcomeEmail = buildWelcomeEmail({
    firstName: 'Maya',
    appUrl: sampleAppUrl,
    supportEmail: 'hello@okayness.com',
  })
  const passwordSetupEmail = buildPasswordSetupEmail({
    recipientName: 'Maya',
    setupUrl: `${sampleAppUrl}/auth/update-password?preview=1`,
    appUrl: sampleAppUrl,
    supportEmail: 'hello@okayness.com',
  })
  const paymentEmail = buildPaymentReceiptEmail({
    recipientFirstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    amountPaid: '105.00 USD',
    originalAmount: '120.00 USD',
    promotionName: 'September course offer',
    promotionDiscountPercent: 12.5,
    promotionDiscountAmount: '15.00 USD',
    paymentDate: 'September 3, 2026',
    invoiceNumber: 'ZT-81A32FDC29',
    receiptUrl: `${sampleAppUrl}/dashboard?section=purchases`,
    appUrl: sampleAppUrl,
    supportEmail: 'hello@okayness.com',
  })
  const courseInactivityEmail = buildCourseInactivityEmail({
    firstName: 'Maya',
    courseName: 'Interpersonal Communication Dynamics',
    lastLessonName: 'Listening Beyond the Words',
    nextLessonName: 'Recognising Communication Patterns',
    progressPercentage: 42,
    resumeUrl: `${sampleAppUrl}/courses/interpersonal-communication-dynamics/player/00000000-0000-4000-8000-000000000000`,
    preferencesUrl: `${sampleAppUrl}/dashboard?section=profile`,
    appUrl: sampleAppUrl,
    supportEmail: 'hello@okayness.com',
  })
  const confirmationEmail = buildConfirmationEmail({
    firstName: 'Maya',
    confirmationButton: secureActionLink(`${sampleAppUrl}/auth/callback?preview=1`, 'Confirm Email', AUTH_EMAIL_BUTTON_STYLE),
    appUrl: sampleAppUrl,
  })
  const passwordResetEmail = buildPasswordResetEmail({
    resetButton: secureActionLink(`${sampleAppUrl}/auth/update-password?preview=1`, 'Reset Password', AUTH_EMAIL_BUTTON_STYLE),
    appUrl: sampleAppUrl,
  })
  const sampleCheckout = {
    id: '00000000-0000-4000-8000-000000000001',
    stripe_session_id: 'cs_sample_course_purchase',
    first_name: 'Maya',
    last_name: 'Nassar',
    email: 'maya@example.com',
    course_id: '00000000-0000-4000-8000-000000000002',
    course: { title: 'Interpersonal Communication Dynamics' },
    expected_amount_cents: 9600,
    enrollment_id: '00000000-0000-4000-8000-000000000003',
  }
  const fulfillmentPreview = (type) => {
    const message = buildFulfillmentNoticePreview(type, sampleCheckout)
    return {
      ...message,
      html: message.html.replaceAll(
        emailLogoUrl(process.env.NEXT_PUBLIC_APP_URL),
        emailLogoUrl(sampleAppUrl),
      ),
    }
  }
  const contactAdminHtml = buildContactAdminHtml({
    senderName: 'Maya Nassar',
    values: {
      firstName: 'Maya',
      email: 'maya@example.com',
      phone: '+961 70 123 456',
      source: 'A friend',
      message: 'I would like to learn more about your courses.',
    },
    appUrl: sampleAppUrl,
  })
  const eventAdminHtml = buildEventBookingAdminHtml({
    contactName: 'Maya Nassar',
    rows: [
      ['Organisation', 'Sample organisation'],
      ['Contact person', 'Maya Nassar'],
      ['Email', 'maya@example.com'],
      ['Event date or range', 'October 2026'],
      ['Delivery setting', 'In person'],
      ['Topic or desired outcome', 'A practical communication workshop'],
    ],
    appUrl: sampleAppUrl,
  })
  const waitingListAdminHtml = buildWaitingListAdminHtml({
    values: {
      fullName: 'Maya Nassar',
      email: 'maya@example.com',
      phone: '+961 70 123 456',
      location: 'Lebanon',
      role: 'Professional in transition',
      interest: 'I am ready to understand my patterns more clearly and approach this next chapter with intention.',
      goal: 'I would like to feel more grounded in my decisions and build healthier ways of relating.',
      commitment: 'Yes, I am ready to make the time',
      participation: 'Hybrid: online and in-person',
      waitingListAcknowledged: true,
      themes: ['Self-awareness and identity', 'Communication and relationships'],
      source: 'Instagram',
      contactConsent: true,
      additionalNotes: 'I would love to hear more about the next cohort schedule.',
    },
    appUrl: sampleAppUrl,
  })

  const previews = [
    ...['instructions', 'password', 'approved'].map(kind => ({
      id: `whish-${kind}`, name: kind === 'instructions' ? 'Whish payment instructions' : kind === 'password' ? 'Whish account setup' : 'Whish payment approved',
      description: kind === 'approved' ? 'Sent after an administrator verifies the transfer and grants access.' : 'Sent after a Whish payment request is saved.',
      from: 'Okayness Team <noreply@zaktalks.com>', height: kind === 'instructions' ? 1500 : 1000,
      ...buildWhishEmail({kind,order:whishSample,appUrl:sampleAppUrl,setupUrl:`${sampleAppUrl}/auth/update-password?preview=1`}),
    })),
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
    {
      id: 'email-confirmation',
      name: 'Account email confirmation',
      description: 'Sent when a new account needs its email address confirmed.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 690,
      ...confirmationEmail,
    },
    {
      id: 'password-reset',
      name: 'Password reset',
      description: 'Sent after a password reset is requested.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 690,
      ...passwordResetEmail,
    },
    {
      id: 'access-delay',
      name: 'Course access delay',
      description: 'Sent only if payment succeeded but access fulfillment is taking longer than expected.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 850,
      ...fulfillmentPreview('customer_failure'),
    },
    {
      id: 'access-recovery',
      name: 'Course access recovered',
      description: 'Sent if delayed course access is subsequently granted.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 740,
      ...fulfillmentPreview('customer_recovery'),
    },
    {
      id: 'access-delay-admin',
      name: 'Admin access alert',
      description: 'Sent to the admin if a paid order requires access reconciliation.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 900,
      ...fulfillmentPreview('admin_failure'),
    },
    {
      id: 'access-recovery-admin',
      name: 'Admin access recovery',
      description: 'Sent to the admin when delayed fulfillment is resolved.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      height: 770,
      ...fulfillmentPreview('admin_recovery'),
    },
    {
      id: 'contact-admin',
      name: 'Contact form notification',
      description: 'Sent to the team when someone submits the public contact form.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      subject: 'Contact message from Maya Nassar',
      height: 750,
      html: contactAdminHtml,
    },
    {
      id: 'event-admin',
      name: 'Event booking notification',
      description: 'Sent to the team when someone submits an event request.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      subject: 'Event request from Sample organisation',
      height: 800,
      html: eventAdminHtml,
    },
    {
      id: 'becoming-again-waiting-list',
      name: 'Becoming Again waiting-list request',
      description: 'Sent to the team when someone joins the public waiting list.',
      from: 'ZakTalks <noreply@zaktalks.com>',
      subject: 'Becoming Again waiting list: Maya Nassar',
      height: 1450,
      html: waitingListAdminHtml,
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
                <div><dt>Preview</dt><dd>{preview.previewText || 'Not set'}</dd></div>
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
