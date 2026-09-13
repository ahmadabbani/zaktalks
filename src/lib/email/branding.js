const EMAIL_LOGO_PATH = '/okayness-email-logo.png'
const DEFAULT_ORIGIN = 'https://www.zaktalks.com'

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

function escapeAttribute(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

export function emailLogoUrl(appUrl, logoUrl) {
  const explicit = safeHttpUrl(logoUrl)
  if (explicit) return explicit.href

  const origin = safeHttpUrl(appUrl) || new URL(DEFAULT_ORIGIN)
  // The website redirects its bare domain to www. Email images should use
  // the final host directly because some inbox image proxies reject redirects.
  if (origin.hostname === 'zaktalks.com') origin.hostname = 'www.zaktalks.com'
  return new URL(EMAIL_LOGO_PATH, origin.origin).href
}

export function emailBrandMark({ appUrl, logoUrl } = {}) {
  return `<img src="${escapeAttribute(emailLogoUrl(appUrl, logoUrl))}" width="110" height="118" alt="Okayness" style="display:block;width:110px;height:118px;max-width:100%;border:0;outline:none;text-decoration:none;">`
}
