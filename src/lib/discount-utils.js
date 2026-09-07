/**
 * Discount Utilities
 * 
 * Core functions for calculating and applying discounts
 * Used by checkout API and webhook handlers
 */

import { createClient as createAdminClient } from '@/lib/supabase/admin'

// Constants
const POINTS_PER_PURCHASE = 1000

/**
 * Resolve the currently applicable scheduled promotion for a course.
 * The database chooses the highest-value eligible promotion so preview and
 * checkout always use the same deterministic rule.
 */
function emptyCoursePromotion(basePriceCents) {
  return {
    applied: false,
    promotionId: null,
    name: '',
    discountPercent: 0,
    discountCents: 0,
    priceAfterPromotionCents: basePriceCents,
  }
}

async function resolveActiveCoursePromotion(supabase, courseId, basePriceCents) {
  const emptyPromotion = {
    ...emptyCoursePromotion(basePriceCents),
  }

  if (!courseId || basePriceCents <= 0) return emptyPromotion

  const { data, error } = await supabase.rpc('get_active_course_promotion', {
    p_course_id: courseId,
  })

  if (error) {
    throw new Error(`Unable to resolve course promotion: ${error.message}`)
  }

  const promotion = Array.isArray(data) ? data[0] : data
  if (!promotion?.promotion_id) return emptyPromotion

  const discountCents = Math.min(
    Math.max(Number(promotion.discount_amount_cents) || 0, 0),
    basePriceCents
  )

  if (discountCents <= 0) return emptyPromotion

  const discountPercent = Number(promotion.discount_percent)
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
    return emptyPromotion
  }

  return {
    applied: true,
    promotionId: promotion.promotion_id,
    name: promotion.promotion_name || 'Course promotion',
    discountPercent,
    discountCents,
    priceAfterPromotionCents: Math.max(0, basePriceCents - discountCents),
    startsAt: promotion.starts_at,
    endsAt: promotion.ends_at,
  }
}

export async function getActiveCoursePromotion(courseId, basePriceCents) {
  const supabase = await createAdminClient()
  return resolveActiveCoursePromotion(supabase, courseId, basePriceCents)
}

/**
 * Resolve live promotion badges for course-card and course-page presentation.
 * Failures deliberately omit badges rather than blocking a public page; the
 * checkout path still performs its own strict promotion validation.
 */
export async function getActiveCoursePromotionMap(courses = []) {
  const uniqueCourses = [...new Map(
    courses
      .filter((course) => course?.id)
      .map((course) => [course.id, {
        id: course.id,
        price_cents: Math.max(0, Number(course.price_cents) || 0),
      }])
  ).values()]

  if (uniqueCourses.length === 0) return {}

  try {
    const supabase = await createAdminClient()
    const resolved = await Promise.all(uniqueCourses.map(async (course) => [
      course.id,
      await resolveActiveCoursePromotion(supabase, course.id, course.price_cents),
    ]))

    return Object.fromEntries(resolved.filter(([, promotion]) => promotion.applied))
  } catch (error) {
    console.error('Unable to load course promotion badges:', error)
    return {}
  }
}

/**
 * Get an admin setting value from the database
 */
export async function getAdminSetting(key) {
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', key)
    .single()
  
  if (error) {
    console.error(`Error fetching admin setting ${key}:`, error)
    return null
  }
  
  return data?.value
}

/**
 * Get first purchase discount percentage (from admin settings)
 * Returns: { eligible: boolean, discountPercent: number, discountCents: number }
 */
export async function calculateFirstPurchaseDiscount(userId, basePriceCents) {
  const supabase = await createAdminClient()
  
  // Check if user is eligible (hasn't used first purchase discount)
  const { data: user } = await supabase
    .from('users')
    .select('first_purchase_discount_used')
    .eq('id', userId)
    .single()
  
  // If user already used first purchase discount, not eligible
  if (user?.first_purchase_discount_used) {
    return { eligible: false, discountPercent: 0, discountCents: 0 }
  }
  
  // Get discount percentage from admin settings
  const discountPercentStr = await getAdminSetting('first_purchase_discount_percent')
  const discountPercent = parseInt(discountPercentStr) || 0
  
  if (discountPercent <= 0) {
    return { eligible: false, discountPercent: 0, discountCents: 0 }
  }
  
  const discountCents = Math.floor(basePriceCents * (discountPercent / 100))
  
  return {
    eligible: true,
    discountPercent,
    discountCents
  }
}

/**
 * Validate a coupon code for a specific user and course
 * Returns: { valid: boolean, error?: string, coupon?: object, discountCents?: number }
 */
