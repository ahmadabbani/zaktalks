import { createClient } from '@/lib/supabase/server'

/**
 * Server-side helper to check if the current user is an admin.
 * Returns true if the user exists and has role 'admin'.
 */
export async function isAdmin() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return false

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) return false
  
  return profile.role === 'admin'
}

/**
 * Server-side helper to redirect non-admins or throw error
 */
export async function requireAdmin() {
  const isUserAdmin = await isAdmin()
  if (!isUserAdmin) {
    throw new Error('Unauthorized: Admin access required')
  }
}
