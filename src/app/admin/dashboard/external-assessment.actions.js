'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { requirePermission } from '@/lib/auth-utils'
import { getAssessmentById } from '@/assessments/registry'

function createToken() {
  return crypto.randomBytes(24).toString('base64url')
}

export async function generateExternalAssessmentLink(formData) {
  const access = await requirePermission('external_assessments.manage')

  const assessmentKey = formData.get('assessment_key')?.trim()
  const definition = getAssessmentById(assessmentKey)

  if (!definition) {
    return { success: false, error: 'Please select a valid assessment.' }
  }

  const adminSupabase = await createAdminClient()

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const token = createToken()

  const { data, error } = await adminSupabase
    .from('external_assessment_links')
    .insert({
      assessment_key: assessmentKey,
      token,
      created_by: access.user.id,
      expires_at: expiresAt
    })
    .select('id, assessment_key, token, created_at, expires_at, revoked_at')
    .single()

  if (error) {
    console.error('External assessment link creation error:', error)
    return { success: false, error: 'Could not generate link. Make sure the Supabase SQL was run.' }
  }

  revalidatePath('/admin/courses')

  return {
    success: true,
    link: {
      ...data,
      path: `/assessments/external/${data.token}`
    }
  }
}

export async function revokeExternalAssessmentLink(linkId) {
  await requirePermission('external_assessments.manage')

  const adminSupabase = await createAdminClient()

  const { error } = await adminSupabase
    .from('external_assessment_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    console.error('External assessment link delete error:', error)
    return { success: false, error: 'Could not delete link.' }
  }

  revalidatePath('/admin/courses')
  return { success: true }
}
