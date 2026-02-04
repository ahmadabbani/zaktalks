'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all coupons with their associated courses
 */
export async function getCoupons() {
  const supabase = await createAdminClient()
  
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching coupons:', error)
    return []
  }
  
  // Fetch course associations for each coupon
  const couponsWithCourses = await Promise.all(
    coupons.map(async (coupon) => {
      const { data: courseLinks } = await supabase
        .from('coupon_courses')
        .select('course_id')
        .eq('coupon_id', coupon.id)
      
      return {
        ...coupon,
        course_ids: courseLinks?.map(link => link.course_id) || []
      }
    })
  )
  
  return couponsWithCourses
}

/**
 * Fetch all courses for the multi-select dropdown
 */
export async function getAllCourses() {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .is('deleted_at', null)
    .order('title')
  
  if (error) {
    console.error('Error fetching courses:', error)
    return []
  }
  
  return data
}

/**
 * Create a new coupon
 */
export async function createCoupon(formData) {
  const supabase = await createAdminClient()
  
  const code = formData.get('code')?.toUpperCase().trim()
  const discountType = formData.get('discount_type')
  const discountValue = parseInt(formData.get('discount_value'))
  const maxUsesTotal = formData.get('max_uses_total') ? parseInt(formData.get('max_uses_total')) : null
  const maxUsesPerUser = parseInt(formData.get('max_uses_per_user')) || 1
  const expiresAt = formData.get('expires_at') || null
  const appliesToAllCourses = formData.get('applies_to_all_courses') === 'true'
  const courseIds = JSON.parse(formData.get('course_ids') || '[]')
  
  // Validation
  if (!code || code.length < 3) {
    return { success: false, error: 'Coupon code must be at least 3 characters' }
  }
  
  if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
    return { success: false, error: 'Invalid discount type' }
  }
  
  if (isNaN(discountValue) || discountValue <= 0) {
    return { success: false, error: 'Discount value must be greater than 0' }
  }
  
  if (discountType === 'percentage' && discountValue > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100%' }
  }
  
  if (!appliesToAllCourses && courseIds.length === 0) {
    return { success: false, error: 'Please select at least one course or check "All Courses"' }
  }
  
  // Check for duplicate code
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('code', code)
    .single()
  
  if (existing) {
    return { success: false, error: 'A coupon with this code already exists' }
  }
  
  // Create coupon with standardized columns
  const insertData = {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    max_uses_total: maxUsesTotal,
    max_uses_per_user: maxUsesPerUser,
    usage_count: 0,
    expires_at: expiresAt,
    applies_to_all_courses: appliesToAllCourses,
    is_active: true
  }
  
  const { data: coupon, error: createError } = await supabase
    .from('coupons')
    .insert(insertData)
    .select()
    .single()
  
  if (createError) {
    console.error('Error creating coupon:', createError)
    return { success: false, error: 'Failed to create coupon' }
  }
  
  // Link courses if not applying to all
  if (!appliesToAllCourses && courseIds.length > 0) {
    const courseLinks = courseIds.map(courseId => ({
      coupon_id: coupon.id,
      course_id: courseId
    }))
    
    const { error: linkError } = await supabase
      .from('coupon_courses')
      .insert(courseLinks)
    
    if (linkError) {
      console.error('Error linking courses:', linkError)
      // Rollback coupon creation
      await supabase.from('coupons').delete().eq('id', coupon.id)
      return { success: false, error: 'Failed to link courses to coupon' }
    }
  }
  
  revalidatePath('/admin/coupons')
  return { success: true, coupon }
}

/**
 * Update an existing coupon
 */
export async function updateCoupon(couponId, formData) {
  const supabase = await createAdminClient()
  
  const code = formData.get('code')?.toUpperCase().trim()
  const discountType = formData.get('discount_type')
  const discountValue = parseInt(formData.get('discount_value'))
  const maxUsesTotal = formData.get('max_uses_total') ? parseInt(formData.get('max_uses_total')) : null
  const maxUsesPerUser = parseInt(formData.get('max_uses_per_user')) || 1
  const expiresAt = formData.get('expires_at') || null
  const isActive = formData.get('is_active') === 'true'
  const appliesToAllCourses = formData.get('applies_to_all_courses') === 'true'
  const courseIds = JSON.parse(formData.get('course_ids') || '[]')
  
  // Validation
  if (!code || code.length < 3) {
    return { success: false, error: 'Coupon code must be at least 3 characters' }
  }
  
  if (discountType === 'percentage' && discountValue > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100%' }
  }
  
  // Check for duplicate code (excluding current coupon)
  const { data: existing } = await supabase
    .from('coupons')
    .select('id')
    .eq('code', code)
    .neq('id', couponId)
    .single()
  
  if (existing) {
    return { success: false, error: 'A coupon with this code already exists' }
  }
  
  // Update coupon with standardized columns
  const { error: updateError } = await supabase
    .from('coupons')
    .update({
      code,
      discount_type: discountType,
      discount_value: discountValue,
      max_uses_total: maxUsesTotal,
      max_uses_per_user: maxUsesPerUser,
      expires_at: expiresAt,
      is_active: isActive,
      applies_to_all_courses: appliesToAllCourses
    })
    .eq('id', couponId)
  
  if (updateError) {
    console.error('Error updating coupon:', updateError)
    return { success: false, error: 'Failed to update coupon' }
  }
  
  // Update course links
  // First, delete existing links
  await supabase
    .from('coupon_courses')
    .delete()
    .eq('coupon_id', couponId)
  
  // Then, add new links if not applying to all
  if (!appliesToAllCourses && courseIds.length > 0) {
    const courseLinks = courseIds.map(courseId => ({
      coupon_id: couponId,
      course_id: courseId
    }))
    
    await supabase
      .from('coupon_courses')
      .insert(courseLinks)
  }
  
  revalidatePath('/admin/coupons')
  return { success: true }
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(couponId) {
  const supabase = await createAdminClient()
  
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId)
  
  if (error) {
    console.error('Error deleting coupon:', error)
    return { success: false, error: 'Failed to delete coupon' }
  }
  
  revalidatePath('/admin/coupons')
  return { success: true }
}

/**
 * Toggle coupon active status
 */
export async function toggleCouponActive(couponId, isActive) {
  const supabase = await createAdminClient()
  
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId)
  
  if (error) {
    console.error('Error toggling coupon:', error)
    return { success: false, error: 'Failed to update coupon status' }
  }
  
  revalidatePath('/admin/coupons')
  return { success: true }
}
