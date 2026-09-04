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

function normalizedBaseUrl(value) {
  const url = String(value || '').trim().replace(/\/$/, '')
  return /^https?:\/\//i.test(url) ? url : ''
}

export function buildWelcomeEmail({
  firstName,
  appUrl,
  supportEmail = 'hello@okayness.com',
  logoUrl = '',
}) {
  const safeName = escapeHtml(String(firstName || '').trim().split(/\s+/)[0] || 'there')
  const safeSupportEmail = escapeHtml(supportEmail)
  const safeAppUrl = normalizedBaseUrl(appUrl)
  const loginUrl = safeAppUrl ? `${safeAppUrl}/login` : ''
  const safeLogoUrl = normalizedBaseUrl(logoUrl)
  const previewText = 'Your Okayness account is ready. Welcome in.'
  const subject = 'Welcome to Okayness'

  const brandMark = safeLogoUrl
    ? `<img src="${escapeHtml(safeLogoUrl)}" width="148" alt="Okayness" style="display:block;width:148px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;">`
    : `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="10" style="width:10px;padding:0;vertical-align:middle;"><span style="display:block;width:10px;height:10px;border-radius:50%;background:${BRAND_YELLOW};font-size:0;line-height:10px;">&nbsp;</span></td>
          <td style="padding-left:10px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:800;letter-spacing:2.4px;line-height:1;text-transform:uppercase;">Okayness</td>
        </tr>
      </table>`

  const loginAction = loginUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
        <tr>
          <td bgcolor="${BRAND_TEAL}" style="border-radius:999px;text-align:center;">
            <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:14px 25px;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;">Log in to your account&nbsp;&nbsp;→</a>
          </td>
        </tr>
      </table>`
    : ''

  const websiteLink = safeAppUrl
    ? `<a href="${escapeHtml(safeAppUrl)}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Website</a><span style="padding:0 8px;color:#A5ADAD;">·</span>`
    : ''

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F6F5;color:${BRAND_BLACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${previewText}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F6F5;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid #E5EBEA;border-radius:24px;overflow:hidden;box-shadow:0 14px 36px rgba(33,44,45,0.08);">
            <tr>
              <td style="padding:24px 38px;background:#EDF6F5;border-bottom:1px solid #DDEAE8;">
                ${brandMark}
              </td>
            </tr>
            <tr>
              <td style="padding:34px 38px 36px;">
                <h1 style="margin:0 0 16px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.8px;line-height:1.15;">Welcome, ${safeName}.</h1>
                <p style="margin:0;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.7;">Your account is ready.</p>
                <p style="margin:12px 0 0;color:#596465;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;">Welcome to a space for practical learning, honest reflection, and meaningful growth. Log in whenever you’re ready to continue.</p>
                ${loginAction}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 38px 28px;border-top:1px solid #E5EBEA;background:#F8FAF9;">
                <p style="margin:0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">You’re receiving this email because you created an Okayness account.</p>
                <p style="margin:8px 0 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">Need help? <a href="mailto:${safeSupportEmail}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${safeSupportEmail}</a></p>
                <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">
                  ${websiteLink}<a href="https://www.instagram.com/zak_talks/" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">Instagram</a><span style="padding:0 8px;color:#A5ADAD;">·</span><a href="https://www.youtube.com/@zak_talks" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">YouTube</a>
                </p>
                <p style="margin:14px 0 0;color:#98A1A1;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;">© ${new Date().getFullYear()} Okayness. All rights reserved.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`

  const text = `Welcome, ${String(firstName || '').trim().split(/\s+/)[0] || 'there'}.

Your account is ready.

Welcome to a space for practical learning, honest reflection, and meaningful growth. Log in whenever you’re ready to continue.${loginUrl ? `\n\nLog in to your account: ${loginUrl}` : ''}

Need help? Contact ${supportEmail}.

You’re receiving this email because you created an Okayness account.`

  return { subject, previewText, html, text }
}
