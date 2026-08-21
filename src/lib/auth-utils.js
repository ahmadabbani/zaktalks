import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { PERMISSION_KEY_SET, PERMISSION_KEYS } from '@/lib/auth/permission-registry'

export class AccessDeniedError extends Error {
  constructor(message = 'You do not have permission to access this area.') {
    super(message)
    this.name = 'AccessDeniedError'
  }
}

export async function getAccessContext() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, profile: null, role: null, permissions: [] }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return { user, profile: null, role: null, permissions: [] }
  if (profile.role === 'admin') return { user, profile, role: 'admin', permissions: [...PERMISSION_KEYS] }
  if (profile.role !== 'creator') return { user, profile, role: profile.role, permissions: [] }

  const admin = await createAdminClient()
  const { data, error } = await admin
    .from('creator_permissions')
    .select('permission_key')
    .eq('enabled', true)

  if (error) {
    console.error('Unable to load creator permissions:', error)
    return { user, profile, role: 'creator', permissions: [] }
  }

  return {
    user,
    profile,
    role: 'creator',
    permissions: (data || []).map((row) => row.permission_key).filter((key) => PERMISSION_KEY_SET.has(key)),
  }
}

/**
 * Server-side helper to check if the current user is an admin.
 * Returns true if the user exists and has role 'admin'.
 */
export async function isAdmin() {
  const access = await getAccessContext()
  return access.role === 'admin'
}

/**
 * Server-side helper to redirect non-admins or throw error
 */
export async function requireAdmin() {
  const access = await getAccessContext()
  if (access.role !== 'admin') throw new AccessDeniedError('Administrator access is required.')
  return access
}

export async function requireStaff() {
  const access = await getAccessContext()
  if (access.role !== 'admin' && access.role !== 'creator') throw new AccessDeniedError('Staff access is required.')
  return access
}

export async function requirePermission(permissionKey) {
  if (!PERMISSION_KEY_SET.has(permissionKey)) throw new Error(`Unknown permission: ${permissionKey}`)
  const access = await getAccessContext()
  if (access.role === 'admin' || (access.role === 'creator' && access.permissions.includes(permissionKey))) return access
  throw new AccessDeniedError()
}

export async function requireAnyPermission(permissionKeys) {
  if (!Array.isArray(permissionKeys) || !permissionKeys.length || permissionKeys.some((key) => !PERMISSION_KEY_SET.has(key))) {
    throw new Error('A valid permission list is required.')
  }
  const access = await getAccessContext()
  if (access.role === 'admin' || (access.role === 'creator' && permissionKeys.some((key) => access.permissions.includes(key)))) return access
  throw new AccessDeniedError()
}
