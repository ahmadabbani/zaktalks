import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PAGE_SIZE = 10

function decodeCursor(value) {
  if (!value || value.length > 600) return null

  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    const createdAt = new Date(cursor.createdAt)
    if (!UUID_PATTERN.test(cursor.id || '') || Number.isNaN(createdAt.getTime())) return null
    return { id: cursor.id, createdAt: createdAt.toISOString() }
  } catch {
    return null
  }
}

function encodeCursor(row) {
  if (!row?.id || !row?.created_at) return null
  return Buffer.from(JSON.stringify({ id: row.id, createdAt: row.created_at })).toString('base64url')
}

export async function GET(request) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Please sign in to view your purchase history.' }, { status: 401 })
  }

  const cursor = decodeCursor(new URL(request.url).searchParams.get('cursor'))

  try {
    let historyQuery = supabase
      .from('checkout_sessions')
      .select(`
        id,
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
        course:courses (
          title,
          slug,
          logo_url
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(PAGE_SIZE + 1)

    if (cursor) {
      historyQuery = historyQuery.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`
      )
    }

    const [{ data: rows, error: historyError }, { count, error: countError }] = await Promise.all([
      historyQuery,
      supabase
        .from('checkout_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
    ])

    if (historyError) throw historyError
    if (countError) throw countError

    const visibleRows = (rows || []).slice(0, PAGE_SIZE).map(({ coupon_id: couponId, ...row }) => ({
      ...row,
      coupon_applied: Boolean(couponId),
    }))
    const hasMore = (rows || []).length > PAGE_SIZE

    return NextResponse.json({
      rows: visibleRows,
      totalCount: Number(count || 0),
      hasMore,
      nextCursor: hasMore ? encodeCursor(visibleRows.at(-1)) : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Unable to load learner purchase history:', error)
    return NextResponse.json({ error: 'Your purchase history could not be loaded.' }, { status: 500 })
  }
}
