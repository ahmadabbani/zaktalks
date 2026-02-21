'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-utils'

/**
 * Create a new admin user account
 * - No email confirmation needed (admin is trusted)
 * - Sets role to 'admin' in public.users table
 */
export async function createAdminUser(formData) {
  // Security: only existing admins can create new admins
  await requireAdmin()

  const supabase = await createAdminClient()

  const email = formData.get('email')?.trim().toLowerCase()
  const password = formData.get('password')
  const firstName = formData.get('first_name')?.trim()
  const lastName = formData.get('last_name')?.trim()

  // Validation
  if (!email || !password || !firstName || !lastName) {
    return { success: false, error: 'All fields are required' }
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Please enter a valid email address' }
  }

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' }
  }

  // Create user via Admin API (email_confirm: true = skip confirmation)
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    }
  })

  if (createError) {
    console.error('Admin user creation error:', createError)
    return { success: false, error: createError.message }
  }

  // Set role to 'admin' in public.users table
  const { error: updateError } = await supabase
    .from('users')
    .update({ role: 'admin' })
    .eq('id', newUser.user.id)

  if (updateError) {
    console.error('Admin role update error:', updateError)
    return { success: false, error: 'Account created but failed to set admin role. Please update manually.' }
  }

  return { success: true, message: `Admin account created for ${email}` }
}