export async function validateCoupon(code, userId, courseId, priceAfterOtherDiscounts) {
  if (!code) {
    return { valid: false, error: 'No coupon code provided' }
  }
  
  const supabase = await createAdminClient()
  
  // Fetch coupon
  const { data: coupon, error: couponError } = await supabase
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single()
  
  if (couponError || !coupon) {
    return { valid: false, error: 'Invalid coupon code' }
  }
  
  // Check expiration
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'This coupon has expired' }
  }
  
  // Check max uses total
  if (coupon.max_uses_total && coupon.usage_count >= coupon.max_uses_total) {
    return { valid: false, error: 'This coupon has reached its usage limit' }
  }
  
  // Check if coupon applies to this course
  if (!coupon.applies_to_all_courses) {
    const { data: courseLink } = await supabase
      .from('coupon_courses')
      .select('course_id')
      .eq('coupon_id', coupon.id)
      .eq('course_id', courseId)
      .single()
    
    if (!courseLink) {
      return { valid: false, error: 'This coupon is not valid for this course' }
    }
  }
  
  // Check per-user usage limit (works for logged-in users and guests with existing accounts)
  if (userId) {
    const { data: usages } = await supabase
      .from('coupon_usages')
      .select('id')
      .eq('coupon_id', coupon.id)
      .eq('user_id', userId)
    
    const userUsageCount = usages?.length || 0
    
    if (userUsageCount >= coupon.max_uses_per_user) {
      return { valid: false, error: 'You have already used this coupon' }
    }
  }
  
  // Calculate discount
  let discountCents = 0
  if (coupon.discount_type === 'percentage') {
    discountCents = Math.floor(priceAfterOtherDiscounts * (coupon.discount_value / 100))
  } else {
    // Fixed amount (discount_value is in cents)
    discountCents = Math.min(coupon.discount_value, priceAfterOtherDiscounts)
  }
  
  return {
    valid: true,
    coupon,
    discountCents
  }
}

/**
 * Calculate points discount
 * Returns: { eligible: boolean, discountPercent: number, discountCents: number, pointsToUse: number }
 * @param {string} userId - User ID
 * @param {number} priceAfterOtherDiscounts - Price in cents after other discounts
 * @param {number} requestedPoints - Points the user wants to use (must be in 1000 increments)
 */
export async function calculatePointsDiscount(userId, priceAfterOtherDiscounts, requestedPoints = 0) {
  if (!userId || requestedPoints <= 0) {
    return { eligible: false, discountPercent: 0, discountCents: 0, pointsToUse: 0 }
  }
  
  const supabase = await createAdminClient()
  
  // Get user's current points
  const { data: user } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single()
  
  const userPoints = user?.points || 0
  
  // Need at least 1000 points to use, and requested must be in 1000 increments
  if (userPoints < 1000 || requestedPoints < 1000) {
    return { eligible: false, discountPercent: 0, discountCents: 0, pointsToUse: 0 }
  }
  
  // Cap requested points to user's actual balance (in 1000 increments)
  const maxUsablePoints = Math.floor(userPoints / 1000) * 1000
  const pointsToUse = Math.min(requestedPoints, maxUsablePoints)
  
  // Get base points discount percentage from admin settings (per 1000 points)
  const discountPercentStr = await getAdminSetting('points_discount_percent')
  const baseDiscountPercent = parseInt(discountPercentStr) || 10
  
  if (baseDiscountPercent <= 0) {
    return { eligible: false, discountPercent: 0, discountCents: 0, pointsToUse: 0 }
  }
  
  // Calculate total discount percent based on points used (e.g., 2000 pts = 20% if base is 10%)
  const multiplier = pointsToUse / 1000
  const discountPercent = baseDiscountPercent * multiplier
  
  // Cap discount at remaining price
  const discountCents = Math.min(
    Math.floor(priceAfterOtherDiscounts * (discountPercent / 100)),
    priceAfterOtherDiscounts
  )
  
  return {
    eligible: true,
    discountPercent,
    discountCents,
    pointsToUse
  }
}

/**
 * Spend points from a user (after successful payment)
 */
export async function spendPoints(userId, points, referenceId, description) {
  const supabase = await createAdminClient()
  
  // Atomically deduct points (single DB call, no race condition)
  const { data: newBalance } = await supabase
    .rpc('adjust_user_points', { p_user_id: userId, p_delta: -points })
  
  const newPoints = newBalance ?? 0
  
  // Log transaction
  await supabase
    .from('point_transactions')
    .insert({
      user_id: userId,
      amount: -points,
      type: 'spend',
      reference_id: referenceId,
      description: description || `Spent ${points} points on purchase`
    })
  
  return { success: true, newBalance: newPoints }
}

/**
 * Earn points for a user (after successful payment)
 */
