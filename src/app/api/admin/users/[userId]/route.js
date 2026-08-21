import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request, { params }) {
  try {
    await requirePermission('users.directory')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params
  if (!UUID_PATTERN.test(userId || '')) {
    return NextResponse.json({ error: 'Invalid user identifier.' }, { status: 400 })
  }

  const adminClient = await createAdminClient()

  try {
    const [profileResult, enrollmentsResult, progressResult, authResult] = await Promise.all([
      adminClient
        .from('users')
        .select('id, email, first_name, last_name, role, points, email_verified, password_set, first_purchase_discount_used, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle(),
      adminClient
        .from('user_enrollments')
        .select('id, course_id, payment_status, completed_at, certificate_url, created_at, updated_at, course:courses(title, slug)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      adminClient
        .from('lesson_progress')
        .select('id, lesson_id, is_completed, score, attempts, started_at, completed_at, updated_at, last_accessed_at, playback_status, watch_time_seconds, last_position_seconds, max_position_reached_seconds, lesson:lessons(title, type, duration_seconds, module:course_modules(title), course:courses(title))')
        .eq('user_id', userId)
        .order('last_accessed_at', { ascending: false })
        .limit(20),
      adminClient.auth.admin.getUserById(userId),
    ])

    const error = profileResult.error || enrollmentsResult.error || progressResult.error || authResult.error
    if (error) throw error
    if (!profileResult.data) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

    return NextResponse.json({
      profile: profileResult.data,
      auth: authResult.data?.user ? {
        createdAt: authResult.data.user.created_at,
        lastSignInAt: authResult.data.user.last_sign_in_at,
        emailConfirmedAt: authResult.data.user.email_confirmed_at,
        phoneConfirmedAt: authResult.data.user.phone_confirmed_at,
        providers: (authResult.data.user.identities || []).map((identity) => identity.provider),
      } : null,
      enrollments: enrollmentsResult.data || [],
      recentProgress: progressResult.data || [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Unable to load the admin user profile:', error)
    return NextResponse.json({ error: 'The user profile could not be loaded.' }, { status: 500 })
  }
}
