import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { calculateAllDiscounts } from '@/lib/discount-utils'

/**
 * Preview discount calculations without creating a checkout session
 * Used by frontend to show price breakdown before user confirms checkout
 */
export async function POST(req) {
  try {
    const { courseId, email, couponCode, pointsToUse } = await req.json()
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

    // If guest with email, check if they already have an account
    if (!user && email) {
      const { data: matchingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (matchingUser) {
        return NextResponse.json({ emailExists: true })
      }
    }

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
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
