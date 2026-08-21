import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATUSES = new Set(['all', 'completed', 'pending', 'failed', 'refunded'])
const VALID_SOURCES = new Set(['all', 'guest', 'account', 'direct'])
const VALID_RANGES = new Set(['30', '90', '365', 'all'])
const VALID_SORTS = new Set(['newest', 'oldest', 'name', 'course', 'status'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

export async function GET(request) {
  try {
    await requirePermission('users.enrollments')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const status = allowed(url.searchParams.get('status'), VALID_STATUSES, 'all')
  const source = allowed(url.searchParams.get('source'), VALID_SOURCES, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '90')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'newest')
  const requestedCourse = url.searchParams.get('course') || ''
  const courseId = UUID_PATTERN.test(requestedCourse) ? requestedCourse : null
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_enrollments_dashboard', {
      p_search: search || null,
      p_status: status,
      p_course_id: courseId,
      p_source: source,
      p_range: range,
      p_sort: sort,
      p_page_size: pageSize,
      p_offset: (page - 1) * pageSize,
    })

    if (error) throw error

    const totalCount = Number(data?.total_count || 0)
    return NextResponse.json({
      rows: Array.isArray(data?.rows) ? data.rows : [],
      summary: data?.summary || {},
      trend: Array.isArray(data?.trend) ? data.trend : [],
      courseMix: Array.isArray(data?.course_mix) ? data.course_mix : [],
      courses: Array.isArray(data?.courses) ? data.courses : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin enrollments:', error)
    return NextResponse.json({ error: 'Enrollment records could not be loaded.' }, { status: 500 })
  }
}
