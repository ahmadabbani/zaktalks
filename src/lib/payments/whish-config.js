// Replace through deployment environment variables before enabling live transfers.
// Official guidance: https://www.whish.money/whish-app (Whish to Whish).
// No documented public recipient/amount deep link is assumed.
export const WHISH_APP_URL = 'https://www.whish.money/download'
export const WHISH_GUIDE_URL = 'https://www.whish.money/whish-app'
export const WHISH_RECIPIENT_PLACEHOLDER = '+961 XX XXX XXX'

export function whishConfiguration() {
  const number = (process.env.WHISH_RECIPIENT_NUMBER || '').trim()
  return {
    enabled: process.env.WHISH_PAYMENTS_ENABLED === 'true',
    recipientNumber: number || WHISH_RECIPIENT_PLACEHOLDER,
    ready: /^\+?[0-9][0-9\s-]{5,24}$/.test(number),
    appUrl: WHISH_APP_URL,
    guideUrl: WHISH_GUIDE_URL,
  }
}

export function whishReference(id) {
  return `WH-${String(id).replaceAll('-', '').slice(0, 12).toUpperCase()}`
}
