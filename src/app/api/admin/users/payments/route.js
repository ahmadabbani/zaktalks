import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_PAYMENTS = new Set(['all', 'paid', 'processing', 'failed', 'expired', 'refunded', 'disputed'])
const VALID_FULFILLMENT = new Set(['all', 'fulfilled', 'processing', 'attention', 'revoked', 'not_required'])
const VALID_DISCOUNTS = new Set(['all', 'discounted', 'full_price', 'coupon', 'points', 'first_purchase'])
const VALID_SORTS = new Set(['newest', 'oldest', 'amount_high', 'amount_low', 'discount_high'])
const VALID_PAGE_SIZES = new Set([10, 20, 30, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

function decodeCursor(value) {
  if (!value || value.length > 800) return null

  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    const createdAt = new Date(cursor.createdAt)
    const amount = Number(cursor.amount)

    if (!UUID_PATTERN.test(cursor.id) || Number.isNaN(createdAt.getTime()) || !Number.isSafeInteger(amount)) {
      return null
    }

    return { id: cursor.id, createdAt: createdAt.toISOString(), amount }
  } catch {
    return null
  }
}

function encodeCursor(cursor) {
  if (!cursor?.id || !cursor?.created_at || !Number.isSafeInteger(Number(cursor.amount))) return null
  return Buffer.from(JSON.stringify({
    id: cursor.id,
    createdAt: cursor.created_at,
    amount: Number(cursor.amount),
  })).toString('base64url')
}

export async function GET(request) {
  try {
    await requirePermission('users.purchases')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const requestedCourse = url.searchParams.get('course') || ''
  const courseId = UUID_PATTERN.test(requestedCourse) ? requestedCourse : null
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '90')
  const payment = allowed(url.searchParams.get('payment'), VALID_PAYMENTS, 'all')
  const fulfillment = allowed(url.searchParams.get('fulfillment'), VALID_FULFILLMENT, 'all')
  const discount = allowed(url.searchParams.get('discount'), VALID_DISCOUNTS, 'all')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'newest')
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '20', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 20
  const cursor = decodeCursor(url.searchParams.get('cursor'))
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_payments_dashboard', {
      p_course_id: courseId,
      p_range: range,
      p_payment: payment,
      p_fulfillment: fulfillment,
      p_discount: discount,
      p_sort: sort,
      p_page_size: pageSize,
      p_cursor_created_at: cursor?.createdAt || null,
      p_cursor_id: cursor?.id || null,
      p_cursor_amount: cursor?.amount ?? null,
    })

    if (error) throw error

    return NextResponse.json({
      rows: Array.isArray(data?.rows) ? data.rows : [],
      summary: data?.summary || {},
      trend: Array.isArray(data?.trend) ? data.trend : [],
      statusMix: Array.isArray(data?.status_mix) ? data.status_mix : [],
      sourceMix: Array.isArray(data?.source_mix) ? data.source_mix : [],
      discountMix: Array.isArray(data?.discount_mix) ? data.discount_mix : [],
      courses: Array.isArray(data?.courses) ? data.courses : [],
      totalCount: Number(data?.total_count || 0),
      hasMore: Boolean(data?.has_more),
      nextCursor: encodeCursor(data?.next_cursor),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin payments:', error)
    return NextResponse.json({ error: 'Payment records could not be loaded.' }, { status: 500 })
  }
}
