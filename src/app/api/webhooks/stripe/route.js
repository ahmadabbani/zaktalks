import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import {
  fulfillCheckoutSession,
  markCheckoutTerminal,
  syncPaymentAccessState,
} from '@/lib/payments/fulfillment'
import { stripe } from '@/lib/stripe'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

function webhookSecret() {
  if (process.env.NODE_ENV !== 'production') {
    return process.env.STRIPE_WEBHOOK_SECRET_LOCAL || process.env.STRIPE_WEBHOOK_SECRET
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}

function requestBaseUrl(req) {
  const origin = req.nextUrl.origin
  const local = origin.includes('localhost') || origin.includes('127.0.0.1')
  if (process.env.NODE_ENV !== 'production' && local) return origin
  return process.env.NEXT_PUBLIC_APP_URL || origin
}

function stripeObjectId(event) {
  return event.data?.object?.id || null
}

async function claimEvent(supabaseAdmin, event) {
  const now = new Date().toISOString()
  const { error: insertError } = await supabaseAdmin.from('stripe_webhook_events').insert({
    id: event.id,
    event_type: event.type,
    stripe_object_id: stripeObjectId(event),
    livemode: Boolean(event.livemode),
    processing_status: 'processing',
    attempts: 1,
    received_at: now,
    updated_at: now,
  })

  if (!insertError) return 'claimed'
  if (insertError.code !== '23505') throw new Error(`Unable to record Stripe event: ${insertError.message}`)

  const { data: existing, error: readError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .select('processing_status, attempts, updated_at')
    .eq('id', event.id)
    .single()

  if (readError) throw new Error(`Unable to read Stripe event state: ${readError.message}`)
  if (['completed', 'ignored'].includes(existing.processing_status)) return 'done'

  const recentlyClaimed = existing.processing_status === 'processing'
    && Date.now() - new Date(existing.updated_at).getTime() < 120_000
  if (recentlyClaimed) return 'busy'

  const { error: updateError } = await supabaseAdmin
    .from('stripe_webhook_events')
    .update({
      processing_status: 'processing',
      attempts: (existing.attempts || 1) + 1,
      last_error: null,
      updated_at: now,
    })
    .eq('id', event.id)

  if (updateError) throw new Error(`Unable to reclaim Stripe event: ${updateError.message}`)
  return 'claimed'
}

async function finishEvent(supabaseAdmin, eventId, status = 'completed') {
  const now = new Date().toISOString()
  const { error } = await supabaseAdmin.from('stripe_webhook_events').update({
    processing_status: status,
    processed_at: now,
    last_error: null,
    updated_at: now,
  }).eq('id', eventId)
  if (error) throw new Error(`Unable to complete Stripe event tracking: ${error.message}`)
}

async function failEvent(supabaseAdmin, eventId, error) {
  await supabaseAdmin.from('stripe_webhook_events').update({
    processing_status: 'failed',
    last_error: error.message.slice(0, 2000),
    updated_at: new Date().toISOString(),
  }).eq('id', eventId)
}

async function paymentIntentFromCharge(chargeReference) {
  const charge = typeof chargeReference === 'string'
    ? await stripe.charges.retrieve(chargeReference)
    : chargeReference
  if (typeof charge?.payment_intent === 'string') return charge.payment_intent
  return charge?.payment_intent?.id || null
}

async function processEvent(event, req) {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await fulfillCheckoutSession(event.data.object.id, { requestOrigin: requestBaseUrl(req) })
      return true

    case 'checkout.session.async_payment_failed':
      await markCheckoutTerminal(event.data.object.id, 'failed', 'Stripe reported an asynchronous payment failure')
      return true

    case 'checkout.session.expired':
      await markCheckoutTerminal(event.data.object.id, 'expired')
      return true

    case 'charge.refunded': { // Covers full and partial refunds.
      const charge = event.data.object
      const intentId = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id
      const fullyRefunded = charge.refunded || charge.amount_refunded >= charge.amount
      await syncPaymentAccessState(intentId, fullyRefunded ? 'refunded' : 'partially_refunded', fullyRefunded)
      return true
    }

    case 'charge.dispute.created': {
      const intentId = await paymentIntentFromCharge(event.data.object.charge)
      await syncPaymentAccessState(intentId, 'disputed', true)
      return true
    }

    case 'charge.dispute.closed': {
      const dispute = event.data.object
      const intentId = await paymentIntentFromCharge(dispute.charge)
      const lost = dispute.status === 'lost'
      await syncPaymentAccessState(intentId, lost ? 'dispute_lost' : 'paid', lost)
      return true
    }

    default:
      return false
  }
}

export async function POST(req) {
  const body = await req.text()
  const signature = (await headers()).get('stripe-signature')
  const secret = webhookSecret()
  let event

  try {
    if (!signature || !secret) throw new Error('The Stripe signature or webhook secret is missing')
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 })
  }

  const supabaseAdmin = await createAdminClient()
  let claimState = null

  try {
    claimState = await claimEvent(supabaseAdmin, event)
    if (claimState === 'done') return NextResponse.json({ received: true, duplicate: true })
    if (claimState === 'busy') {
      return NextResponse.json({ error: 'Stripe event is already processing' }, { status: 503 })
    }

    const handled = await processEvent(event, req)
    await finishEvent(supabaseAdmin, event.id, handled ? 'completed' : 'ignored')
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Stripe event ${event.id} (${event.type}) failed:`, error.message)
    if (claimState === 'claimed') await failEvent(supabaseAdmin, event.id, error)
    // Stripe retries verified events when application processing returns non-2xx.
    return NextResponse.json({ error: 'Stripe event processing failed' }, { status: 500 })
  }
}
