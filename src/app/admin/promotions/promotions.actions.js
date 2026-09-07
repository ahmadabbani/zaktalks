'use server'

import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function parsePercentage(value) {
  const normalized = String(value ?? '').trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const percentage = Number(normalized)
  return Number.isFinite(percentage) && percentage > 0 && percentage <= 100
    ? percentage
    : null
}

function parseIsoDate(value) {
  const parsed = new Date(String(value || ''))
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseCourseIds(value) {
  try {
    const parsed = JSON.parse(String(value || '[]'))
    if (!Array.isArray(parsed)) return null
    const unique = [...new Set(parsed)]
    return unique.every((id) => UUID_PATTERN.test(id)) ? unique : null
  } catch {
    return null
  }
}

export async function getCoursePromotions() {
  await requirePermission('coupons.manage')
  const supabase = await createAdminClient()

  const [{ data: promotions, error }, { data: assignments, error: assignmentsError }] = await Promise.all([
    supabase.from('course_promotions').select('*').order('created_at', { ascending: false }),
    supabase.from('course_promotion_courses').select('promotion_id, course_id'),
  ])

  if (error || assignmentsError) {
    console.error('Unable to load course promotions:', error || assignmentsError)
    return []
  }

  const coursesByPromotion = new Map()
  for (const assignment of assignments || []) {
    const current = coursesByPromotion.get(assignment.promotion_id) || []
    current.push(assignment.course_id)
    coursesByPromotion.set(assignment.promotion_id, current)
  }

  return (promotions || []).map((promotion) => ({
    ...promotion,
    course_ids: coursesByPromotion.get(promotion.id) || [],
  }))
}

export async function saveCoursePromotion(formData) {
  await requirePermission('coupons.manage')

  const promotionId = String(formData.get('promotion_id') || '').trim() || null
  const name = String(formData.get('name') || '').trim()
  const discountPercent = parsePercentage(formData.get('discount_percent'))
  const startsAt = parseIsoDate(formData.get('starts_at'))
  const endsAt = parseIsoDate(formData.get('ends_at'))
  const isActive = formData.get('is_active') === 'true'
  const appliesToAllCourses = formData.get('applies_to_all_courses') === 'true'
  const courseIds = parseCourseIds(formData.get('course_ids'))

  if (promotionId && !UUID_PATTERN.test(promotionId)) {
    return { success: false, error: 'This promotion could not be identified.' }
  }
  if (!name || name.length > 120) {
    return { success: false, error: 'Enter a promotion name up to 120 characters.' }
  }
  if (!discountPercent) {
    return { success: false, error: 'Enter a percentage greater than zero and no more than 100.' }
  }
  if (!startsAt || !endsAt || new Date(endsAt) <= new Date(startsAt)) {
    return { success: false, error: 'The end date must be after the start date.' }
  }
  if (!courseIds || (!appliesToAllCourses && courseIds.length === 0)) {
    return { success: false, error: 'Choose at least one course.' }
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('save_course_promotion', {
    p_promotion_id: promotionId,
    p_name: name,
    p_discount_percent: discountPercent,
    p_starts_at: startsAt,
    p_ends_at: endsAt,
    p_is_active: isActive,
    p_applies_to_all_courses: appliesToAllCourses,
    p_course_ids: appliesToAllCourses ? [] : courseIds,
  })

  if (error) {
    console.error('Unable to save course promotion:', error)
    const message = /selected course|choose at least|end date|promotion name|percentage|greater than zero/i.test(error.message || '')
      ? error.message
      : 'The promotion could not be saved.'
    return { success: false, error: message }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, promotionId: data }
}

export async function toggleCoursePromotion(promotionId, isActive) {
  await requirePermission('coupons.manage')
  if (!UUID_PATTERN.test(String(promotionId || ''))) {
    return { success: false, error: 'This promotion could not be identified.' }
  }

  const supabase = await createAdminClient()
  const { error } = await supabase
    .from('course_promotions')
    .update({ is_active: Boolean(isActive), updated_at: new Date().toISOString() })
    .eq('id', promotionId)

  if (error) {
    console.error('Unable to update course promotion:', error)
    return { success: false, error: 'The promotion status could not be updated.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function deleteCoursePromotion(promotionId) {
  await requirePermission('coupons.manage')
  if (!UUID_PATTERN.test(String(promotionId || ''))) {
    return { success: false, error: 'This promotion could not be identified.' }
  }

  const supabase = await createAdminClient()
  const { error } = await supabase.from('course_promotions').delete().eq('id', promotionId)

  if (error) {
    console.error('Unable to delete course promotion:', error)
    return { success: false, error: 'The promotion could not be deleted.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true }
}
