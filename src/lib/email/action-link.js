export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function buildAuthCallbackUrl(searchParams = {}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL is required to build an authentication callback URL')
  }

  const callbackUrl = new URL('/auth/callback', appUrl)

  for (const [key, value] of Object.entries(searchParams)) {
    callbackUrl.searchParams.set(key, value)
  }

  return callbackUrl.toString()
}

export function secureActionLink(link, label, style = '') {
  const safeLink = escapeHtml(link)
  const safeLabel = escapeHtml(label)
  const styleAttribute = style ? ` style="${escapeHtml(style)}"` : ''

  return `<a href="${safeLink}"${styleAttribute}>${safeLabel}</a>`
}
