import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_LENSES = new Set(['learner', 'assessment'])
const VALID_KINDS = new Set(['all', 'scored', 'worksheet'])
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_SORTS = new Set(['activity', 'name', 'attempts', 'score'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

export async function GET(request) {
  try {
    await requirePermission('users.assessments')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const requestedCourse = url.searchParams.get('course') || ''
  const courseId = UUID_PATTERN.test(requestedCourse) ? requestedCourse : null
  const lens = allowed(url.searchParams.get('lens'), VALID_LENSES, 'learner')
  const kind = allowed(url.searchParams.get('kind'), VALID_KINDS, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'activity')
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const [dashboardResult, activityResult] = await Promise.all([
      supabase.rpc('admin_assessment_results_dashboard', {
        p_lens: lens,
        p_search: search || null,
        p_course_id: courseId,
        p_kind: kind,
        p_range: range,
        p_sort: sort,
        p_page_size: pageSize,
        p_offset: (page - 1) * pageSize,
      }),
      supabase.rpc('admin_assessment_activity_timeline', {
        p_course_id: courseId,
        p_kind: kind,
        p_range: range,
      }),
    ])
    if (dashboardResult.error) throw dashboardResult.error
    if (activityResult.error) throw activityResult.error

    const data = dashboardResult.data
    const activity = activityResult.data || {}

    const totalCount = Number(data?.total_count || 0)
    return NextResponse.json({
      rows: Array.isArray(data?.rows) ? data.rows : [],
      summary: data?.summary || {},
      scoreDistribution: data?.score_distribution || {},
      activityTimeline: Array.isArray(activity.rows) ? activity.rows : [],
      activitySummary: activity.summary || {},
      activityBucket: activity.bucket || 'week',
      courses: Array.isArray(data?.courses) ? data.courses : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin assessment results:', error)
    return NextResponse.json({ error: 'Assessment results could not be loaded.' }, { status: 500 })
  }
}
