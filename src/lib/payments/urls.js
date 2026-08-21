import 'server-only'

export function trustedAppUrl(requestOrigin) {
  const origin = typeof requestOrigin === 'string' ? requestOrigin : ''
  const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1')

  if (process.env.NODE_ENV !== 'production' && isLocal) return origin

  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (!configured) throw new Error('NEXT_PUBLIC_APP_URL is not configured')

  return new URL(configured).origin
}
