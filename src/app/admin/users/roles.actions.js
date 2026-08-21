'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-utils'
import { PERMISSION_KEY_SET } from '@/lib/auth/permission-registry'
import { validateNewPassword } from '@/lib/auth/password-policy'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_NAME_LENGTH = 80

function cleanName(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

function friendlyCreateError(error, roleLabel) {
  const message = String(error?.message || '')
  if (/already|registered|exists/i.test(message)) {
    return 'An account with this email already exists.'
  }
  if (/password/i.test(message)) {
    return 'The password does not meet the account security requirements.'
  }
  return `The ${roleLabel.toLowerCase()} account could not be created. Please try again.`
}

async function createPrivilegedUser(formData, role) {
  const access = await requireAdmin()

  const roleLabel = role === 'admin' ? 'Administrator' : 'Creator'

  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const firstName = cleanName(formData.get('first_name'))
  const lastName = cleanName(formData.get('last_name'))

  if (!email || !password || !firstName || !lastName) {
    return { success: false, error: 'Complete every field.' }
  }
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { success: false, error: 'Enter a valid email address.' }
  }
  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
    return { success: false, error: 'Names must be 80 characters or fewer.' }
  }
  const passwordError = validateNewPassword(password)
  if (passwordError) return { success: false, error: passwordError }

  const supabase = await createAdminClient()
  const { data: existingProfile, error: lookupError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (lookupError) {
    console.error(`Unable to check ${roleLabel.toLowerCase()} email:`, lookupError)
    return { success: false, error: 'The account could not be checked. Please try again.' }
  }
  if (existingProfile) {
    return { success: false, error: 'An account with this email already exists.' }
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
    },
  })

  if (createError || !created?.user) {
    console.error(`${roleLabel} Auth creation failed:`, createError)
    return { success: false, error: friendlyCreateError(createError, roleLabel) }
  }

  const now = new Date().toISOString()
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastName,
      role,
      email_verified: true,
      password_set: true,
      updated_at: now,
    })
    .eq('id', created.user.id)
    .select('id, email, first_name, last_name, role, email_verified, password_set, created_at')
    .single()

  if (profileError || !profile) {
    console.error(`${roleLabel} role assignment failed:`, profileError)
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(created.user.id)
    if (cleanupError) {
      console.error(`Critical: failed to remove incomplete ${roleLabel.toLowerCase()} account:`, cleanupError)
      return {
        success: false,
        error: 'The account could not be finalized. Check the server logs before retrying this email.',
      }
    }
    return { success: false, error: 'The account could not be finalized, so it was safely removed. Please retry.' }
  }

  const { error: auditError } = await supabase.from('staff_access_audit_log').insert({
    actor_user_id: access.user.id,
    action: 'account_created',
    target_role: role,
    details: { account_id: profile.id, email: profile.email },
  })
  if (auditError) console.error(`${roleLabel} creation audit failed:`, auditError)

  return {
    success: true,
    message: `${roleLabel} account created for ${email}.`,
    account: profile,
  }
}

export async function createAdminUser(formData) {
  return createPrivilegedUser(formData, 'admin')
}

export async function createCreatorUser(formData) {
  return createPrivilegedUser(formData, 'creator')
}

export async function updateCreatorPermission(permissionKey, enabled) {
  const access = await requireAdmin()
  if (!PERMISSION_KEY_SET.has(permissionKey) || typeof enabled !== 'boolean') {
    return { success: false, error: 'Invalid permission update.' }
  }

  const supabase = await createAdminClient()
  const now = new Date().toISOString()
  const updates = [{ permission_key: permissionKey, enabled, updated_by: access.user.id, updated_at: now }]
  const courseActions = ['courses.create', 'courses.edit', 'courses.content']
  if (enabled && courseActions.includes(permissionKey)) {
    updates.push({ permission_key: 'courses.view', enabled: true, updated_by: access.user.id, updated_at: now })
  }
  if (!enabled && permissionKey === 'courses.view') {
    updates.push(...courseActions.map((key) => ({ permission_key: key, enabled: false, updated_by: access.user.id, updated_at: now })))
  }

  const { data, error } = await supabase
    .from('creator_permissions')
    .upsert(updates, { onConflict: 'permission_key' })
    .select('permission_key, enabled, updated_at')

  if (error || !data?.length) {
    console.error('Creator permission update failed:', error)
    return { success: false, error: 'The permission could not be updated. Please try again.' }
  }

  const { error: auditError } = await supabase.from('staff_access_audit_log').insert({
    actor_user_id: access.user.id,
    action: enabled ? 'permission_enabled' : 'permission_disabled',
    target_role: 'creator',
    permission_key: permissionKey,
    details: { enabled, affected_permissions: updates.map((item) => item.permission_key) },
  })
  if (auditError) console.error('Creator permission audit failed:', auditError)

  return { success: true, permissions: data }
}