export async function earnPoints(userId, referenceId, description) {
  const supabase = await createAdminClient()
  const points = POINTS_PER_PURCHASE
  
  // Atomically add points (single DB call, no race condition)
  const { data: newBalance } = await supabase
    .rpc('adjust_user_points', { p_user_id: userId, p_delta: points })
  
  const newPoints = newBalance ?? 0
  
  // Log transaction
  await supabase
    .from('point_transactions')
    .insert({
      user_id: userId,
      amount: points,
      type: 'earn',
      reference_id: referenceId,
      description: description || `Earned ${points} points from purchase`
    })
  
  return { success: true, pointsEarned: points, newBalance: newPoints }
}

/**
 * Record coupon usage after successful payment
 */
export async function recordCouponUsage(couponId, userId, courseId) {
  const supabase = await createAdminClient()
  
  // Insert usage record
  await supabase
    .from('coupon_usages')
    .insert({
      coupon_id: couponId,
      user_id: userId,
      course_id: courseId
    })
  
  // Increment coupon usage count
  await supabase.rpc('increment_coupon_usage', { p_coupon_id: couponId })
  
  return { success: true }
}

/**
 * Mark first purchase discount as used
 */
export async function markFirstPurchaseUsed(userId) {
  const supabase = await createAdminClient()
  
  await supabase
    .from('users')
    .update({ first_purchase_discount_used: true })
    .eq('id', userId)
  
  return { success: true }
}

/**
 * Calculate all applicable discounts for a checkout
 * Returns complete discount breakdown
 */
export async function calculateAllDiscounts({
  userId,
  courseId,
  basePriceCents,
  couponCode,
  pointsToUse = 0
}) {
  let remainingPrice = basePriceCents
  const breakdown = {
    basePriceCents,
    promotion: {
      applied: false,
      promotionId: null,
      name: '',
      discountPercent: 0,
      discountCents: 0,
      priceAfterPromotionCents: basePriceCents,
    },
    firstPurchase: { eligible: false, discountCents: 0 },
    points: { eligible: false, discountCents: 0, pointsToUse: 0 },
    coupon: { valid: false, discountCents: 0, couponId: null },
    totalDiscountCents: 0,
    finalPriceCents: basePriceCents
  }

  // 1. Scheduled Course Promotion (applied before account-based discounts)
  const promotion = await getActiveCoursePromotion(courseId, basePriceCents)
  if (promotion.applied) {
    breakdown.promotion = promotion
    remainingPrice -= promotion.discountCents
  }
  
  // 2. First Purchase Discount
  // For new guests (no userId), they ARE eligible for first-purchase
  // For existing users, check if they've used it before
  if (remainingPrice > 0 && userId) {
    const fpDiscount = await calculateFirstPurchaseDiscount(userId, remainingPrice)
    if (fpDiscount.eligible) {
      breakdown.firstPurchase = {
        eligible: true,
        discountPercent: fpDiscount.discountPercent,
        discountCents: fpDiscount.discountCents
      }
      remainingPrice -= fpDiscount.discountCents
    }
  } else if (remainingPrice > 0) {
    // New guest - always eligible for first purchase discount
    const discountPercentStr = await getAdminSetting('first_purchase_discount_percent')
    const discountPercent = parseInt(discountPercentStr) || 0
    if (discountPercent > 0) {
      const discountCents = Math.floor(remainingPrice * (discountPercent / 100))
      breakdown.firstPurchase = {
        eligible: true,
        discountPercent,
        discountCents
      }
      remainingPrice -= discountCents
    }
  }
  
  // 3. Points Discount
  if (remainingPrice > 0 && userId && pointsToUse > 0) {
    const pointsDiscount = await calculatePointsDiscount(userId, remainingPrice, pointsToUse)
    if (pointsDiscount.eligible) {
      breakdown.points = {
        eligible: true,
        discountPercent: pointsDiscount.discountPercent,
        discountCents: pointsDiscount.discountCents,
        pointsToUse: pointsDiscount.pointsToUse
      }
      remainingPrice -= pointsDiscount.discountCents
    }
  }
  
  // 4. Coupon Discount (applied last)
  if (remainingPrice > 0 && couponCode) {
    const couponResult = await validateCoupon(couponCode, userId, courseId, remainingPrice)
    if (couponResult.valid) {
      breakdown.coupon = {
        valid: true,
        discountCents: couponResult.discountCents,
        couponId: couponResult.coupon.id,
        couponCode: couponResult.coupon.code
      }
      remainingPrice -= couponResult.discountCents
    } else {
      breakdown.coupon = {
        valid: false,
        error: couponResult.error,
        discountCents: 0,
        couponId: null
      }
    }
  }
  
  // Calculate totals
  breakdown.totalDiscountCents = 
    breakdown.promotion.discountCents +
    breakdown.firstPurchase.discountCents + 
    breakdown.points.discountCents + 
    breakdown.coupon.discountCents
  
  breakdown.finalPriceCents = Math.max(0, remainingPrice)
  
  return breakdown
}

// Export constants
export { POINTS_PER_PURCHASE }
