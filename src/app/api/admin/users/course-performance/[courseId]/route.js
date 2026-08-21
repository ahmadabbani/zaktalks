import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATUSES = new Set(['all', 'not_started', 'in_progress', 'completed', 'at_risk'])
const VALID_RANGES = new Set(['7', '30', '90', '365'])
const VALID_SORTS = new Set(['activity', 'progress_high', 'progress_low', 'enrolled', 'name', 'completed'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) { return values.has(value) ? value : fallback }
function time(value) { return value ? new Date(value).getTime() : -Infinity }

function sortLearners(rows, sort) {
  return [...rows].sort((left, right) => {
    let result = 0
    if (sort === 'progress_high') result = Number(right.progress_percent || 0) - Number(left.progress_percent || 0)
    else if (sort === 'progress_low') result = Number(left.progress_percent || 0) - Number(right.progress_percent || 0)
    else if (sort === 'enrolled') result = time(right.enrolled_at) - time(left.enrolled_at)
    else if (sort === 'name') result = String(left.sort_name || '').localeCompare(String(right.sort_name || ''), 'en', { sensitivity: 'base' })
    else if (sort === 'completed') result = time(right.last_completion_at) - time(left.last_completion_at)
    else result = time(right.last_activity_at) - time(left.last_activity_at)
    return result || String(left.enrollment_id).localeCompare(String(right.enrollment_id))
  })
}

export async function GET(request, { params }) {
  try { await requirePermission('users.course_performance') } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  const { courseId } = await params
  if (!UUID_PATTERN.test(courseId || '')) return NextResponse.json({ error: 'Invalid course.' }, { status: 400 })

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const status = allowed(url.searchParams.get('status'), VALID_STATUSES, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'activity')
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_course_performance_detail', {
      p_course_id: courseId,
      p_search: search || null,
      p_status: status,
      p_range: range,
      p_sort: sort,
      p_page_size: pageSize,
      p_offset: (page - 1) * pageSize,
    })
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Course not found.' }, { status: 404 })

    const totalCount = Number(data?.learner_total || 0)
    return NextResponse.json({
      course: data.course || {},
      summary: data.summary || {},
      curriculum: data.curriculum || {},
      modules: Array.isArray(data.modules) ? data.modules : [],
      activityCalendar: Array.isArray(data.activity_calendar) ? data.activity_calendar : [],
      completionTrend: Array.isArray(data.completion_trend) ? data.completion_trend : [],
      learners: sortLearners(Array.isArray(data.learners) ? data.learners : [], sort),
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin course performance detail:', error)
    return NextResponse.json({ error: 'Course analysis could not be loaded.' }, { status: 500 })
  }
}
