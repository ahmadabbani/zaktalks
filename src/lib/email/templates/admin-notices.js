import { emailBrandMark } from '@/lib/email/branding'

const escapeHtml = (value) => String(value ?? '').trim()
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const lineBreaks = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>')

function logoHeader(appUrl) {
  return `<div style="padding:20px 28px;background:#ffffff;border-bottom:1px solid #e5eaec;">${emailBrandMark({ appUrl })}</div>`
}

export function buildContactAdminHtml({ senderName, values, appUrl }) {
  return `
    <div style="margin:0;padding:28px;background:#f4f6f6;font-family:Arial,sans-serif;color:#212c2d;">
      <div style="max-width:660px;margin:0 auto;overflow:hidden;border-radius:22px;background:#ffffff;box-shadow:0 16px 45px rgba(33,44,45,.09);">
        ${logoHeader(appUrl)}
        <div style="padding:26px 28px;background:#212c2d;">
          <p style="margin:0 0 8px;color:#f2c400;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">ZakTalks Contact</p>
          <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;">New message from ${escapeHtml(senderName)}</h1>
        </div>
        <div style="padding:24px 28px 28px;">
          <p style="margin:0 0 8px;color:#657276;font-size:13px;font-weight:700;">Contact details</p>
          <p style="margin:0;color:#212c2d;font-size:14px;line-height:1.65;"><strong>Email:</strong> ${escapeHtml(values.email)}<br><strong>Phone:</strong> ${escapeHtml(values.phone)}<br><strong>Found ZakTalks through:</strong> ${escapeHtml(values.source)}</p>
          <div style="height:1px;margin:22px 0;background:#e5eaec;"></div>
          <p style="margin:0 0 8px;color:#657276;font-size:13px;font-weight:700;">Message</p>
          <div style="padding:16px 18px;border-radius:14px;background:#f4f6f6;color:#212c2d;font-size:14px;line-height:1.65;">${lineBreaks(values.message)}</div>
          <p style="margin:18px 0 0;color:#657276;font-size:12px;line-height:1.5;">Reply to this email to contact ${escapeHtml(values.firstName)} directly.</p>
        </div>
      </div>
    </div>
  `
}

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 14px;color:#657276;font-size:13px;font-weight:700;vertical-align:top;width:34%;border-bottom:1px solid #e5eaec;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;color:#212c2d;font-size:14px;line-height:1.55;border-bottom:1px solid #e5eaec;">${lineBreaks(value) || 'Not provided'}</td>
    </tr>
  `
}

export function buildEventBookingAdminHtml({ rows, contactName, appUrl }) {
  return `
    <div style="margin:0;padding:28px;background:#f4f6f6;font-family:Arial,sans-serif;color:#212c2d;">
      <div style="max-width:680px;margin:0 auto;overflow:hidden;border-radius:22px;background:#ffffff;box-shadow:0 16px 45px rgba(33,44,45,.09);">
        ${logoHeader(appUrl)}
        <div style="padding:26px 28px;background:#212c2d;">
          <p style="margin:0 0 8px;color:#f2c400;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">ZakTalks Events</p>
          <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;">New booking request</h1>
        </div>
        <div style="padding:22px 20px 26px;">
          <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5eaec;border-radius:14px;overflow:hidden;">
            <tbody>${rows.map(([label, value]) => detailRow(label, value)).join('')}</tbody>
          </table>
          <p style="margin:18px 4px 0;color:#657276;font-size:12px;line-height:1.5;">Reply to this email to contact ${escapeHtml(contactName)} directly.</p>
        </div>
      </div>
    </div>
  `
}
