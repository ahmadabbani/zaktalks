import { NextResponse } from 'next/server'
import { calculateAllDiscounts } from '@/lib/discount-utils'
import { fulfillCheckoutSession, markCheckoutTerminal } from '@/lib/payments/fulfillment'
import { trustedAppUrl } from '@/lib/payments/urls'
import { stripe } from '@/lib/stripe'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  clientIpFromRequest,
  enforceRateLimits,
  PublicSecurityError,
  verifyTurnstileToken,
} from '@/lib/security/abuse-protection'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CHECKOUT_LIFETIME_SECONDS = 30 * 60

class CheckoutError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

function cleanText(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, '\\$&')
}

function pointsValue(value) {
  if (value === undefined || value === null || value === '') return 0
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new CheckoutError('Invalid points amount.')
  return parsed
}

async function closePreviousCheckout({ supabaseAdmin, userId, email, requestOrigin }) {
  let query = supabaseAdmin
    .from('checkout_sessions')
    .select('id, stripe_session_id, expires_at')
    .eq('status', 'pending')
    .limit(1)

  query = userId ? query.eq('user_id', userId) : query.is('user_id', null).eq('email', email)

  const { data: rows, error } = await query
  if (error) throw new Error(`Unable to inspect an existing checkout: ${error.message}`)

  const checkout = rows?.[0]
  if (!checkout) return

  if (!checkout.stripe_session_id) {
    const { error: closeError } = await supabaseAdmin
      .from('checkout_sessions')
      .update({
        status: 'failed', payment_state: 'failed', fulfillment_state: 'not_required',
        failed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      })
      .eq('id', checkout.id)
      .eq('status', 'pending')

    if (closeError) throw new Error(`Unable to release an incomplete checkout: ${closeError.message}`)
    return
  }

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(checkout.stripe_session_id)
  } catch (stripeError) {
    if (stripeError?.code !== 'resource_missing') throw stripeError
    await markCheckoutTerminal(checkout.stripe_session_id, 'failed', 'Stripe Checkout Session no longer exists')
    return
  }

  if (session.status === 'complete' && ['paid', 'no_payment_required'].includes(session.payment_status)) {
    await fulfillCheckoutSession(session.id, { requestOrigin })
    throw new CheckoutError('This checkout was already completed. Your course access is available in the dashboard.', 409)
  }
  if (session.status === 'complete') {
    throw new CheckoutError('Your previous payment is still processing. Please wait before starting another checkout.', 409)
  }

  if (session.status === 'open') await stripe.checkout.sessions.expire(session.id)
  await markCheckoutTerminal(session.id, 'expired')
}

function stripeDescription(course, discounts) {
  if (discounts.totalDiscountCents <= 0) return undefined
  const lines = [`Original Price: $${(course.price_cents / 100).toFixed(2)}`]
  if (discounts.firstPurchase.eligible) lines.push(`First Purchase (${discounts.firstPurchase.discountPercent}%): -$${(discounts.firstPurchase.discountCents / 100).toFixed(2)}`)
  if (discounts.points.discountCents > 0) lines.push(`Points (${discounts.points.discountPercent}%): -$${(discounts.points.discountCents / 100).toFixed(2)}`)
  if (discounts.coupon.valid) lines.push(`Coupon ${discounts.coupon.couponCode}: -$${(discounts.coupon.discountCents / 100).toFixed(2)}`)
  lines.push(`Final Price: $${(discounts.finalPriceCents / 100).toFixed(2)}`)
  return lines.join(' | ').slice(0, 500)
}

