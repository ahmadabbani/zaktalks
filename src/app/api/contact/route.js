import { NextResponse } from 'next/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { CONTACT_INITIAL_VALUES, validateContactForm } from '@/lib/contactForm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const recipient = 'hello@zaktalks.com'
const MAX_BODY_BYTES = 16 * 1024
const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5

const requestLedger = globalThis.__zakTalksContactLedger ?? new Map()
globalThis.__zakTalksContactLedger = requestLedger

const clean = (value) => String(value ?? '').trim()

const escapeHtml = (value) => clean(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const lineBreaks = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>')

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
      html: `
        <div style="margin:0;padding:28px;background:#f4f6f6;font-family:Arial,sans-serif;color:#212c2d;">
          <div style="max-width:660px;margin:0 auto;overflow:hidden;border-radius:22px;background:#ffffff;box-shadow:0 16px 45px rgba(33,44,45,.09);">
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
      `,
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

