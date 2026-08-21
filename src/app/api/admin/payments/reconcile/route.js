import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { fulfillCheckoutSession } from '@/lib/payments/fulfillment'

export async function POST(request) {
  try {
    await requirePermission('users.purchases')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    if (!sessionId.startsWith('cs_') || sessionId.length > 255) {
      return NextResponse.json({ error: 'A valid Checkout Session ID is required.' }, { status: 400 })
    }

    const result = await fulfillCheckoutSession(sessionId, { requestOrigin: request.nextUrl.origin })
    return NextResponse.json({
      status: result.status,
      enrollmentId: result.enrollmentId || null,
      refunded: Boolean(result.refunded),
    })
  } catch (error) {
    console.error('Admin payment reconciliation failed:', error.message)
    return NextResponse.json(
      { error: 'The payment could not be reconciled. Review the server and Stripe webhook logs.' },
      { status: 500 },
    )
  }
}
