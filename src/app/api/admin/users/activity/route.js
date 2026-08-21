import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const DAY = 24 * 60 * 60 * 1000
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_SEGMENTS = new Set(['all', 'registered', 'enrolled', 'admins'])

function relationValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function getUserName(user) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  return name || user?.email?.split('@')[0] || 'Unnamed user'
}

export async function GET(request) {
  try {
    await requirePermission('users.overview')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const offset = Math.min(5000, Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0))
  const limit = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '7', 10) || 7))
  const range = VALID_RANGES.has(url.searchParams.get('range')) ? url.searchParams.get('range') : '30'
  const segment = VALID_SEGMENTS.has(url.searchParams.get('segment')) ? url.searchParams.get('segment') : 'all'
  const rangeStart = range === 'all' ? null : new Date(Date.now() - Number(range) * DAY).toISOString()
  const candidateLimit = Math.min(250, Math.max(40, (offset + limit + 1) * 4))
  const supabase = await createAdminClient()

  try {
    let accountQuery = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, email_verified, created_at')
      .order('created_at', { ascending: false })
      .limit(candidateLimit)
    let enrollmentQuery = supabase
      .from('user_enrollments')
      .select('id, user_id, payment_status, completed_at, created_at, course:courses(title)')
      .eq('payment_status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(candidateLimit)
    let progressQuery = supabase
      .from('lesson_progress')
      .select('id, user_id, is_completed, completed_at, updated_at, lesson:lessons(title)')
      .eq('is_completed', true)
      .order('completed_at', { ascending: false })
      .limit(candidateLimit)

    if (rangeStart) {
      accountQuery = accountQuery.gte('created_at', rangeStart)
      enrollmentQuery = enrollmentQuery.gte('completed_at', rangeStart)
      progressQuery = progressQuery.gte('completed_at', rangeStart)
    }

    const [accountsResult, enrollmentsResult, progressResult] = await Promise.all([
      accountQuery,
      enrollmentQuery,
      progressQuery,
    ])

    const queryError = accountsResult.error || enrollmentsResult.error || progressResult.error
    if (queryError) throw queryError

    const accountRows = accountsResult.data || []
    const enrollmentRows = enrollmentsResult.data || []
    const progressRows = progressResult.data || []
    const candidateUserIds = [...new Set([
      ...accountRows.map((row) => row.id),
      ...enrollmentRows.map((row) => row.user_id),
      ...progressRows.map((row) => row.user_id),
    ])]

    let profiles = accountRows
    let enrolledIds = new Set()

    if (candidateUserIds.length) {
      const [profilesResult, membershipResult] = await Promise.all([
        supabase.from('users').select('id, email, first_name, last_name, role, email_verified, created_at').in('id', candidateUserIds),
        supabase.from('user_enrollments').select('user_id').in('user_id', candidateUserIds).eq('payment_status', 'completed'),
      ])
      if (profilesResult.error || membershipResult.error) throw profilesResult.error || membershipResult.error
      profiles = profilesResult.data || []
      enrolledIds = new Set((membershipResult.data || []).map((row) => row.user_id))
    }

    const usersById = new Map(profiles.map((user) => [user.id, user]))
    const belongsToSegment = (userId) => {
      const user = usersById.get(userId)
      if (!user) return false
      if (segment === 'admins') return user.role === 'admin'
      if (segment === 'enrolled') return enrolledIds.has(userId)
      if (segment === 'registered') return user.role === 'user' && !enrolledIds.has(userId)
      return true
    }

    const activities = [
      ...accountRows.filter((user) => belongsToSegment(user.id)).map((user) => ({
        id: `user-${user.id}`,
        type: 'account',
        title: `${getUserName(user)} joined`,
        detail: user.email_verified ? 'Verified account' : 'Verification pending',
        at: user.created_at,
      })),
      ...enrollmentRows.filter((row) => belongsToSegment(row.user_id)).map((row) => ({
        id: `enrollment-${row.id}`,
        type: 'enrollment',
        title: `${getUserName(usersById.get(row.user_id))} enrolled`,
        detail: relationValue(row.course)?.title || 'Course enrollment',
        at: row.completed_at || row.created_at,
      })),
      ...progressRows.filter((row) => belongsToSegment(row.user_id)).map((row) => ({
        id: `progress-${row.id}`,
        type: 'completion',
        title: `${getUserName(usersById.get(row.user_id))} completed a lesson`,
        detail: relationValue(row.lesson)?.title || 'Lesson completed',
        at: row.completed_at || row.updated_at,
      })),
    ].filter((item) => item.at).sort((a, b) => new Date(b.at) - new Date(a.at))

    return NextResponse.json({
      activities: activities.slice(offset, offset + limit),
      hasMore: activities.length > offset + limit || accountRows.length === candidateLimit || enrollmentRows.length === candidateLimit || progressRows.length === candidateLimit,
    })
  } catch (error) {
    console.error('Unable to load additional user activity:', error)
    return NextResponse.json({ error: 'Additional activity could not be loaded.' }, { status: 500 })
  }
}
