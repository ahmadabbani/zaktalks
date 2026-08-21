import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])
const VALID_SORTS = new Set(['activity', 'name', 'attempts', 'score'])
const VALID_PAGE_SIZES = new Set([10, 25, 50])

export async function GET(request, { params }) {
  try {
    await requirePermission('users.assessments')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { lessonId } = await params
  if (!UUID_PATTERN.test(lessonId || '')) {
    return NextResponse.json({ error: 'Invalid assessment.' }, { status: 400 })
  }

  const url = new URL(request.url)
  const search = (url.searchParams.get('search') || '').trim().slice(0, 120)
  const requestedRange = url.searchParams.get('range') || '30'
  const range = VALID_RANGES.has(requestedRange) ? requestedRange : '30'
  const requestedSort = url.searchParams.get('sort') || 'activity'
  const sort = VALID_SORTS.has(requestedSort) ? requestedSort : 'activity'
  const requestedPage = Number.parseInt(url.searchParams.get('page') || '1', 10)
  const page = Math.min(4000, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1))
  const requestedSize = Number.parseInt(url.searchParams.get('pageSize') || '25', 10)
  const pageSize = VALID_PAGE_SIZES.has(requestedSize) ? requestedSize : 25
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_assessment_detail', {
      p_lesson_id: lessonId,
      p_range: range,
      p_search: search || null,
      p_sort: sort,
      p_page_size: pageSize,
      p_offset: (page - 1) * pageSize,
    })
    if (error) throw error
    if (!data?.assessment?.lesson_id) return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 })

    const totalCount = Number(data?.total_count || 0)
    return NextResponse.json({
      assessment: data.assessment,
      summary: data.summary || {},
      rows: Array.isArray(data.rows) ? data.rows : [],
      totalCount,
      page,
      pageSize,
      pageCount: Math.max(1, Math.ceil(totalCount / pageSize)),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load assessment learner history:', error)
    return NextResponse.json({ error: 'Assessment learner history could not be loaded.' }, { status: 500 })
  }
}
