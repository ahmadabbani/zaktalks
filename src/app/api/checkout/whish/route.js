import { NextResponse } from 'next/server'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { calculateAllDiscounts } from '@/lib/discount-utils'
import { whishConfiguration } from '@/lib/payments/whish-config'
import { sendWhishEmail, WHISH_UUID } from '@/lib/payments/whish'
import { clientIpFromRequest,enforceRateLimits,verifyTurnstileToken,PublicSecurityError } from '@/lib/security/abuse-protection'

export async function GET() {
  const config=whishConfiguration()
  return NextResponse.json({available:config.enabled&&config.ready},{headers:{'Cache-Control':'no-store'}})
}

export async function POST(request) {
  try {
    const config=whishConfiguration()
    if(!config.enabled || !config.ready) return NextResponse.json({error:'Whish payments are not available yet. Please choose card payment or contact us.'},{status:503})
    const body=await request.json()
    const auth=await createClient()
    const {data:{user}}=await auth.auth.getUser()
    const email=String(user?.email || body.email || '').trim().toLowerCase()
    const phone=String(body.phone || '').trim()
    const firstName=String(body.firstName || '').trim().slice(0,100)
    const lastName=String(body.lastName || '').trim().slice(0,100)
    if(!WHISH_UUID.test(body.courseId || '') || !WHISH_UUID.test(body.requestKey || '') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>320 || !isValidPhoneNumber(phone) ||
      (!user&&(!firstName||!lastName))) return NextResponse.json({error:'Enter your name, a valid email, and a valid phone number including country code.'},{status:400})
    const points=Number(body.pointsToUse || 0)
    if(!Number.isSafeInteger(points) || points<0 || points%1000 || (!user&&points)) return NextResponse.json({error:'The selected points are invalid.'},{status:400})
    const ip=clientIpFromRequest(request)
    await enforceRateLimits([{action:'whish_request_ip',value:ip,limit:12,windowSeconds:3600},
      {action:'whish_request_email',value:email,limit:5,windowSeconds:3600}])
    if(!user) await verifyTurnstileToken(body.captchaToken,ip)
    const admin=await createAdminClient()
    const {data:existing,error:existingError}=await admin.from('whish_orders').select('*').eq('request_key',body.requestKey).maybeSingle()
    if(existingError) throw existingError
    if(existing && (existing.email!==email || existing.course_id!==body.courseId || (!existing.is_guest&&existing.user_id!==user?.id)))
      return NextResponse.json({error:'This request does not match your checkout.'},{status:409})
    let order=existing
    if(!order) {
      const {data:course,error:courseError}=await admin.from('courses').select('id,title,price_cents').eq('id',body.courseId).eq('is_published',true).is('deleted_at',null).maybeSingle()
      if(courseError) throw courseError
      if(!course) return NextResponse.json({error:'This course is no longer available.'},{status:404})
      const {data:profile,error:profileError}=await admin.from('users').select('id,first_name,last_name').eq('email',email).maybeSingle()
      if(profileError) throw profileError
      if(!user&&profile) return NextResponse.json({error:'An account with this email already exists. Please sign in to continue.'},{status:409})
      if(user) {
        const {data:enrollment,error:enrollmentError}=await admin.from('user_enrollments').select('id').eq('user_id',user.id).eq('course_id',course.id).in('payment_status',['completed','staff']).maybeSingle()
        if(enrollmentError) throw enrollmentError
        if(enrollment) return NextResponse.json({error:'You already have access to this course.'},{status:409})
      }
      const discounts=await calculateAllDiscounts({userId:user?.id||null,courseId:course.id,basePriceCents:course.price_cents,
        couponCode:String(body.couponCode||'').trim().slice(0,100)||null,pointsToUse:points})
      if(body.couponCode&&!discounts.coupon.valid) return NextResponse.json({error:discounts.coupon.error||'This coupon is no longer available.'},{status:409})
      if(discounts.points.pointsToUse!==points || discounts.finalPriceCents!==Number(body.quotedAmountCents))
        return NextResponse.json({error:'Your price or points balance has changed. Review the refreshed price before confirming again.',refreshPricing:true},{status:409})
      const {data:created,error:createError}=await admin.from('whish_orders').insert({request_key:body.requestKey,user_id:user?.id||null,
        email,first_name:user?profile?.first_name||'':firstName,last_name:user?profile?.last_name||'':lastName,phone,is_guest:!user,
        course_id:course.id,course_title:course.title,recipient_number:config.recipientNumber,original_price_cents:course.price_cents,
        quoted_amount_cents:discounts.finalPriceCents,discounts,points_to_spend:discounts.points.pointsToUse,
        first_purchase_discount_applied:discounts.firstPurchase.eligible,coupon_id:discounts.coupon.couponId||null}).select('*').single()
      if(createError?.code==='23505') return NextResponse.json({error:'A Whish request for this course is already pending. Check your email or contact us before submitting again.'},{status:409})
      if(createError) throw createError
      order=created
    }
    const [instructions,setup]=await Promise.all([
      sendWhishEmail(order.id,'instructions',request.nextUrl.origin),
      order.is_guest?sendWhishEmail(order.id,'password',request.nextUrl.origin):Promise.resolve('not_required'),
    ])
    const params=new URLSearchParams({instructions,setup})
    return NextResponse.json({url:`/payment/whish?${params.toString()}`})
  } catch(error) {
    console.error('Whish request failed:',error.message)
    return NextResponse.json({error:error instanceof PublicSecurityError?error.message:'We could not save your request. Please try again.'},
      {status:error instanceof PublicSecurityError?error.status:500})
  }
}
