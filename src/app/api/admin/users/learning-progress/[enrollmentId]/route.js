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

    const modules = (Array.isArray(data.modules) ? data.modules : []).map((module) => {
      const videoLessons = (module.lessons || []).filter((lesson) => lesson.type === 'video')
      return {
        ...module,
        total_lessons: videoLessons.length,
        started_lessons: videoLessons.filter((lesson) => lesson.status === 'started' || lesson.status === 'completed').length,
        completed_lessons: videoLessons.filter((lesson) => lesson.status === 'completed').length,
      }
    })
    const overall = modules.reduce((totals, module) => ({
      ...totals,
      total_lessons: totals.total_lessons + module.total_lessons,
      started_lessons: totals.started_lessons + module.started_lessons,
      completed_lessons: totals.completed_lessons + module.completed_lessons,
    }), { ...(data.overall || {}), total_lessons: 0, started_lessons: 0, completed_lessons: 0 })

    return NextResponse.json({ ...data, overall, modules }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load admin learning progress detail:', error)
    return NextResponse.json({ error: 'Learning journey details could not be loaded.' }, { status: 500 })
  }
}
