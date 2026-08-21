import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ACTIVITY = new Set(['all', 'active', 'completed', 'no_activity'])
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_SORTS = new Set(['activity', 'viewers', 'reach', 'completion', 'curriculum', 'duration'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

export async function GET(request) {
  try {
    await requirePermission('users.video_analytics')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const requestedCourse = url.searchParams.get('course') || ''
  const courseId = UUID_PATTERN.test(requestedCourse) ? requestedCourse : null
  const activity = allowed(url.searchParams.get('activity'), VALID_ACTIVITY, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'activity')
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_video_analytics_dashboard', {
      p_search: search || null,
      p_course_id: courseId,
      p_activity: activity,
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
      courseComparison: Array.isArray(data?.course_comparison) ? data.course_comparison : [],
      reachDistribution: data?.reach_distribution || {},
      playbackSnapshot: data?.playback_snapshot || {},
      trend: Array.isArray(data?.trend) ? data.trend : [],
      courses: Array.isArray(data?.courses) ? data.courses : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin video analytics:', error)
    return NextResponse.json({ error: 'Video analytics could not be loaded.' }, { status: 500 })
  }
}
