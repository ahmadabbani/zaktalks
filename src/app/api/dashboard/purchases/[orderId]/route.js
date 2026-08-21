import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request, { params }) {
  const { orderId } = await params
  if (!UUID_PATTERN.test(orderId || '')) {
    return NextResponse.json({ error: 'This order reference is invalid.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Please sign in to view this order.' }, { status: 401 })
  }

  const { data: order, error: orderError } = await supabase
    .from('checkout_sessions')
    .select(`
      id,
      email,
      first_name,
      last_name,
      created_at,
      completed_at,
      checkout_status:status,
      payment_state,
      fulfillment_state,
      original_price_cents,
      expected_amount_cents,
      points_to_spend,
      first_purchase_discount_applied,
      coupon_id,
      refunded_at,
      account:users (
        first_name,
        last_name
      ),
      course:courses (
        title,
        slug
      )
    `)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (orderError) {
    console.error('Unable to load learner order details:', orderError)
    return NextResponse.json({ error: 'The order details could not be loaded.' }, { status: 500 })
  }

  if (!order) {
    return NextResponse.json({ error: 'This order was not found.' }, { status: 404 })
  }

  let coupon = null
  if (order.coupon_id) {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('coupons')
      .select('code, discount_type, discount_value')
      .eq('id', order.coupon_id)
      .maybeSingle()

    if (error) {
      console.error('Unable to load learner-safe coupon details:', error)
    } else if (data) {
      coupon = data
    }
  }

  const { coupon_id: _couponId, account, ...safeOrder } = order

  return NextResponse.json({
    order: {
      ...safeOrder,
      order_reference: `ZT-${order.id.replaceAll('-', '').slice(0, 10).toUpperCase()}`,
      purchaser_name: [order.first_name || account?.first_name, order.last_name || account?.last_name].filter(Boolean).join(' ') || null,
      coupon_applied: Boolean(order.coupon_id),
      coupon,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } })
}
