'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const MAX_NAME_LENGTH = 80

function cleanName(value) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : ''
}

export async function updateLearnerProfile(formData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Your session has expired. Please sign in again.' }
  }

  const firstName = cleanName(formData.get('first_name'))
  const lastName = cleanName(formData.get('last_name'))

  if (!firstName || !lastName) {
    return { success: false, error: 'Enter both your first and last name.' }
  }

  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
    return { success: false, error: 'Names must be 80 characters or fewer.' }
  }

  const { data: profile, error } = await supabase
    .from('users')
    .update({
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select('first_name, last_name, updated_at')
    .single()

  if (error || !profile) {
    console.error('Learner profile update failed:', error?.message)
    return { success: false, error: 'Your profile could not be updated. Please try again.' }
  }

  revalidatePath('/dashboard')

  return {
    success: true,
    message: 'Your profile has been updated.',
    profile,
  }
}
