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

function formatPercent(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return ''
  return Number.isInteger(parsed)
    ? String(parsed)
    : parsed.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
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
  promotionName = '',
  promotionDiscountPercent = null,
  promotionDiscountAmount = '',
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
  const promotionPercent = formatPercent(promotionDiscountPercent)
  const safePromotionName = escapeHtml(`${promotionName || 'Course promotion'}${promotionPercent ? ` (${promotionPercent}%)` : ''}`)
  const safePromotionDiscountAmount = escapeHtml(promotionDiscountAmount)
  const safePaymentDate = escapeHtml(paymentDate)
  const safeInvoiceNumber = escapeHtml(invoiceNumber)
  const discounted = originalAmount && originalAmount !== amountPaid
  const subject = `Payment received for ${courseName || 'your course'}`
  const previewText = 'We have received your payment and recorded your purchase.'

  const pricingRows = `${discounted ? `<tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">Original price</td>
      <td align="right" style="padding:8px 0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:1.5;">${safeOriginalAmount}</td>
    </tr>` : ''}
    ${promotionDiscountAmount ? `<tr>
      <td style="padding:8px 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;">${safePromotionName}</td>
      <td align="right" style="padding:8px 0;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;line-height:1.5;">-${safePromotionDiscountAmount}</td>
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
    <p style="margin:25px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.72;">Your purchase has been recorded. You can review it at any time from your learner dashboard.</p>
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
  const promotionLabel = `${promotionName || 'Course promotion'}${promotionPercent ? ` (${promotionPercent}%)` : ''}`
  const promotionLine = promotionDiscountAmount ? `\n${promotionLabel}: -${promotionDiscountAmount}` : ''
  const text = `Hi ${firstName(recipientFirstName)},\n\nWe have received your payment for ${courseName || 'your course'}.\n\nPayment details:${originalLine}${promotionLine}\nAmount paid: ${amountPaid}\nPayment date: ${paymentDate}\nInvoice number: ${invoiceNumber}\n\nView your receipt: ${receiptUrl}\n\nYour purchase has been recorded. You can review it at any time from your learner dashboard.\n\nIf you did not make this purchase, or if anything does not look right, please contact us at ${supportEmail}.\n\nThank you for choosing to invest in yourself.\n\nThe Okayness Team\n\nThis is a transactional email related to your purchase. For billing or payment support, contact ${supportEmail}.`

  return { subject, previewText, html, text }
}

function brandHeading(title, safeFirstName) {
  return `<h1 style="margin:0 0 16px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.8px;line-height:1.15;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 16px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.7;">Hi ${safeFirstName},</p>`
}
