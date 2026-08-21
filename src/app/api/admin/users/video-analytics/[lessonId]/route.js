import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_STATUSES = new Set(['all', 'active_now', 'resume_ready', 'paused', 'completed'])
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_SORTS = new Set(['activity', 'reach', 'name', 'completed'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

function allowed(value, values, fallback) {
  return values.has(value) ? value : fallback
}

export async function GET(request, { params }) {
  try {
    await requirePermission('users.video_analytics')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lessonId } = await params
  if (!UUID_PATTERN.test(lessonId || '')) {
    return NextResponse.json({ error: 'Invalid lesson.' }, { status: 400 })
  }

  const url = new URL(request.url)
  const range = allowed(url.searchParams.get('range'), VALID_RANGES, '30')
  const status = allowed(url.searchParams.get('status'), VALID_STATUSES, 'all')
  const sort = allowed(url.searchParams.get('sort'), VALID_SORTS, 'activity')
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_video_analytics_detail', {
      p_lesson_id: lessonId,
      p_range: range,
      p_status: status,
      p_sort: sort,
      p_page_size: pageSize,
      p_offset: (page - 1) * pageSize,
    })

    if (error) throw error
    if (!data?.lesson?.lesson_id) return NextResponse.json({ error: 'Video lesson not found.' }, { status: 404 })

    const totalCount = Number(data?.total_count || 0)
    return NextResponse.json({
      lesson: data.lesson,
      summary: data.summary || {},
      rows: Array.isArray(data.rows) ? data.rows : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin video detail:', error)
    return NextResponse.json({ error: 'Video details could not be loaded.' }, { status: 500 })
  }
}
