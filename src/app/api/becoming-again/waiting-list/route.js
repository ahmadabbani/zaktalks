import { NextResponse } from 'next/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { WAITING_LIST_INITIAL_VALUES, validateWaitingList } from '@/lib/becomingAgainWaitingList'
import { buildWaitingListAdminHtml } from '@/lib/email/templates/admin-notices'
import {
  clientIpFromRequest,
  enforceRateLimits,
  normalizeSecurityEmail,
  PublicSecurityError,
  verifyTurnstileToken,
} from '@/lib/security/abuse-protection'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 24 * 1024
const RECIPIENT = 'hello@zaktalks.com'

function errorResponse(error) {
  if (error instanceof PublicSecurityError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status, headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {} },
    )
  }
  console.error('Becoming Again waiting-list protection failed:', error)
  return NextResponse.json({ error: 'The request is temporarily unavailable. Please try again.' }, { status: 503 })
}

export async function POST(request) {
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY_BYTES) {
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
  if (new TextEncoder().encode(JSON.stringify(body)).length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'This request is too large.' }, { status: 413 })
  }
  if (String(body.website ?? '').trim()) return NextResponse.json({ success: true })

  const values = Object.fromEntries(Object.keys(WAITING_LIST_INITIAL_VALUES).map((name) => [name,
    name === 'themes' ? (body[name] === undefined ? [] : body[name])
      : name === 'waitingListAcknowledged' || name === 'contactConsent' ? body[name] === true
        : typeof body[name] === 'string' ? body[name].trim() : '',
  ]))
  const validation = validateWaitingList(values)
  if (!validation.isValid) {
    return NextResponse.json({ error: 'Please review the highlighted fields.', errors: validation.errors }, { status: 422 })
  }

  try {
    const ip = clientIpFromRequest(request)
    await enforceRateLimits([
      { action: 'becoming_again_waiting_list_ip', value: ip, limit: 5, windowSeconds: 15 * 60 },
      { action: 'becoming_again_waiting_list_email', value: normalizeSecurityEmail(values.email), limit: 4, windowSeconds: 24 * 60 * 60 },
    ])
    await verifyTurnstileToken(body.captchaToken, ip)
  } catch (error) {
    return errorResponse(error)
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('Waiting-list email could not send: RESEND_API_KEY is missing.')
    return NextResponse.json({ error: 'Email delivery is temporarily unavailable. Please try again later.' }, { status: 503 })
  }

  const safeName = values.fullName.replace(/[\r\n]+/g, ' ').slice(0, 120)
  const text = [
    'New Becoming Again Program waiting-list request', '',
    `Full name: ${values.fullName}`,
    `Email address: ${values.email}`,
    `Mobile / WhatsApp number: ${values.phone}`,
    `Currently based: ${values.location}`,
    `Current role: ${values.role}`,
    `Availability for biweekly sessions: ${values.commitment}`,
    `Preferred participation: ${values.participation}`,
    `Waiting-list acknowledgement: ${values.waitingListAcknowledged ? 'Confirmed' : 'Not confirmed'}`,
    `Contact consent: ${values.contactConsent ? 'Confirmed' : 'Not confirmed'}`,
    `Relevant themes: ${values.themes.length ? values.themes.join(', ') : 'Not selected'}`,
    `How they heard about the program: ${values.source || 'Not provided'}`,
    '', 'Why they are interested:', values.interest,
    '', 'What they hope to gain:', values.goal,
    '', 'Anything else for Zak:', values.additionalNotes || 'Not provided',
    '', 'Public form submission; the applicant email has not been verified.',
  ].join('\n')

  try {
    const { error } = await resend.emails.send({
      from: ZAKTALKS_EMAIL_FROM,
      to: RECIPIENT,
      replyTo: values.email,
      subject: `Becoming Again waiting list: ${safeName}`,
      text,
      html: buildWaitingListAdminHtml({ values, appUrl: process.env.NEXT_PUBLIC_APP_URL }),
    })
    if (error) {
      console.error('Waiting-list Resend error:', error)
      return NextResponse.json({ error: 'Your request could not be sent. Please try again.' }, { status: 502 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Waiting-list email request failed:', error)
    return NextResponse.json({ error: 'Your request could not be sent. Please try again.' }, { status: 500 })
  }
}
