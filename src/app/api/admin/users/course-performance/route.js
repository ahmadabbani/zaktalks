import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const VALID_PUBLICATION = new Set(['all', 'published', 'draft'])
const VALID_HEALTH = new Set(['all', 'healthy', 'early_data', 'needs_attention', 'no_learners'])
const VALID_RANGES = new Set(['7', '30', '90', '365'])
const VALID_SORTS = new Set(['learners', 'progress', 'activity', 'completion', 'newest', 'name'])

function allowed(value, values, fallback) { return values.has(value) ? value : fallback }
function time(value) { return value ? new Date(value).getTime() : -Infinity }
function number(value) { return Number(value || 0) }

function healthStatus(course) {
  const enrolled = number(course.enrolled_learners)
  const atRisk = number(course.at_risk)
  const moduleSignal = course.module_signal

  if (enrolled === 0) return 'no_learners'
  if (enrolled < 3) return 'early_data'
  if (moduleSignal?.attention_status === 'needs_attention') return 'needs_attention'
  if (atRisk >= 2 && atRisk / enrolled >= 0.4) return 'needs_attention'
  return 'healthy'
}

function summarizeCourses(courses) {
  const totals = courses.reduce((summary, course) => ({
    published: summary.published + (course.is_published ? 1 : 0),
    enrollments: summary.enrollments + number(course.enrolled_learners),
    active_learners: summary.active_learners + number(course.active_learners),
    completed: summary.completed + number(course.completed),
    at_risk: summary.at_risk + number(course.at_risk),
    weighted_progress: summary.weighted_progress + number(course.average_progress) * number(course.enrolled_learners),
  }), { published: 0, enrollments: 0, active_learners: 0, completed: 0, at_risk: 0, weighted_progress: 0 })

  return {
    courses: courses.length,
    published: totals.published,
    enrollments: totals.enrollments,
    active_learners: totals.active_learners,
    completed: totals.completed,
    at_risk: totals.at_risk,
    average_progress: totals.enrollments
      ? Math.round(totals.weighted_progress / totals.enrollments)
      : 0,
  }
}

function sortCourses(rows, sort) {
  return [...rows].sort((left, right) => {
    let result = 0
    if (sort === 'progress') result = Number(right.average_progress || 0) - Number(left.average_progress || 0)
    else if (sort === 'activity') result = time(right.last_activity_at) - time(left.last_activity_at)
    else if (sort === 'completion') result = Number(right.completion_rate || 0) - Number(left.completion_rate || 0)
    else if (sort === 'newest') result = time(right.created_at) - time(left.created_at)
    else if (sort === 'name') result = String(left.title || '').localeCompare(String(right.title || ''), 'en', { sensitivity: 'base' })
    else result = Number(right.enrolled_learners || 0) - Number(left.enrolled_learners || 0)
    return result || String(left.title || '').localeCompare(String(right.title || ''), 'en', { sensitivity: 'base' })
  })
}

export async function GET(request) {
  try { await requirePermission('users.course_performance') } catch { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const publication = allowed(url.searchParams.get('publication'), VALID_PUBLICATION, 'all')
  const health = allowed(url.searchParams.get('health'), VALID_HEALTH, 'all')
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'learners')
  const supabase = await createAdminClient()

  try {
    const [dashboardResult, moduleSignalResult] = await Promise.all([
      supabase.rpc('admin_course_performance_dashboard', {
        p_search: search || null,
        p_publication: publication,
        p_health: 'all',
        p_range: range,
        p_sort: sort,
      }),
      supabase.rpc('admin_course_module_attention_signals', { p_range: range }),
    ])
    if (dashboardResult.error) throw dashboardResult.error
    if (moduleSignalResult.error) throw moduleSignalResult.error

    const data = dashboardResult.data
    const signalByCourse = new Map(
      (Array.isArray(moduleSignalResult.data) ? moduleSignalResult.data : [])
        .map((signal) => [signal.course_id, signal])
    )
    const courses = (Array.isArray(data?.courses) ? data.courses : [])
      .map((course) => {
        const enrichedCourse = {
          ...course,
          module_signal: signalByCourse.get(course.course_id) || null,
        }
        return { ...enrichedCourse, health_status: healthStatus(enrichedCourse) }
      })
      .filter((course) => health === 'all' || course.health_status === health)

    let enrollmentTrend = Array.isArray(data?.enrollment_trend) ? data.enrollment_trend : []
    let activityTrend = Array.isArray(data?.activity_trend) ? data.activity_trend : []

    if (health !== 'all') {
      const courseIds = courses.map((course) => course.course_id)
      if (courseIds.length) {
        const { data: trends, error: trendError } = await supabase.rpc('admin_course_performance_trends', {
          p_course_ids: courseIds,
          p_range: range,
        })
        if (trendError) throw trendError
        enrollmentTrend = Array.isArray(trends?.enrollment_trend) ? trends.enrollment_trend : []
        activityTrend = Array.isArray(trends?.activity_trend) ? trends.activity_trend : []
      } else {
        enrollmentTrend = []
        activityTrend = []
      }
    }

    return NextResponse.json({
      courses: sortCourses(courses, sort),
      summary: summarizeCourses(courses),
      enrollmentTrend,
      activityTrend,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin course performance:', error)
    return NextResponse.json({ error: 'Course performance could not be loaded.' }, { status: 500 })
  }
}
