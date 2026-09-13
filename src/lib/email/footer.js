import { escapeHtml } from '@/lib/email/action-link'

const BRAND_TEAL = '#258C9B'
const SUPPORT_EMAIL = 'hello@okayness.com'
const SOCIAL_LINKS = [
  ['Instagram', 'https://www.instagram.com/zak_talks/'],
  ['YouTube', 'https://www.youtube.com/@zak_talks'],
  ['TikTok', 'https://www.tiktok.com/@zaktalkss?_r=1&_t=ZS-98H142Tj8kS'],
]

function footerContent({ appUrl, supportEmail = SUPPORT_EMAIL, notice = '', noticeHtml = '' }) {
  const siteUrl = String(appUrl || '').trim()
  const safeSiteUrl = /^https?:\/\//i.test(siteUrl) ? siteUrl : ''
  const safeSupportEmail = escapeHtml(supportEmail)
  const links = [
    ...(safeSiteUrl ? [['Website', safeSiteUrl]] : []),
    ...SOCIAL_LINKS,
  ].map(([label, href]) =>
    `<a href="${escapeHtml(href)}" style="color:${BRAND_TEAL};text-decoration:none;font-weight:700;">${label}</a>`,
  ).join('<span style="padding:0 8px;color:#A5ADAD;">&middot;</span>')

  return `
    <p style="margin:0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">${noticeHtml || escapeHtml(notice)}</p>
    <p style="margin:8px 0 0;color:#687273;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;">Need help? <a href="mailto:${safeSupportEmail}" style="color:${BRAND_TEAL};font-weight:700;text-decoration:none;">${safeSupportEmail}</a></p>
    <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;">${links}</p>
    <p style="margin:14px 0 0;color:#98A1A1;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;">&copy; ${new Date().getFullYear()} Okayness. All rights reserved.</p>
  `
}

export function emailFooterRow(options) {
  return `<tr><td style="padding:24px 38px 28px;border-top:1px solid #E5EBEA;background:#F8FAF9;">${footerContent(options)}</td></tr>`
}

export function emailFooterBlock(options) {
  return `<div style="padding:24px 38px 28px;border-top:1px solid #E5EBEA;background:#F8FAF9;">${footerContent(options)}</div>`
}
