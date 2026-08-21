import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request, { params }) {
  try {
    await requirePermission('users.progress')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { enrollmentId } = await params
  if (!UUID_PATTERN.test(enrollmentId || '')) {
    return NextResponse.json({ error: 'Invalid enrollment.' }, { status: 400 })
  }

  const supabase = await createAdminClient()
  try {
    const { data, error } = await supabase.rpc('admin_learning_progress_detail', {
      p_enrollment_id: enrollmentId,
    })

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Learning journey not found.' }, { status: 404 })
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin learning progress detail:', error)
    return NextResponse.json({ error: 'Learning journey details could not be loaded.' }, { status: 500 })
  }
}
