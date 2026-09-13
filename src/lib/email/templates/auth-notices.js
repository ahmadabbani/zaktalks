import { emailBrandMark } from '@/lib/email/branding'
import { escapeHtml } from '@/lib/email/action-link'

const BRAND_TEAL = '#258C9B'
const BRAND_BLACK = '#212C2D'

export const AUTH_EMAIL_BUTTON_STYLE = `display:inline-block;padding:14px 25px;background:${BRAND_TEAL};color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;line-height:1.2;text-decoration:none;border-radius:999px;`

function emailDocument({ subject, previewText, title, body, appUrl }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#F3F6F5;color:${BRAND_BLACK};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;line-height:1px;font-size:1px;">${escapeHtml(previewText)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#F3F6F5;">
      <tr>
        <td align="center" style="padding:36px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#FFFFFF;border:1px solid #E5EBEA;border-radius:24px;overflow:hidden;box-shadow:0 14px 36px rgba(33,44,45,0.08);">
            <tr>
              <td style="padding:24px 38px;background:#EDF6F5;border-bottom:1px solid #DDEAE8;">${emailBrandMark({ appUrl })}</td>
            </tr>
            <tr>
              <td style="padding:34px 38px 36px;font-family:Arial,Helvetica,sans-serif;">
                <h1 style="margin:0 0 16px;color:${BRAND_TEAL};font-family:Arial,Helvetica,sans-serif;font-size:34px;font-weight:800;letter-spacing:-0.8px;line-height:1.15;">${title}</h1>
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:22px 38px 26px;border-top:1px solid #E5EBEA;background:#F8FAF9;font-family:Arial,Helvetica,sans-serif;">
                <p style="margin:0;color:#687273;font-size:13px;line-height:1.65;">This is an account email from Okayness.</p>
                <p style="margin:8px 0 0;color:#687273;font-size:13px;line-height:1.65;">Need help? <a href="mailto:hello@okayness.com" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">hello@okayness.com</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export function buildConfirmationEmail({ firstName, confirmationButton, appUrl }) {
  const subject = 'Confirm your ZakTalks email'
  const previewText = 'Confirm your email address to finish setting up your account.'
  return {
    subject,
    previewText,
    html: emailDocument({
      subject,
      previewText,
      title: `Confirm your email, ${escapeHtml(firstName)}`,
      appUrl,
      body: `
        <p style="margin:0;color:${BRAND_BLACK};font-size:17px;line-height:1.7;">Please confirm your account by clicking the link below:</p>
        <p style="margin:26px 0;">${confirmationButton}</p>
        <p style="margin:0;color:#596465;font-size:15px;line-height:1.7;">This secure link is single-use. If the button does not work, request a new confirmation email.</p>
      `,
    }),
  }
}

export function buildPasswordResetEmail({ resetButton, appUrl }) {
  const subject = 'Reset your ZakTalks Password'
  const previewText = 'Use your secure link to set a new password.'
  return {
    subject,
    previewText,
    html: emailDocument({
      subject,
      previewText,
      title: 'Password Reset Request',
      appUrl,
      body: `
        <p style="margin:0;color:${BRAND_BLACK};font-size:17px;line-height:1.7;">Click the link below to set a new password:</p>
        <p style="margin:26px 0;">${resetButton}</p>
        <p style="margin:0;color:#596465;font-size:15px;line-height:1.7;">This secure link is single-use. If it has expired, request a new password reset.</p>
        <p style="margin:12px 0 0;color:#596465;font-size:15px;line-height:1.7;">If you didn't request this, please ignore this email.</p>
      `,
    }),
  }
}
