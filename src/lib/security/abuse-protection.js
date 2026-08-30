import 'server-only'

import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { headers } from 'next/headers'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const TURNSTILE_DEVELOPMENT_SECRET = '1x0000000000000000000000000000000AA'

export class PublicSecurityError extends Error {
  constructor(message, status = 429, retryAfter = null) {
    super(message)
    this.name = 'PublicSecurityError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

function firstHeaderValue(value) {
  return String(value || '').split(',')[0].trim()
}

function normalizedIp(value) {
  const candidate = firstHeaderValue(value)
  return isIP(candidate) ? candidate : ''
}

export function clientIpFromRequest(request) {
  return normalizedIp(request.headers.get('cf-connecting-ip'))
    || normalizedIp(request.headers.get('x-forwarded-for'))
    || normalizedIp(request.headers.get('x-real-ip'))
    || 'unknown'
}

export async function clientIpFromServerAction() {
  const requestHeaders = await headers()
  return normalizedIp(requestHeaders.get('cf-connecting-ip'))
    || normalizedIp(requestHeaders.get('x-forwarded-for'))
    || normalizedIp(requestHeaders.get('x-real-ip'))
    || 'unknown'
}

export function normalizeSecurityEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase().slice(0, 320) : ''
}

function rateLimitSecret() {
  const secret = process.env.SECURITY_RATE_LIMIT_SECRET
    || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!secret) {
    throw new Error('A server-side security rate-limit secret is not configured')
  }

  return secret
}

function hashedKey(scope, value) {
  return createHmac('sha256', rateLimitSecret())
    .update(`${scope}:${String(value || 'unknown')}`)
    .digest('hex')
}

export async function enforceRateLimits(rules) {
  const supabaseAdmin = await createAdminClient()

  for (const rule of rules) {
    const { data, error } = await supabaseAdmin.rpc('consume_security_rate_limit', {
      p_action: rule.action,
      p_key_hash: hashedKey(rule.action, rule.value),
      p_limit: rule.limit,
      p_window_seconds: rule.windowSeconds,
    })

    if (error) {
      console.error('Security rate-limit check failed:', error.message)
      throw new PublicSecurityError(
        'This request is temporarily unavailable. Please try again shortly.',
        503,
      )
    }

    const result = Array.isArray(data) ? data[0] : data

    if (!result?.allowed) {
      throw new PublicSecurityError(
        'Too many attempts. Please wait and try again.',
        429,
        Number(result?.retry_after_seconds) || null,
      )
    }
  }
}

function turnstileSecret() {
  if (process.env.TURNSTILE_SECRET_KEY) return process.env.TURNSTILE_SECRET_KEY
  if (process.env.NODE_ENV !== 'production') return TURNSTILE_DEVELOPMENT_SECRET
  return ''
}

export function isSupabaseAuthCaptchaEnabled() {
  const value = String(process.env.SUPABASE_AUTH_CAPTCHA_ENABLED || '')
    .trim()
    .toLowerCase()

  if (!value || value === 'false') return false
  if (value === 'true') return true

  throw new Error('SUPABASE_AUTH_CAPTCHA_ENABLED must be either true or false')
}

export function requireTurnstileToken(token) {
  if (typeof token !== 'string' || !token.trim()) {
    throw new PublicSecurityError(
      'Please complete the security check and try again.',
      400,
    )
  }

  return token.trim()
}

export async function verifyTurnstileToken(token, remoteIp) {
  const secret = turnstileSecret()

  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is missing in production')
    throw new PublicSecurityError(
      'The security check is temporarily unavailable. Please try again later.',
      503,
    )
  }

  const normalizedToken = requireTurnstileToken(token)

  const body = new URLSearchParams({
    secret,
    response: normalizedToken,
  })

  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)

  let response

  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
  } catch (error) {
    console.error('Turnstile verification request failed:', error.message)
    throw new PublicSecurityError(
      'The security check could not be verified. Please try again.',
      503,
    )
  }

  if (!response.ok) {
    console.error('Turnstile verification returned HTTP', response.status)
    throw new PublicSecurityError(
      'The security check could not be verified. Please try again.',
      503,
    )
  }

  const result = await response.json()

  if (!result.success) {
    console.warn('Turnstile rejected a public form submission:', result['error-codes'] || [])
    throw new PublicSecurityError(
      'The security check expired or was unsuccessful. Please try again.',
      400,
    )
  }

  return true
}
