import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const VALID_SEGMENTS = new Set(['all', 'registered', 'enrolled', 'admins'])
const VALID_VERIFICATION = new Set(['all', 'verified', 'pending'])
const VALID_PASSWORD = new Set(['all', 'ready', 'pending'])
const VALID_ACTIVITY = new Set(['all', 'active_7', 'active_30', 'inactive_30', 'never'])
const VALID_SORTS = new Set(['newest', 'oldest', 'name', 'points', 'activity'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function selected(value, allowed, fallback) {
  return allowed.has(value) ? value : fallback
}

function decodeCursor(value) {
  if (!value) return null
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    return cursor && typeof cursor === 'object' ? cursor : null
  } catch {
    return null
  }
}

function encodeCursor(row, sort) {
  if (!row) return null
  const cursor = { id: row.id }
  if (sort === 'name') cursor.text = row.sort_name
  else if (sort === 'points') cursor.number = row.points
  else if (sort === 'activity') cursor.timestamp = row.last_learning_activity || '-infinity'
  else cursor.timestamp = row.created_at
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function sortRows(rows, sort) {
  const direction = ['oldest', 'name'].includes(sort) ? 1 : -1
  const value = (row) => {
    if (sort === 'name') return row.sort_name || ''
    if (sort === 'points') return Number(row.points || 0)
    if (sort === 'activity') return row.last_learning_activity ? new Date(row.last_learning_activity).getTime() : -Infinity
    return new Date(row.created_at).getTime()
  }
  return [...rows].sort((left, right) => {
    const leftValue = value(left)
    const rightValue = value(right)
    if (leftValue < rightValue) return -1 * direction
    if (leftValue > rightValue) return 1 * direction
    return left.id.localeCompare(right.id) * direction
  })
}

export async function GET(request) {
  try {
    await requirePermission('users.directory')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const segment = selected(url.searchParams.get('segment'), VALID_SEGMENTS, 'all')
  const verification = selected(url.searchParams.get('verification'), VALID_VERIFICATION, 'all')
  const password = selected(url.searchParams.get('password'), VALID_PASSWORD, 'all')
  const activity = selected(url.searchParams.get('activity'), VALID_ACTIVITY, 'all')
  const sort = selected(url.searchParams.get('sort'), VALID_SORTS, 'newest')
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const cursor = decodeCursor(url.searchParams.get('cursor'))
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_user_directory', {
      p_search: search || null,
      p_segment: segment,
      p_verification: verification,
      p_password: password,
      p_activity: activity,
      p_sort: sort,
      p_page_size: pageSize,
      p_cursor_timestamp: cursor?.timestamp || null,
      p_cursor_text: cursor?.text || null,
      p_cursor_number: Number.isFinite(cursor?.number) ? cursor.number : null,
      p_cursor_id: cursor?.id || null,
    })

    if (error) throw error
    const rows = sortRows(Array.isArray(data?.rows) ? data.rows : [], sort)

    return NextResponse.json({
      rows,
      totalCount: Number(data?.total_count || 0),
      hasMore: Boolean(data?.has_more),
      nextCursor: data?.has_more ? encodeCursor(rows.at(-1), sort) : null,
      pageSize,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load the admin user directory:', error)
    return NextResponse.json({ error: 'The user directory could not be loaded.' }, { status: 500 })
  }
}
