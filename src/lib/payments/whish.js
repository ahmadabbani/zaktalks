import 'server-only'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { resend, OKAYNESS_EMAIL_FROM, OKAYNESS_SUPPORT_EMAIL } from '@/lib/resend'
import { buildWhishEmail } from '@/lib/email/templates/whish'
import { trustedAppUrl } from '@/lib/payments/urls'

export const WHISH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Separate delivery tracking: failures never roll back a confirmed enrollment.
export async function sendWhishEmail(orderId, kind, requestOrigin) {
  const admin=await createAdminClient()
  let claim
  try {
    const {data:claims,error:claimError}=await admin.rpc('claim_whish_email',{p_order_id:orderId,p_kind:kind})
    if(claimError) throw claimError
    claim=claims?.[0]
    if(!claim) {
      const {data}=await admin.from('whish_order_emails').select('state').eq('order_id',orderId).eq('kind',kind).maybeSingle()
      return data?.state || 'pending'
    }
    const {data:order,error}=await admin.from('whish_orders').select('*').eq('id',orderId).single()
    if(error) throw error
    const appUrl=trustedAppUrl(requestOrigin)
    let setupUrl=''
    if(kind==='password') {
      let profile=null
      if(order.user_id) {
        const result=await admin.from('users').select('id,password_set,email_verified').eq('id',order.user_id).single()
        if(result.error) throw result.error
        profile=result.data
      } else {
        const result=await admin.from('users').select('id,password_set,email_verified').eq('email',order.email).maybeSingle()
        if(result.error) throw result.error
        profile=result.data
      }
      if(profile?.password_set || !order.is_guest) {
        // Email matching only links an order to its owner; it grants neither
        // a session nor access. Approval still requires the administrator.
        if(profile && !order.user_id) {
          const {error:attachError}=await admin.from('whish_orders').update({user_id:profile.id}).eq('id',order.id).is('user_id',null)
          if(attachError) throw attachError
        }
        const {error:trackingError}=await admin.from('whish_order_emails').update({state:'not_required',claimed_at:null}).eq('id',claim.id).eq('claimed_at',claim.claimed_at)
        if(trackingError) throw trackingError
        return 'not_required'
      }
      const {data:link,error:linkError}=await admin.auth.admin.generateLink({
        type:profile ? (profile.email_verified?'recovery':'magiclink') : 'invite',email:order.email,
        options:{data:{first_name:order.first_name,last_name:order.last_name},redirectTo:`${appUrl}/auth/callback?next=/auth/update-password`},
      })
      if(linkError || !link?.properties?.action_link || !link?.user?.id) throw new Error('Unable to prepare the account setup link.')
      setupUrl=link.properties.action_link
      const {error:attachError}=await admin.from('whish_orders').update({user_id:link.user.id}).eq('id',order.id)
      if(attachError) throw attachError
      // The existing welcome sender requires verified email + completed password setup.
      // Also recover a previous attempt that created the account before failing.
      if(!profile || order.user_id===profile.id) {
        const {error:welcomeError}=await admin.from('users').update({welcome_email_pending:true}).eq('id',link.user.id).eq('password_set',false).is('welcome_email_sent_at',null)
        if(welcomeError) throw welcomeError
      }
    }
    const message=buildWhishEmail({kind,order,setupUrl,appUrl,supportEmail:OKAYNESS_SUPPORT_EMAIL})
    const {data:sent,error:sendError}=await resend.emails.send({from:OKAYNESS_EMAIL_FROM,to:order.email,
      replyTo:OKAYNESS_SUPPORT_EMAIL,subject:message.subject,html:message.html,text:message.text},
      {idempotencyKey:`whish-${order.id}-${kind}-${kind==='password'?claim.claimed_at:'v1'}`})
    if(sendError) throw new Error(sendError.message)
    const {error:trackingError}=await admin.from('whish_order_emails').update({state:'sent',sent_at:new Date().toISOString(),
      provider_email_id:sent?.id,last_error:null,claimed_at:null}).eq('id',claim.id).eq('claimed_at',claim.claimed_at)
    if(trackingError) throw trackingError
    return 'sent'
  } catch(error) {
    console.error(`Whish ${kind} delivery failed:`,error.message)
    if(claim) await admin.from('whish_order_emails').update({state:'failed',last_error:String(error.message).slice(0,1000),claimed_at:null})
      .eq('id',claim.id).eq('claimed_at',claim.claimed_at)
    return 'failed'
  }
}

export async function whishOrderExtras(admin, ids) {
  if(!ids.length) return new Map()
  const {data,error}=await admin.from('whish_orders').select('id,status,phone,quoted_amount_cents,amount_received_cents,transfer_reference,reviewed_at,reviewed_by,admin_note,discounts,is_guest,recipient_number').in('id',ids)
  if(error) throw error
  return new Map((data||[]).map(row=>[row.id,{...row,payment_provider:'whish'}]))
}
