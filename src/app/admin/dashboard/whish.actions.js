'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { sendWhishEmail,WHISH_UUID } from '@/lib/payments/whish'
import { whishConfiguration } from '@/lib/payments/whish-config'

export async function getWhishOrders({status='pending',search='',page=0}={}) {
  await requireAdmin()
  if(!['pending','confirmed','cancelled','all'].includes(status)) status='pending'
  const admin=await createAdminClient()
  let query=admin.from('whish_orders').select('*,account:users!whish_orders_user_id_fkey(email_verified,password_set),reviewer:users!whish_orders_reviewed_by_fkey(first_name,last_name),emails:whish_order_emails(*)',{count:'exact'})
    .order('created_at',{ascending:false}).order('id',{ascending:false})
  if(status!=='all') query=query.eq('status',status)
  const term=String(search).replace(/[^\p{L}\p{N}@ .+_-]/gu,'').slice(0,100)
  if(term) query=query.or(`email.ilike.%${term}%,course_title.ilike.%${term}%,phone.ilike.%${term}%`)
  const offset=Math.max(0,Math.min(10000,Number(page)||0))*20
  const {data,error,count}=await query.range(offset,offset+19)
  if(error) return {error:'Whish requests could not be loaded.'}
  const config=whishConfiguration()
  return {rows:data||[],count,configuration:{enabled:config.enabled,ready:config.ready,recipientNumber:config.recipientNumber}}
}

export async function reviewWhishOrder({id,action,amount,reference,note}) {
  const access=await requireAdmin()
  if(!WHISH_UUID.test(id||'')||!['confirm','cancel'].includes(action))return {error:'Invalid request.'}
  const value=String(amount??'').trim()
  if(action==='confirm'&&!/^\d{1,7}(\.\d{1,2})?$/.test(value))return {error:'Enter the amount received in USD, with at most two decimal places.'}
  const cents=action==='confirm'?Math.round(Number(value)*100):null
  const admin=await createAdminClient()
  const {data,error}=await admin.rpc('review_whish_order',{p_order_id:id,p_actor_id:access.user.id,p_action:action,
    p_amount_cents:cents,p_transfer_reference:String(reference||'').trim().slice(0,160),p_note:String(note||'').trim().slice(0,2000)})
  if(error) return {error:error.code==='23505'?'This transfer reference has already been used for another payment.':error.message}
  if(action==='confirm') {
    try { after(()=>sendWhishEmail(id,'approved')) } catch(error) {console.error('Whish confirmation email scheduling failed:',error.message)}
  }
  revalidatePath('/dashboard')
  revalidatePath('/admin/dashboard')
  return {success:true,enrollmentId:data}
}

export async function reopenWhishOrder(id) {
  const access=await requireAdmin()
  if(!WHISH_UUID.test(id||'')) return {error:'Invalid request.'}
  const admin=await createAdminClient()
  const {error}=await admin.rpc('reopen_whish_order',{p_order_id:id,p_actor_id:access.user.id})
  if(error) return {error:error.message}
  revalidatePath('/admin/dashboard')
  return {success:true}
}

export async function retryWhishEmail(id,kind) {
  await requireAdmin()
  if(!WHISH_UUID.test(id||'')||!['instructions','password','approved'].includes(kind))return {error:'Invalid email request.'}
  const result=await sendWhishEmail(id,kind)
  return result==='failed'?{error:'Delivery failed. Please check the recorded email error and retry.'}:{success:true,state:result}
}
