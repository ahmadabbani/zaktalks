import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { calculateAllDiscounts } from '@/lib/discount-utils'

export async function POST(req) {
  try {
    const { courseId, email, firstName, lastName, isGuest, couponCode, pointsToUse } = await req.json()
    const supabase = await createClient()
    const supabaseAdmin = await createAdminClient()

    // 1. Fetch Course Details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, slug, price_cents')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // 2. Check Auth
    const { data: { user } } = await supabase.auth.getUser()

    let finalIsGuest = user ? 'false' : 'true'
    let finalUserId = user?.id || null

    // If it's a guest providing an email, check if they actually have an account
    if (!user && email) {
      const { data: matchingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()
      if (matchingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in to continue your purchase.' },
          { status: 400 }
        )
      }
    }

    // 3. Calculate Discounts
    const discounts = await calculateAllDiscounts({
      userId: finalUserId,
      courseId,
      basePriceCents: course.price_cents,
      couponCode,
      pointsToUse: parseInt(pointsToUse) || 0
    })

    // If coupon was provided but invalid, return error
    if (couponCode && !discounts.coupon.valid && discounts.coupon.error) {
      return NextResponse.json({ error: discounts.coupon.error }, { status: 400 })
    }

    const baseUrl = req.nextUrl.origin

    // 4. Build detailed description for Stripe checkout
    let description = ''
    if (discounts.totalDiscountCents > 0) {
      const lines = []
      lines.push(`Original Price: $${(course.price_cents / 100).toFixed(2)}`)
      
      if (discounts.firstPurchase.eligible) {
        lines.push(`- First Purchase (${discounts.firstPurchase.discountPercent}%): -$${(discounts.firstPurchase.discountCents / 100).toFixed(2)}`)
      }
      
      if (discounts.points.discountCents > 0) {
        lines.push(`- Points Discount (${discounts.points.discountPercent}%): -$${(discounts.points.discountCents / 100).toFixed(2)}`)
      }
      
      if (discounts.coupon.valid) {
        lines.push(`- Coupon ${discounts.coupon.couponCode}: -$${(discounts.coupon.discountCents / 100).toFixed(2)}`)
      }
      
      lines.push(`Total Savings: $${(discounts.totalDiscountCents / 100).toFixed(2)}`)
      lines.push(`Final Price: $${(discounts.finalPriceCents / 100).toFixed(2)}`)
      
      description = lines.join(' | ')
    }

    // 5. Prepare Stripe Session Params with discounted price
    const sessionParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: course.title,
              description: description || undefined,
            },
            // Use the final discounted price
            unit_amount: discounts.finalPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&is_guest=${finalIsGuest === 'true'}`,
      cancel_url: `${baseUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        courseId: courseId,
        isGuest: finalIsGuest,
        firstName: firstName || '',
        lastName: lastName || '',
        // Discount metadata for webhook processing
        originalPriceCents: String(course.price_cents),
        finalPriceCents: String(discounts.finalPriceCents),
        firstPurchaseDiscountCents: String(discounts.firstPurchase.discountCents),
        firstPurchaseApplied: String(discounts.firstPurchase.eligible),
        pointsDiscountCents: String(discounts.points.discountCents),
        pointsUsed: String(discounts.points.pointsToUse),
        couponDiscountCents: String(discounts.coupon.discountCents),
        couponId: discounts.coupon.couponId || '',
        couponCode: discounts.coupon.couponCode || '',
      },
      ...(finalUserId && { client_reference_id: finalUserId }),
      customer_email: user?.email || email || undefined,
    }

    console.log('Checkout with discounts:', {
      course: course.title,
      originalPrice: course.price_cents,
      discounts: discounts,
      finalPrice: discounts.finalPriceCents
    })

    // 5. Create Stripe Session
    const session = await stripe.checkout.sessions.create(sessionParams)

    // 6. Save to checkout_sessions table for tracking
    const { error: checkoutError } = await supabaseAdmin
      .from('checkout_sessions')
      .insert({
        stripe_session_id: session.id,
        course_id: courseId,
        user_id: user ? user.id : null,
        email: user ? user.email : email,
        first_name: user ? null : firstName,
        last_name: user ? null : lastName,
        coupon_id: discounts.coupon.couponId || null,
        status: 'pending'
      })

    if (checkoutError) {
      console.error('Checkout recording error:', checkoutError)
      // We still proceed because stripe session is created
    }

    // Return URL along with discount breakdown for UI display
    return NextResponse.json({ 
      url: session.url,
      discounts: {
        originalPrice: course.price_cents,
        firstPurchase: discounts.firstPurchase,
        points: discounts.points,
        coupon: discounts.coupon,
        totalDiscount: discounts.totalDiscountCents,
        finalPrice: discounts.finalPriceCents
      }
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