export async function POST(req) {
  let checkoutId = null
  let stripeSession = null
  let supabaseAdmin = null

  try {
    const body = await req.json()
    const courseId = cleanText(body.courseId, 50)
    const firstName = cleanText(body.firstName, 100)
    const lastName = cleanText(body.lastName, 100)
    const couponCode = cleanText(body.couponCode, 100)
    const requestedPoints = pointsValue(body.pointsToUse)
    if (!UUID_PATTERN.test(courseId)) throw new CheckoutError('Invalid course.')

    const supabase = await createClient()
    supabaseAdmin = await createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    const email = cleanText(user?.email || body.email, 320).toLowerCase()
    if (!EMAIL_PATTERN.test(email)) throw new CheckoutError('Enter a valid email address.')
    if (!user && (!firstName || !lastName)) throw new CheckoutError('First and last name are required.')

    const clientIp = clientIpFromRequest(req)
    await enforceRateLimits([
      {
        action: 'checkout_prepare_ip',
        value: clientIp,
        limit: 20,
        windowSeconds: 10 * 60,
      },
      {
        action: user ? 'checkout_prepare_user' : 'checkout_prepare_email',
        value: user?.id || email,
        limit: 10,
        windowSeconds: 30 * 60,
      },
    ])

    if (!user) await verifyTurnstileToken(body.captchaToken, clientIp)

    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, slug, price_cents')
      .eq('id', courseId)
      .is('deleted_at', null)
      .single()
    if (courseError || !course) throw new CheckoutError('Course not found.', 404)

    if (user) {
      const { data: enrollment, error: enrollmentError } = await supabaseAdmin
        .from('user_enrollments').select('id')
        .eq('user_id', user.id).eq('course_id', courseId)
        .eq('payment_status', 'completed').maybeSingle()
      if (enrollmentError) throw new Error(`Unable to verify course access: ${enrollmentError.message}`)
      if (enrollment) throw new CheckoutError('You are already enrolled in this course.', 409)
    } else {
      const { data: matchingUser, error: userLookupError } = await supabaseAdmin
        .from('users').select('id').ilike('email', escapeLikePattern(email)).maybeSingle()
      if (userLookupError) throw new Error(`Unable to verify the checkout email: ${userLookupError.message}`)
      if (matchingUser) throw new CheckoutError('An account with this email already exists. Please log in to continue.', 409)
    }

    const baseUrl = trustedAppUrl(req.nextUrl.origin)
    await closePreviousCheckout({ supabaseAdmin, userId: user?.id || null, email, requestOrigin: baseUrl })

    const discounts = await calculateAllDiscounts({
      userId: user?.id || null, courseId, basePriceCents: course.price_cents,
      couponCode: couponCode || null, pointsToUse: requestedPoints,
    })
    if (couponCode && !discounts.coupon.valid) throw new CheckoutError(discounts.coupon.error || 'This coupon cannot be used.')

    const expiresAtUnix = Math.floor(Date.now() / 1000) + CHECKOUT_LIFETIME_SECONDS
    const expiresAt = new Date(expiresAtUnix * 1000).toISOString()
    const { data: orderId, error: orderError } = await supabaseAdmin.rpc('create_checkout_order', {
      p_email: email, p_first_name: user ? null : firstName, p_last_name: user ? null : lastName,
      p_course_id: courseId, p_user_id: user?.id || null,
      p_coupon_id: discounts.coupon.couponId || null,
      p_original_price_cents: course.price_cents,
      p_expected_amount_cents: discounts.finalPriceCents,
      p_points_to_spend: discounts.points.pointsToUse,
      p_first_purchase_discount_applied: discounts.firstPurchase.eligible,
      p_expires_at: expiresAt,
    })
    if (orderError || !orderId) {
      const known = /active checkout|already enrolled|no longer|does not match|account with this email/i.test(orderError?.message || '')
      throw new CheckoutError(known ? orderError.message : 'Unable to reserve this checkout. Please try again.', known ? 409 : 500)
    }
    checkoutId = orderId

    const metadata = {
      checkoutId, courseId, isGuest: String(!user), firstName: user ? '' : firstName,
      lastName: user ? '' : lastName, originalPriceCents: String(course.price_cents),
      finalPriceCents: String(discounts.finalPriceCents),
      firstPurchaseApplied: String(discounts.firstPurchase.eligible),
      pointsUsed: String(discounts.points.pointsToUse),
      couponId: discounts.coupon.couponId || '', couponCode: discounts.coupon.couponCode || '',
    }
    stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: {
        currency: 'usd',
        product_data: { name: course.title, description: stripeDescription(course, discounts) },
        unit_amount: discounts.finalPriceCents,
      }, quantity: 1 }],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      expires_at: expiresAtUnix,
      metadata,
      client_reference_id: user?.id || undefined,
      customer_email: email,
      ...(discounts.finalPriceCents > 0 && { payment_intent_data: { metadata: { checkoutId, courseId } } }),
    }, { idempotencyKey: `checkout-session-${checkoutId}` })

    const { error: attachError } = await supabaseAdmin.rpc('attach_checkout_stripe_session', {
      p_checkout_id: checkoutId,
      p_stripe_session_id: stripeSession.id,
      p_expires_at: new Date(stripeSession.expires_at * 1000).toISOString(),
    })
    if (attachError) throw new Error(`Unable to attach the Stripe session: ${attachError.message}`)

    return NextResponse.json({
      url: stripeSession.url,
      discounts: {
        originalPrice: course.price_cents, firstPurchase: discounts.firstPurchase,
        points: discounts.points, coupon: discounts.coupon,
        totalDiscount: discounts.totalDiscountCents, finalPrice: discounts.finalPriceCents,
      },
    })
  } catch (error) {
    console.error('Checkout preparation failed:', error)
    if (stripeSession?.id && stripeSession.status === 'open') {
      try { await stripe.checkout.sessions.expire(stripeSession.id) } catch (expireError) {
        console.error('Unable to expire a failed Stripe Checkout Session:', expireError.message)
      }
    }
    if (checkoutId && supabaseAdmin) {
      await supabaseAdmin.from('checkout_sessions').update({
        status: 'failed', payment_state: 'failed', fulfillment_state: 'not_required',
        failed_at: new Date().toISOString(), last_fulfillment_error: error.message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      }).eq('id', checkoutId).eq('status', 'pending')
    }
    const isPublicSecurityError = error instanceof PublicSecurityError
    const status = isPublicSecurityError
      ? error.status
      : error instanceof CheckoutError
        ? error.status
        : 500
    const message = isPublicSecurityError
      ? error.message
      : error instanceof CheckoutError
        ? error.message
        : 'Unable to start checkout. Please try again.'
    const headers = error.retryAfter
      ? { 'Retry-After': String(error.retryAfter) }
      : undefined
    return NextResponse.json({ error: message }, { status, headers })
  }
}
