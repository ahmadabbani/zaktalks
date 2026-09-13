import { NextResponse } from 'next/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { CONTACT_INITIAL_VALUES, validateContactForm } from '@/lib/contactForm'
import { buildContactAdminHtml } from '@/lib/email/templates/admin-notices'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const recipient = 'hello@zaktalks.com'
const MAX_BODY_BYTES = 16 * 1024
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

const requestLedger = globalThis.__zakTalksContactLedger ?? new Map()
globalThis.__zakTalksContactLedger = requestLedger

const clean = (value) => String(value ?? '').trim()

function getAddress(request) {
  return clean(request.headers.get('x-forwarded-for')).split(',')[0]
    || clean(request.headers.get('x-real-ip'))
    || 'unknown'
}

function isRateLimited(address) {
  const now = Date.now()

  for (const [key, value] of requestLedger) {
    if (now - value.startedAt > RATE_LIMIT_WINDOW) requestLedger.delete(key)
  }

  const current = requestLedger.get(address)
  if (!current || now - current.startedAt > RATE_LIMIT_WINDOW) {
    requestLedger.set(address, { count: 1, startedAt: now })
    return false
  }

  current.count += 1
  requestLedger.set(address, current)
  return current.count > RATE_LIMIT_MAX
}

export async function POST(request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'This message is too large.' }, { status: 413 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body) || JSON.stringify(body).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'The request is invalid.' }, { status: 400 })
  }

  if (clean(body.website)) return NextResponse.json({ success: true })

  const values = Object.fromEntries(
    Object.keys(CONTACT_INITIAL_VALUES).map((key) => [key, clean(body[key])])
  )
  const validation = validateContactForm(values)

  if (!validation.isValid) {
    return NextResponse.json(
      { error: 'Please review the highlighted details.', errors: validation.errors },
      { status: 422 }
    )
  }

  if (isRateLimited(getAddress(request))) {
    return NextResponse.json(
      { error: 'Too many messages were sent. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Contact email could not send: RESEND_API_KEY is missing.')
    return NextResponse.json(
      { error: 'Email delivery is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const senderName = `${values.firstName} ${values.lastName}`.replace(/[\r\n]+/g, ' ').slice(0, 120)
  const plainText = [
    'New ZakTalks contact message',
    '',
    `Name: ${senderName}`,
    `Email: ${values.email}`,
    `Phone: ${values.phone}`,
    `How they heard about ZakTalks: ${values.source}`,
    '',
    'Message:',
    values.message,
  ].join('\n')

  try {
    const { error } = await resend.emails.send({
      from: ZAKTALKS_EMAIL_FROM,
      to: recipient,
      replyTo: values.email,
      subject: `Contact message from ${senderName}`,
      text: plainText,
      html: buildContactAdminHtml({ senderName, values, appUrl: process.env.NEXT_PUBLIC_APP_URL }),
    })

    if (error) {
      console.error('Contact Resend error:', error)
      return NextResponse.json(
        { error: 'Your message could not be sent. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact request error:', error)
    return NextResponse.json(
      { error: 'Your message could not be sent. Please try again.' },
      { status: 500 }
    )
  }
}
