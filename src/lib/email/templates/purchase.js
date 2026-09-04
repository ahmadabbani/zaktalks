const BRAND_TEAL = '#258C9B'
const BRAND_BLACK = '#212C2D'
const BRAND_YELLOW = '#F4C400'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function normalizedUrl(value) {
  const url = String(value || '').trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'there'
}

function brandMark(logoUrl) {
  const safeLogoUrl = normalizedUrl(logoUrl)
  if (safeLogoUrl) {
    return `<img src="${escapeHtml(safeLogoUrl)}" width="148" alt="Okayness" style="display:block;width:148px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">`
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td width="10" style="width:10px;padding:0;vertical-align:middle;"><span style="display:block;width:10px;height:10px;border-radius:50%;background:${BRAND_YELLOW};font-size:0;line-height:10px;">&nbsp;</span></td>
      <td style="padding-left:10px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:2.4px;line-height:1;text-transform:uppercase;">Okayness</td>
    </tr>
  </table>`
}

function actionButton(url, label) {
  const safeUrl = normalizedUrl(url)
  if (!safeUrl) return ''

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;">
    <tr>
      <td bgcolor="${BRAND_TEAL}" style="border-radius:999px;text-align:center;">
        <a href="${escapeHtml(safeUrl)}" style="display:inline-block;padding:14px 25px;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`
}

function emailFooter({ appUrl, supportEmail, notice }) {
  const safeAppUrl = normalizedUrl(appUrl)
  const safeSupportEmail = escapeHtml(supportEmail)
  const websiteLink = safeAppUrl
    ? `<a href="${escapeHtml(safeAppUrl)}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Website</a><span style="padding:0 8px;color:#A5ADAD;">&middot;</span>`
    : ''

  return `<tr>
    <td style="padding:24px 38px 28px;border-top:1px solid #E5EBEA;background:#F8FAF9;">
      <p style="margin:0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">${escapeHtml(notice)}</p>
      <p style="margin:8px 0 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">Need help? <a href="mailto:${safeSupportEmail}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${safeSupportEmail}</a></p>
      <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
        ${websiteLink}<a href="https://www.instagram.com/zak_talks/" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Instagram</a><span style="padding:0 8px;color:#A5ADAD;">&middot;</span><a href="https://www.youtube.com/@zak_talks" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">YouTube</a>
      </p>
      <p style="margin:14px 0 0;color:#98A1A1;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Okayness. All rights reserved.</p>
    </td>
  </tr>`
}

function emailDocument({ subject, previewText, body, footer, logoUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F6F5;color:${BRAND_BLACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${escapeHtml(previewText)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F6F5;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid #E5EBEA;border-radius:24px;overflow:hidden;box-shadow:0 14px 36px rgba(33,44,45,0.08);">
            <tr>
              <td style="padding:24px 38px;background:#EDF6F5;border-bottom:1px solid #DDEAE8;">
                ${brandMark(logoUrl)}
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px 38px;">
                ${body}
              </td>
            </tr>
            ${footer}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function buildPaymentReceiptEmail({
  recipientFirstName,
  courseName,
  amountPaid,
  originalAmount,
  paymentDate,
  invoiceNumber,
  receiptUrl,
  appUrl,
  supportEmail = 'hello@okayness.com',
  logoUrl = '',
}) {
  const safeFirstName = escapeHtml(firstName(recipientFirstName))
  const safeCourseName = escapeHtml(courseName || 'your course')
  const safeAmountPaid = escapeHtml(amountPaid)
  const safeOriginalAmount = escapeHtml(originalAmount)
  const safePaymentDate = escapeHtml(paymentDate)
  const safeInvoiceNumber = escapeHtml(invoiceNumber)
  const discounted = originalAmount && originalAmount !== amountPaid
  const subject = `Payment received for ${courseName || 'your course'}`
  const previewText = 'We have received your payment. Your course access will be confirmed shortly.'

  const pricingRows = `${discounted ? `<tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">Original price</td>
      <td align="right" style="padding:8px 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.5;">${safeOriginalAmount}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">Amount paid</td>
      <td align="right" style="padding:8px 0;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:800;line-height:1.5;">${safeAmountPaid}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">Payment date</td>
      <td align="right" style="padding:8px 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.5;">${safePaymentDate}</td>
    </tr>
    <tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">Invoice number</td>
      <td align="right" style="padding:8px 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.5;">${safeInvoiceNumber}</td>
    </tr>`

  const body = `${brandHeading('Payment received', safeFirstName)}
    <p style="margin:0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">We have received your payment for <strong>${safeCourseName}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:24px 0 0;padding:12px 20px;background:#F3F7F6;border:1px solid #E1E9E7;border-radius:16px;">
      ${pricingRows}
    </table>
    <p style="margin:24px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Your receipt is available here:</p>
    ${actionButton(receiptUrl, 'View your receipt')}
    <p style="margin:25px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">We are now preparing your course access. You will receive a separate email shortly confirming that your account and course are ready.</p>
    <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">If you did not make this purchase, or if anything does not look right, please contact us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${escapeHtml(supportEmail)}</a>.</p>
    <p style="margin:18px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Thank you for choosing to invest in yourself.</p>
    <p style="margin:18px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">The Okayness Team</p>`

  const html = emailDocument({
    subject,
    previewText,
    body,
    logoUrl,
    footer: emailFooter({
      appUrl,
      supportEmail,
      notice: `This is a transactional email related to your purchase. For billing or payment support, contact ${supportEmail}.`,
    }),
  })

  const originalLine = discounted ? `\nOriginal price: ${originalAmount}` : ''
  const text = `Hi ${firstName(recipientFirstName)},\n\nWe have received your payment for ${courseName || 'your course'}.\n\nPayment details:${originalLine}\nAmount paid: ${amountPaid}\nPayment date: ${paymentDate}\nInvoice number: ${invoiceNumber}\n\nView your receipt: ${receiptUrl}\n\nWe are now preparing your course access. You will receive a separate email shortly confirming that your account and course are ready.\n\nIf you did not make this purchase, or if anything does not look right, please contact us at ${supportEmail}.\n\nThank you for choosing to invest in yourself.\n\nThe Okayness Team\n\nThis is a transactional email related to your purchase. For billing or payment support, contact ${supportEmail}.`

  return { subject, previewText, html, text }
}

function brandHeading(title, safeFirstName) {
  return `<h1 style="margin:0 0 16px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.8px;line-height:1.15;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.7;">Hi ${safeFirstName},</p>`
}

export function buildCourseAccessEmail({
  recipientFirstName,
  courseName,
  courseUrl,
  appUrl,
  supportEmail = 'hello@okayness.com',
  logoUrl = '',
}) {
  const safeFirstName = escapeHtml(firstName(recipientFirstName))
  const safeCourseName = escapeHtml(courseName || 'your course')
  const subject = `You're in: your access to ${courseName || 'your course'} is ready`
  const previewText = 'Your course is available now. Start with the first lesson when you are ready.'
  const startSteps = [
    'Log in to your learner dashboard',
    `Open <strong>${safeCourseName}</strong>`,
    'Begin with the first lesson',
    'Complete the activities as you go. They are part of the work, not an extra task',
  ]

  const body = `${brandHeading('Your course is ready', safeFirstName)}
    <p style="margin:0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Your access to <strong>${safeCourseName}</strong> is now ready.</p>
    <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">This course is self-paced. You do not need to rush through it, keep up with anyone, or have everything figured out before you begin.</p>
    <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">What matters is that you show up honestly, stay curious about what you notice, and give yourself the space to apply what is useful.</p>
    <h2 style="margin:28px 0 14px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:21px;font-weight:800;line-height:1.3;">Start here</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F7F6;border:1px solid #E1E9E7;border-radius:16px;">
      ${startSteps.map((step, index) => `<tr>
        <td width="46" valign="top" style="width:46px;padding:${index === 0 ? '18px' : '8px'} 0 ${index === startSteps.length - 1 ? '18px' : '8px'} 18px;"><span style="display:inline-block;width:28px;height:28px;border-radius:50%;background:${index === 0 ? BRAND_YELLOW : BRAND_TEAL};color:${index === 0 ? BRAND_BLACK : '#FFFFFF'};font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;line-height:28px;text-align:center;">${index + 1}</span></td>
        <td valign="middle" style="padding:${index === 0 ? '18px' : '8px'} 18px ${index === startSteps.length - 1 ? '18px' : '8px'} 10px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;">${step}</td>
      </tr>`).join('')}
    </table>
    ${actionButton(courseUrl, `Start ${courseName || 'your course'}`)}
    <p style="margin:26px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">You have <strong>lifetime access</strong> to this course. You can return to the lessons, worksheets, and reflections whenever you need to revisit something with more clarity or a different perspective.</p>
    <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Your progress is based on meaningful action: completing lessons, activities, assessments, and reflections, not simply opening a page.</p>
    <p style="margin:18px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">If you need help with access, login, or playback, email us at <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${escapeHtml(supportEmail)}</a>. We aim to respond within 48 hours.</p>
    <p style="margin:18px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Start where you are.</p>
    <p style="margin:18px 0 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">The Okayness Team</p>`

  const html = emailDocument({
    subject,
    previewText,
    body,
    logoUrl,
    footer: emailFooter({
      appUrl,
      supportEmail,
      notice: 'Your course access is for one individual learner account. Please keep your login details private and do not share or redistribute course materials.',
    }),
  })

  const text = `Hi ${firstName(recipientFirstName)},\n\nYour access to ${courseName || 'your course'} is now ready.\n\nThis course is self-paced. You do not need to rush through it, keep up with anyone, or have everything figured out before you begin.\n\nWhat matters is that you show up honestly, stay curious about what you notice, and give yourself the space to apply what is useful.\n\nStart here\n1. Log in to your learner dashboard\n2. Open ${courseName || 'your course'}\n3. Begin with the first lesson\n4. Complete the activities as you go. They are part of the work, not an extra task\n\nStart ${courseName || 'your course'}: ${courseUrl}\n\nYou have lifetime access to this course. You can return to the lessons, worksheets, and reflections whenever you need to revisit something with more clarity or a different perspective.\n\nYour progress is based on meaningful action: completing lessons, activities, assessments, and reflections, not simply opening a page.\n\nIf you need help with access, login, or playback, email us at ${supportEmail}. We aim to respond within 48 hours.\n\nStart where you are.\n\nThe Okayness Team\n\nYour course access is for one individual learner account. Please keep your login details private and do not share or redistribute course materials.`

  return { subject, previewText, html, text }
}
