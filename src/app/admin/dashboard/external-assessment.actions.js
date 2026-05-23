'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth-utils'
import { getAssessmentById } from '@/assessments/registry'

function createToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export async function generateExternalAssessmentLink(formData) {
  await requireAdmin()

  const assessmentKey = formData.get('assessment_key')?.trim()
  const definition = getAssessmentById(assessmentKey)

  if (!definition || definition.externalOnly !== true) {
    return { success: false, error: 'Please select a valid assessment.' }
  }

  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const token = createToken()

  const { data, error } = await adminSupabase
    .from('external_assessment_links')
    .insert({
      assessment_key: assessmentKey,
      token,
      created_by: user.id,
      expires_at: expiresAt
    })
    .select('id, assessment_key, token, created_at, expires_at, revoked_at')
    .single()

  if (error) {
    console.error('External assessment link creation error:', error)
    return { success: false, error: 'Could not generate link. Make sure the Supabase SQL was run.' }
  }

  revalidatePath('/admin/dashboard')

  return {
    success: true,
    link: {
      ...data,
      path: `/assessments/external/${data.token}`
    }
  }
}

export async function revokeExternalAssessmentLink(linkId) {
  await requireAdmin()

  const adminSupabase = await createAdminClient()

  const { error } = await adminSupabase
    .from('external_assessment_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    console.error('External assessment link delete error:', error)
    return { success: false, error: 'Could not delete link.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}
