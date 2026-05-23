'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAssessmentById } from '@/assessments/registry'

export async function getExternalAssessmentByToken(token) {
  const safeToken = String(token || '').trim()

  if (!safeToken) {
    return { success: false, reason: 'invalid' }
  }

  const adminSupabase = await createAdminClient()
  const { data, error } = await adminSupabase
    .from('external_assessment_links')
    .select('assessment_key, expires_at, revoked_at')
    .eq('token', safeToken)
    .maybeSingle()

  if (error) {
    console.error('External assessment token lookup error:', error)
    return { success: false, reason: 'server' }
  }

  if (!data) {
    return { success: false, reason: 'invalid' }
  }

  if (data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) {
    return { success: false, reason: 'expired' }
  }

  const definition = getAssessmentById(data.assessment_key)
  if (!definition) {
    return { success: false, reason: 'missing_assessment' }
  }

  return {
    success: true,
    assessmentKey: data.assessment_key,
    expiresAt: data.expires_at
  }
}
