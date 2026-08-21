import UserManagementWorkspace from './UserManagementWorkspace'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { USER_MANAGEMENT_PERMISSIONS } from '@/lib/auth/permission-registry'
import { requireAdminPageAnyPermission } from '@/lib/auth/admin-page-access'

const PAGE_SIZE = 1000

async function fetchAllRows(supabase, table, columns, orderColumn) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderColumn, { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...(data || []))

    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

export default async function AdminUsersPage() {
  const access = await requireAdminPageAnyPermission(USER_MANAGEMENT_PERMISSIONS)
  const supabase = await createAdminClient()
  const canViewOverview = access.role === 'admin' || access.permissions.includes('users.overview')
  let overviewData = { users: [], enrollments: [], progress: [] }
  let creatorPermissions = []

  try {
    if (access.role === 'admin') {
      const { data, error } = await supabase
        .from('creator_permissions')
        .select('permission_key, enabled, updated_at')
        .order('permission_key')
      if (error) throw error
      creatorPermissions = data || []
    }

    if (!canViewOverview && access.role !== 'admin') {
      return <UserManagementWorkspace overviewData={overviewData} accessRole={access.role} allowedPermissions={access.permissions} creatorPermissions={creatorPermissions} />
    }

    const [users, enrollments, progress] = await Promise.all([
      fetchAllRows(
        supabase,
        'users',
        'id, email, first_name, last_name, role, points, email_verified, password_set, first_purchase_discount_used, avatar_url, created_at, updated_at',
        'created_at'
      ),
      fetchAllRows(
        supabase,
        'user_enrollments',
        'id, user_id, course_id, payment_status, completed_at, certificate_url, created_at, course:courses(title)',
        'created_at'
      ),
      fetchAllRows(
        supabase,
        'lesson_progress',
        'id, user_id, lesson_id, enrollment_id, is_completed, score, attempts, started_at, completed_at, updated_at, last_accessed_at, playback_status, watch_time_seconds, max_position_reached_seconds, lesson:lessons(title, type, course_id, duration_seconds)',
        'last_accessed_at'
      ),
    ])

    overviewData = { users, enrollments, progress }
  } catch (error) {
    console.error('Unable to load the admin user overview:', error)
    overviewData = { users: [], enrollments: [], progress: [], error: 'User analytics could not be loaded.' }
  }

  return <UserManagementWorkspace overviewData={overviewData} accessRole={access.role} allowedPermissions={access.permissions} creatorPermissions={creatorPermissions} />
}
