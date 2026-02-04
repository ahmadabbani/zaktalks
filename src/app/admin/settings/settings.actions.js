'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all admin settings
 */
export async function getAdminSettings() {
  const supabase = await createClient()
  
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
  
  revalidatePath('/admin/settings')
  return { success: true }
}

/**
 * Update multiple admin settings at once
 */
export async function updateAdminSettings(formData) {
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
  
  revalidatePath('/admin/settings')
  return { success: true }
}
