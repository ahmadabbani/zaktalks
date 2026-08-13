import { NextResponse } from 'next/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { EVENT_BOOKING_INITIAL_VALUES, validateEventBooking } from '@/lib/eventBooking'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const RATE_LIMIT_WINDOW = 15 * 60 * 1000
const RATE_LIMIT_MAX = 5
const MAX_BODY_BYTES = 24 * 1024
const recipient = 'hello@zaktalks.com'

const requestLedger = globalThis.__zakTalksEventRequestLedger ?? new Map()
globalThis.__zakTalksEventRequestLedger = requestLedger

const clean = (value) => String(value ?? '').trim()

const escapeHtml = (value) => clean(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const lineBreaks = (value) => escapeHtml(value).replace(/\r?\n/g, '<br>')

function getRequestAddress(request) {
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

function detailRow(label, value) {
  return `
    <tr>
      <td style="padding:10px 14px;color:#657276;font-size:13px;font-weight:700;vertical-align:top;width:34%;border-bottom:1px solid #e5eaec;">${escapeHtml(label)}</td>
      <td style="padding:10px 14px;color:#212c2d;font-size:14px;line-height:1.55;border-bottom:1px solid #e5eaec;">${lineBreaks(value) || 'Not provided'}</td>
    </tr>
  `
}

export async function POST(request) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'This request is too large.' }, { status: 413 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request could not be read.' }, { status: 400 })
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'The request is invalid.' }, { status: 400 })
  }

  if (JSON.stringify(body).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'This request is too large.' }, { status: 413 })
  }

  if (clean(body.website)) {
    return NextResponse.json({ success: true })
  }

  const values = Object.fromEntries(
    Object.keys(EVENT_BOOKING_INITIAL_VALUES).map((key) => [key, clean(body[key])])
  )
  const validation = validateEventBooking(values)

  if (!validation.isValid) {
    return NextResponse.json(
      { error: 'Please review the highlighted details.', errors: validation.errors },
      { status: 422 }
    )
  }

  if (isRateLimited(getRequestAddress(request))) {
    return NextResponse.json(
      { error: 'Too many requests were sent. Please wait a few minutes and try again.' },
      { status: 429 }
    )
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Event booking email could not send: RESEND_API_KEY is missing.')
    return NextResponse.json(
      { error: 'Email delivery is temporarily unavailable. Please try again later.' },
      { status: 503 }
    )
  }

  const subjectOrganisation = values.organisation.replace(/[\r\n]+/g, ' ').slice(0, 80)
  const rows = [
    ['Organisation', values.organisation],
    ['Contact person', values.contactName],
    ['Role', values.contactRole],
    ['Email', values.email],
    ['Phone', values.phone],
    ['Event date or range', values.eventDate],
    ['Delivery setting', values.delivery],
    ['Location or platform', values.location],
    ['Audience', values.audience],
    ['Expected attendance', values.attendance],
    ['Topic or desired outcome', values.topic],
    ['Preferred format', values.format],
    ['Budget range', values.budget],
    ['Additional context', values.context || 'Not provided'],
  ]

  const plainText = [
    'New ZakTalks event booking request',
    '',
    ...rows.map(([label, value]) => `${label}: ${value}`),
  ].join('\n')

  try {
    const { error } = await resend.emails.send({
      from: ZAKTALKS_EMAIL_FROM,
      to: recipient,
      replyTo: values.email,
      subject: `Event request from ${subjectOrganisation}`,
      text: plainText,
      html: `
        <div style="margin:0;padding:28px;background:#f4f6f6;font-family:Arial,sans-serif;color:#212c2d;">
          <div style="max-width:680px;margin:0 auto;overflow:hidden;border-radius:22px;background:#ffffff;box-shadow:0 16px 45px rgba(33,44,45,.09);">
            <div style="padding:26px 28px;background:#212c2d;">
              <p style="margin:0 0 8px;color:#f2c400;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">ZakTalks Events</p>
              <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.25;">New booking request</h1>
            </div>
            <div style="padding:22px 20px 26px;">
              <table role="presentation" style="width:100%;border-collapse:collapse;border:1px solid #e5eaec;border-radius:14px;overflow:hidden;">
                <tbody>${rows.map(([label, value]) => detailRow(label, value)).join('')}</tbody>
              </table>
              <p style="margin:18px 4px 0;color:#657276;font-size:12px;line-height:1.5;">Reply to this email to contact ${escapeHtml(values.contactName)} directly.</p>
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Event booking Resend error:', error)
      return NextResponse.json(
        { error: 'Your request could not be sent. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Event booking request error:', error)
    return NextResponse.json(
      { error: 'Your request could not be sent. Please try again.' },
      { status: 500 }
    )
  }
}
