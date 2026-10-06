/**
 * Discount Utilities
 * 
 * Core functions for calculating and applying discounts
 * Used by checkout API and webhook handlers
 */

import { createClient as createAdminClient } from '@/lib/supabase/admin'

import { MIN_POINTS_REDEMPTION, POINTS_REDEMPTION_STEP, pointsDiscountForBalance, purchaseRewardPoints } from '@/lib/points-rules'

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

async function getActiveWhishPromotion(courseId, remainingPriceCents) {
  const empty = emptyCoursePromotion(remainingPriceCents)
  if (remainingPriceCents <= 0) return empty
  const supabase = await createAdminClient()
  const { data, error } = await supabase.rpc('get_active_whish_promotion', {
    p_course_id: courseId, p_remaining_price_cents: remainingPriceCents,
  })
  if (error) throw new Error(`Unable to resolve Whish offer: ${error.message}`)
  const promotion = Array.isArray(data) ? data[0] : data
  if (!promotion?.promotion_id) return empty
  const percent = Number(promotion.discount_percent)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) throw new Error('Invalid Whish offer percentage.')
  const discountCents = Math.min(remainingPriceCents, Math.max(0, Number(promotion.discount_amount_cents) || 0))
  return { ...empty, applied: discountCents > 0, promotionId: promotion.promotion_id,
    name: promotion.promotion_name, discountPercent: percent, discountCents,
    priceAfterPromotionCents: remainingPriceCents - discountCents,
    startsAt: promotion.starts_at, endsAt: promotion.ends_at }
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

async function getFirstPurchaseDiscountConfig() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', ['first_purchase_discount_enabled', 'first_purchase_discount_percent'])

  if (error) throw new Error(`Unable to load first-purchase discount settings: ${error.message}`)

  const settings = Object.fromEntries((data || []).map(({ key, value }) => [key, value]))
  return {
    // The switch is on by default so existing installations retain today's behavior.
    enabled: settings.first_purchase_discount_enabled === undefined
      || settings.first_purchase_discount_enabled === 'true',
    percent: parseInt(settings.first_purchase_discount_percent, 10) || 0,
  }
}

/**
 * Get first purchase discount percentage (from admin settings)
 * Returns: { eligible: boolean, discountPercent: number, discountCents: number }
 */
export async function calculateFirstPurchaseDiscount(userId, basePriceCents, config = null) {
  const { enabled, percent: discountPercent } = config || await getFirstPurchaseDiscountConfig()
  if (!enabled || discountPercent <= 0) {
    return { eligible: false, discountPercent: 0, discountCents: 0 }
  }

  const supabase = await createAdminClient()
  
  // Check if user is eligible (hasn't used first purchase discount)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('first_purchase_discount_used')
    .eq('id', userId)
    .single()

  if (userError || !user) throw new Error('Unable to verify first-purchase eligibility.')
  
  // If user already used first purchase discount, not eligible
  if (user?.first_purchase_discount_used) {
    return { eligible: false, discountPercent: 0, discountCents: 0 }
  }

  // A purchase made while this offer is disabled still counts as the buyer's
  // first purchase. Retained payment records also cover removed courses.
  const [{ data: enrollments, error: enrollmentError },
    { data: stripeOrders, error: stripeError },
    { data: whishOrders, error: whishError }] = await Promise.all([
    supabase.from('user_enrollments').select('id').eq('user_id', userId)
      .eq('payment_status', 'completed').limit(1),
    supabase.from('checkout_sessions').select('id').eq('user_id', userId)
      .eq('status', 'completed').limit(1),
    supabase.from('whish_orders').select('id').eq('user_id', userId)
      .eq('status', 'confirmed').limit(1),
  ])
  if (enrollmentError || stripeError || whishError) {
    throw new Error('Unable to verify first-purchase eligibility.')
  }
  if (enrollments?.length || stripeOrders?.length || whishOrders?.length) {
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
 * @param {number} requestedPoints - Zero or at least 5000, in 1000 increments
 */
export async function calculatePointsDiscount(userId, priceAfterOtherDiscounts, requestedPoints = 0) {
  if (!userId || requestedPoints <= 0) {
    return { eligible: false, discountPercent: 0, discountCents: 0, pointsToUse: 0 }
  }
  
  const supabase = await createAdminClient()
  
  // Get user's current points
  const { data: user, error } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single()
  
  if (error || !user) throw new Error('Unable to verify the points balance.')
  // Convert the selected points to USD at this rate; not a percentage of price.
  const discountPercentStr = await getAdminSetting('points_discount_percent')
  if (discountPercentStr === null) throw new Error('Unable to load the points discount setting.')
  return pointsDiscountForBalance(user.points || 0, priceAfterOtherDiscounts, requestedPoints, Number(discountPercentStr))
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
export async function earnPoints(userId, referenceId, description, amountPaidCents) {
  const supabase = await createAdminClient()
  const points = purchaseRewardPoints(amountPaidCents)
  
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
  pointsToUse = 0,
  paymentMethod = 'stripe'
}) {
  let remainingPrice = basePriceCents
  const breakdown = {
    basePriceCents,
    pointsRedemptionStep: POINTS_REDEMPTION_STEP,
    pointsMinimum: MIN_POINTS_REDEMPTION,
    whishPromotion: emptyCoursePromotion(basePriceCents),
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

  // An additional offer only for Whish, after the general course promotion.
  if (paymentMethod === 'whish' && remainingPrice > 0) {
    breakdown.whishPromotion = await getActiveWhishPromotion(courseId, remainingPrice)
    remainingPrice -= breakdown.whishPromotion.discountCents
  }
  
  // 2. First Purchase Discount
  // For new guests (no userId), they ARE eligible for first-purchase
  // For existing users, check if they've used it before
  if (remainingPrice > 0) {
    const firstPurchaseConfig = await getFirstPurchaseDiscountConfig()
    if (firstPurchaseConfig.enabled) {
      if (userId) {
        const fpDiscount = await calculateFirstPurchaseDiscount(userId, remainingPrice, firstPurchaseConfig)
        if (fpDiscount.eligible) {
          breakdown.firstPurchase = fpDiscount
          remainingPrice -= fpDiscount.discountCents
        }
      } else if (firstPurchaseConfig.percent > 0) {
        // The guest account is created after payment, so the offer is quoted here.
        const discountCents = Math.floor(remainingPrice * (firstPurchaseConfig.percent / 100))
        breakdown.firstPurchase = {
          eligible: true,
          discountPercent: firstPurchaseConfig.percent,
          discountCents
        }
        remainingPrice -= discountCents
      }
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
    breakdown.whishPromotion.discountCents +
    breakdown.firstPurchase.discountCents + 
    breakdown.points.discountCents + 
    breakdown.coupon.discountCents
  
  breakdown.finalPriceCents = Math.max(0, remainingPrice)
  
  return breakdown
}
