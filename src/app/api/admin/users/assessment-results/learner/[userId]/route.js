import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_RANGES = new Set(['7', '30', '90', '365', 'all'])

export async function GET(request, { params }) {
  try {
    await requirePermission('users.assessments')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params
  if (!UUID_PATTERN.test(userId || '')) {
    return NextResponse.json({ error: 'Invalid learner.' }, { status: 400 })
  }

  const url = new URL(request.url)
  const requestedRange = url.searchParams.get('range') || '30'
  const range = VALID_RANGES.has(requestedRange) ? requestedRange : '30'
  const supabase = await createAdminClient()

  try {
    const { data, error } = await supabase.rpc('admin_assessment_learner_detail', {
      p_user_id: userId,
      p_range: range,
    })
    if (error) throw error
    if (!data?.learner?.id) return NextResponse.json({ error: 'Learner not found.' }, { status: 404 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load learner assessment history:', error)
    return NextResponse.json({ error: 'Learner assessment history could not be loaded.' }, { status: 500 })
  }
}
