import { stripe } from '@/lib/stripe'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { 
  spendPoints, 
  earnPoints, 
  recordCouponUsage, 
  markFirstPurchaseUsed,
  POINTS_PER_PURCHASE 
} from '@/lib/discount-utils'

async function sendWelcomeEmail(email, link) {
  try {
    const res = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Welcome to ZakTalks! Set your password',
      html: `
        <h1>Thank you for your purchase!</h1>
        <p>You now have access to your course. Since you checked out as a guest, please set a password for your account to log in later:</p>
        <a href="${link}" style="padding: 10px 20px; background-color: #FFD700; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Password</a>
        <p>Or copy this link: ${link}</p>
      `
    })
    console.log('Email response:', res)
    return res
  } catch (err) {
    console.error('Resend error:', err)
  }
}

export async function POST(req) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event

  try {
    if (!sig || !webhookSecret) throw new Error('Missing sig or secret')
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { 
      courseId, 
      isGuest, 
      firstName, 
      lastName,
      // Discount metadata from checkout
      originalPriceCents,
      firstPurchaseDiscountCents,
      firstPurchaseApplied,
      pointsDiscountCents,
      pointsUsed,
      couponDiscountCents,
      couponId,
      couponCode
    } = session.metadata
    
    const email = session.customer_details.email.toLowerCase().trim()
    const stripeSessionId = session.id
    const stripePaymentIntentId = session.payment_intent
    const amountPaid = session.amount_total

    console.log(`Processing enrollment for ${email}, isGuest: ${isGuest}`)
    console.log('Discount metadata:', { 
      originalPriceCents, 
      firstPurchaseApplied,
      pointsUsed,
      couponCode 
    })
    
    const supabaseAdmin = await createAdminClient()
    let userId = session.client_reference_id
    let isBrandNewUser = false

    // 1. Handle Guest User
    if (isGuest === 'true' && !userId) {
      console.log('Guest logic triggered...')
      
      // Fix: listUsers with filters doesn't work correctly - manually find by email
      const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = allUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())
      
      if (existingUser) {
        userId = existingUser.id
        console.log('Linked to existing Auth user:', userId)
      } else {
        console.log('Creating new Auth user...')
        const tempPass = Math.random().toString(36).slice(-12)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPass,
          email_confirm: true,
          user_metadata: { first_name: firstName, last_name: lastName }
        })

        if (createError) {
          console.error('User creation failed:', createError)
          // Recheck - maybe user was created by another process
          const { data: { users: recheckUsers } } = await supabaseAdmin.auth.admin.listUsers()
          const recheckUser = recheckUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())
          userId = recheckUser?.id
        } else {
          userId = newUser.user.id
          isBrandNewUser = true
          console.log('Created new user:', userId)
        }
      }

      // Generate Link for password setup
      // For brand new users we just created with createUser(), use 'recovery' (password reset)
      // because 'invite' tries to create the user again and fails
      // For existing users who purchased as guest, also use 'recovery'
      const linkType = 'recovery' // Always use recovery since user exists at this point
      console.log(`Generating ${linkType} link for ${email}...`)
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: linkType,
        email,
        options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password` }
      })

      if (linkError) {
        console.error('Link Error:', linkError)
        // Fallback to magiclink
        const { data: mgLink } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email,
          options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password` }
        })
        if (mgLink) await sendWelcomeEmail(email, mgLink.properties.action_link)
      } else {
        await sendWelcomeEmail(email, linkData.properties.action_link)
      }
    }

    // 2. Process Discounts (NEW - after user is resolved)
    if (userId) {
      try {
        // 2a. Mark first purchase discount as used
        if (firstPurchaseApplied === 'true' && parseInt(firstPurchaseDiscountCents) > 0) {
          console.log('Marking first purchase discount as used...')
          await markFirstPurchaseUsed(userId)
        }

        // 2b. Spend points if used
        const pointsToSpend = parseInt(pointsUsed) || 0
        if (pointsToSpend > 0) {
          console.log(`Spending ${pointsToSpend} points...`)
          await spendPoints(userId, pointsToSpend, courseId, `Used for course purchase`)
        }

        // 2c. Record coupon usage
        if (couponId && couponId !== '') {
          console.log(`Recording coupon usage: ${couponCode}...`)
          await recordCouponUsage(couponId, userId, courseId)
        }

        // 2d. Award points for this purchase (1000 points)
        console.log(`Awarding ${POINTS_PER_PURCHASE} points...`)
        await earnPoints(userId, courseId, `Earned from course purchase`)
      } catch (discountError) {
        console.error('Error processing discounts:', discountError)
        // Continue with enrollment even if discount processing fails
      }
    }

    // 3. Enrollment with discount details (ENHANCED)
    console.log(`Upserting enrollment for user ${userId}...`)
    const enrollmentData = {
      user_id: userId,
      course_id: courseId,
      stripe_payment_intent_id: stripePaymentIntentId,
      payment_status: 'completed',
      amount_paid_cents: amountPaid,
      original_price_cents: parseInt(originalPriceCents) || amountPaid,
      discount_applied_cents: (parseInt(originalPriceCents) || amountPaid) - amountPaid,
      // Store which discounts were applied
      first_purchase_discount_applied: firstPurchaseApplied === 'true',
      points_earned: POINTS_PER_PURCHASE,
      coupon_id: couponId && couponId !== '' ? couponId : null
    }
    
    const { error: enrollError } = await supabaseAdmin
      .from('user_enrollments')
      .upsert(enrollmentData, { onConflict: 'user_id, course_id' })

    if (enrollError) console.error('Enrollment Error:', enrollError)
    else console.log('Enrollment Success with discount tracking')

    // 4. Update Session (UNCHANGED)
    await supabaseAdmin.from('checkout_sessions').update({ 
      status: 'completed', 
      user_id: userId, 
      completed_at: new Date().toISOString() 
    }).eq('stripe_session_id', stripeSessionId)

    console.log('Payment processing complete!')
  }

  return NextResponse.json({ received: true })
}
