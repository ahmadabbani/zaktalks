import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request, { params }) {
  try {
    await requirePermission('users.purchases')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { checkoutId } = await params
  if (!UUID_PATTERN.test(checkoutId || '')) {
    return NextResponse.json({ error: 'Invalid payment record.' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  try {
    const [{ data, error }, { data: promotionSnapshot, error: promotionError }] = await Promise.all([
      supabase.rpc('admin_payment_detail', { p_checkout_id: checkoutId }),
      supabase
        .from('checkout_sessions')
        .select('promotion_id, promotion_name, promotion_discount_percent, promotion_discount_cents')
        .eq('id', checkoutId)
        .maybeSingle(),
    ])

    if (error) throw error
    if (promotionError) throw promotionError

    const promotionApplied = Number(promotionSnapshot?.promotion_discount_cents) > 0
    let discountMethods = Array.isArray(data?.order?.discount_methods)
      ? data.order.discount_methods
      : []
    if (promotionApplied) {
      discountMethods = discountMethods.filter((method) => method !== 'recorded_discount')
      if (!discountMethods.includes('course_promotion')) discountMethods.push('course_promotion')
    }

    return NextResponse.json({
      order: data?.order ? {
        ...data.order,
        promotion_id: promotionSnapshot?.promotion_id || null,
        promotion_name: promotionSnapshot?.promotion_name || null,
        promotion_discount_percent: promotionSnapshot?.promotion_discount_percent === null || promotionSnapshot?.promotion_discount_percent === undefined
          ? null
          : Number(promotionSnapshot.promotion_discount_percent),
        promotion_discount_cents: Number(promotionSnapshot?.promotion_discount_cents || 0),
        discount_methods: discountMethods,
      } : null,
      webhookEvents: Array.isArray(data?.webhook_events) ? data.webhook_events : [],
      pointTransactions: Array.isArray(data?.point_transactions) ? data.point_transactions : [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error(`Unable to load payment ${checkoutId}:`, error)
    return NextResponse.json({ error: 'Payment details could not be loaded.' }, { status: 500 })
  }
}
