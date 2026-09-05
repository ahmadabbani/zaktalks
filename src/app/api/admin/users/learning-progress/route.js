import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATUSES = new Set(['all', 'not_started', 'in_progress', 'completed'])
const VALID_ACTIVITY = new Set(['all', 'active', 'inactive', 'never'])
const VALID_RANGES = new Set(['7', '30', '90', '365'])
const VALID_SORTS = new Set(['activity', 'progress_high', 'progress_low', 'newest', 'name', 'course'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

function sortRows(rows, sort) {
  const timestamp = (value) => value ? new Date(value).getTime() : -Infinity
  const compareText = (left, right) => String(left || '').localeCompare(String(right || ''), 'en', { sensitivity: 'base' })
  return [...rows].sort((left, right) => {
    let result = 0
    if (sort === 'progress_high') result = Number(right.progress_percent || 0) - Number(left.progress_percent || 0)
    else if (sort === 'progress_low') result = Number(left.progress_percent || 0) - Number(right.progress_percent || 0)
    else if (sort === 'newest') result = timestamp(right.enrolled_at) - timestamp(left.enrolled_at)
    else if (sort === 'name') result = compareText(left.sort_name, right.sort_name)
    else if (sort === 'course') result = compareText(left.course_title, right.course_title)
    else result = timestamp(right.last_activity_at) - timestamp(left.last_activity_at)
    return result || String(left.enrollment_id).localeCompare(String(right.enrollment_id))
  })
}

export async function GET(request) {
  try {
    await requirePermission('users.progress')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const status = allowed(url.searchParams.get('status'), VALID_STATUSES, 'all')
  const activity = allowed(url.searchParams.get('activity'), VALID_ACTIVITY, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'activity')
  const requestedCourse = url.searchParams.get('course') || ''
  const courseId = UUID_PATTERN.test(requestedCourse) ? requestedCourse : null
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_learning_progress_dashboard', {
      p_search: search || null,
      p_course_id: courseId,
      p_progress_status: status,
      p_activity: activity,
      p_range: range,
      p_sort: sort,
      p_page_size: pageSize,
      p_offset: (page - 1) * pageSize,
    })

    if (error) throw error

    let rows = Array.isArray(data?.rows) ? data.rows : []
    const enrollmentIds = rows.map((row) => row.enrollment_id)
    const courseIds = [...new Set(rows.map((row) => row.course_id))]
    const [videoLessonsResult, videoProgressResult] = await Promise.all([
      courseIds.length
        ? supabase.from('lessons').select('id, course_id').in('course_id', courseIds).eq('type', 'video').eq('is_course_introduction', false)
        : Promise.resolve({ data: [], error: null }),
      enrollmentIds.length
        ? supabase.from('lesson_progress').select('enrollment_id, is_completed, lesson:lessons!inner(type, is_course_introduction)').in('enrollment_id', enrollmentIds).eq('lesson.type', 'video').eq('lesson.is_course_introduction', false)
        : Promise.resolve({ data: [], error: null }),
    ])
    if (videoLessonsResult.error) throw videoLessonsResult.error
    if (videoProgressResult.error) throw videoProgressResult.error

    const totalsByCourse = new Map()
    for (const lesson of videoLessonsResult.data || []) {
      totalsByCourse.set(lesson.course_id, (totalsByCourse.get(lesson.course_id) || 0) + 1)
    }
    const progressByEnrollment = new Map()
    for (const progress of videoProgressResult.data || []) {
      const counts = progressByEnrollment.get(progress.enrollment_id) || { started: 0, completed: 0 }
      counts.started += 1
      if (progress.is_completed) counts.completed += 1
      progressByEnrollment.set(progress.enrollment_id, counts)
    }
    rows = rows.map((row) => ({
      ...row,
      total_lessons: totalsByCourse.get(row.course_id) || 0,
      started_lessons: progressByEnrollment.get(row.enrollment_id)?.started || 0,
      completed_lessons: progressByEnrollment.get(row.enrollment_id)?.completed || 0,
    }))

    const totalCount = Number(data?.total_count || 0)
    return NextResponse.json({
      rows: sortRows(rows, sort),
      summary: data?.summary || {},
      trend: Array.isArray(data?.trend) ? data.trend : [],
      courseHealth: Array.isArray(data?.course_health) ? data.course_health : [],
      moduleHealth: Array.isArray(data?.module_health) ? data.module_health : [],
      courses: Array.isArray(data?.courses) ? data.courses : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin learning progress:', error)
    return NextResponse.json({ error: 'Learning progress could not be loaded.' }, { status: 500 })
  }
}
