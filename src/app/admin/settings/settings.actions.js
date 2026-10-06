'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { requirePermission } from '@/lib/auth-utils'

export async function getPointsExpiryUsers() {
  await requirePermission('settings.manage')
  const admin = await createAdminClient()
  const users=[]
  for(let offset=0;;offset+=1000){
    const {data,error}=await admin.from('users').select('id,first_name,last_name,email,points')
      .gt('points',0).order('id').range(offset,offset+999)
    if(error)return {success:false,error:'Unable to load points balances.'}
    users.push(...(data||[]))
    if((data||[]).length<1000)break
  }
  if(!users.length) return {success:true,users:[]}
  const byUser=new Map()
  for(let offset=0;offset<users.length;offset+=200){
    const {data:cycles,error}=await admin.from('user_points_cycles')
      .select('user_id,first_earned_at,cycle_started_at,resets_at,last_reset_at').in('user_id',users.slice(offset,offset+200).map(user=>user.id))
    if(error)return {success:false,error:'Unable to load points reset dates.'}
    for(const cycle of cycles||[])byUser.set(cycle.user_id,cycle)
  }
  return {success:true,users:users.sort((a,b)=>b.points-a.points).map(user=>({...user,...byUser.get(user.id)}))}
}

/**
 * Fetch all admin settings
 */
export async function getAdminSettings() {
  await requirePermission('settings.manage')
  const supabase = await createAdminClient()
  
  const { data, error } = await supabase
    .from('admin_settings')
    .select('key, value, description')
  
  if (error) {
    console.error('Error fetching admin settings:', error)
    return {}
  }
  
  // Convert array to object for easier access
  return data.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})
}

/**
 * Update a single admin setting
 */
export async function updateAdminSetting(key, value) {
  await requirePermission('settings.manage')
  const supabaseAdmin = await createAdminClient()
  
  const { error } = await supabaseAdmin
    .from('admin_settings')
    .update({ 
      value: String(value),
      updated_at: new Date().toISOString()
    })
    .eq('key', key)
  
  if (error) {
    console.error('Error updating admin setting:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/admin/dashboard')
  return { success: true }
}

export async function setFirstPurchaseDiscountEnabled(enabled) {
  await requirePermission('settings.manage')
  if (typeof enabled !== 'boolean') {
    return { success: false, error: 'Invalid first-purchase discount setting.' }
  }

  const supabaseAdmin = await createAdminClient()
  const { error } = await supabaseAdmin
    .from('admin_settings')
    .upsert({
      key: 'first_purchase_discount_enabled',
      value: String(enabled),
      description: 'Whether the first-purchase discount is offered on new checkouts',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) {
    console.error('Error updating first-purchase discount availability:', error)
    return { success: false, error: 'Failed to update the first-purchase discount.' }
  }

  revalidatePath('/admin/dashboard')
  return { success: true, enabled }
}

/**
 * Update multiple admin settings at once
 */
export async function updateAdminSettings(formData) {
  await requirePermission('settings.manage')
  const supabaseAdmin = await createAdminClient()
  
  const firstPurchasePercent = formData.get('first_purchase_discount_percent')
  const pointsDiscountPercent = formData.get('points_discount_percent')
  
  // Validate
  const fp = parseInt(firstPurchasePercent)
  const pp = parseInt(pointsDiscountPercent)
  
  if (isNaN(fp) || fp < 0 || fp > 100) {
    return { success: false, error: 'First purchase discount must be between 0 and 100' }
  }
  
  if (isNaN(pp) || pp < 0 || pp > 100) {
    return { success: false, error: 'Points discount must be between 0 and 100' }
  }
  
  // Update first purchase discount
  const { error: err1 } = await supabaseAdmin
    .from('admin_settings')
    .update({ value: String(fp), updated_at: new Date().toISOString() })
    .eq('key', 'first_purchase_discount_percent')
  
  // Update points discount
  const { error: err2 } = await supabaseAdmin
    .from('admin_settings')
    .update({ value: String(pp), updated_at: new Date().toISOString() })
    .eq('key', 'points_discount_percent')
  
  if (err1 || err2) {
    console.error('Error updating settings:', err1 || err2)
    return { success: false, error: 'Failed to update settings' }
  }
  
  revalidatePath('/admin/dashboard')
  return { success: true }
}
