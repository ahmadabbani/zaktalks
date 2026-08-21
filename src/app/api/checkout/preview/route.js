import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { calculateAllDiscounts } from '@/lib/discount-utils'
import {
  clientIpFromRequest,
  enforceRateLimits,
  PublicSecurityError,
} from '@/lib/security/abuse-protection'

/**
 * Preview discount calculations without creating a checkout session
 * Used by frontend to show price breakdown before user confirms checkout
 */
export async function POST(req) {
  try {
    const { courseId, email, couponCode, pointsToUse } = await req.json()
    const clientIp = clientIpFromRequest(req)

    await enforceRateLimits([{
      action: 'checkout_preview_ip',
      value: clientIp,
      limit: 60,
      windowSeconds: 10 * 60,
    }])

    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    // 1. Fetch Course Details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price_cents')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // 2. Check Auth
    const { data: { user } } = await supabase.auth.getUser()
    let userId = user?.id || null

    // 3. Calculate Discounts
    const discounts = await calculateAllDiscounts({
      userId,
      courseId,
      basePriceCents: course.price_cents,
      couponCode,
      pointsToUse: parseInt(pointsToUse) || 0
    })

    // 4. Get user's current points balance (for UI display)
    let userPoints = 0
    if (userId) {
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('points')
        .eq('id', userId)
        .single()
      userPoints = userData?.points || 0
    }

    return NextResponse.json({
      course: {
        id: course.id,
        title: course.title,
        originalPrice: course.price_cents
      },
      userPoints,
      discounts: {
        firstPurchase: discounts.firstPurchase,
        points: discounts.points,
        coupon: discounts.coupon,
        totalDiscount: discounts.totalDiscountCents,
        finalPrice: discounts.finalPriceCents
      }
    })
  } catch (error) {
    console.error('Discount preview error:', error)
    if (error instanceof PublicSecurityError) {
      const headers = error.retryAfter
        ? { 'Retry-After': String(error.retryAfter) }
        : undefined
      return NextResponse.json({ error: error.message }, { status: error.status, headers })
    }
    return NextResponse.json({ error: 'Unable to load pricing. Please try again.' }, { status: 500 })
  }
}
