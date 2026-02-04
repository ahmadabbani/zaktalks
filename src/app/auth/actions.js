'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

export async function login(formData) {
  const supabase = await createClient()

  const email = formData.get('email')
  const password = formData.get('password')

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check user role for redirection
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}

export async function signup(formData) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const email = formData.get('email')
  const password = formData.get('password')
  const firstName = formData.get('first_name')
  const lastName = formData.get('last_name')

  // Generate confirmation link MANUALLY using Admin API
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error) {
    console.error('Signup error:', error)
    return { error: error.message }
  }

  // Send the email with Resend
  const { properties } = data
  const confirmationLink = properties.action_link
  
  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev', // TODO: Change to real domain later
      to: email,
      subject: 'Welcome to ZakTalks! Confirm your email',
      html: `
        <h1>Welcome to ZakTalks, ${firstName}!</h1>
        <p>Please confirm your account by clicking the link below:</p>
        <a href="${confirmationLink}" style="padding: 10px 20px; background-color: #FFD700; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirm Email</a>
        <p>Or copy this link: ${confirmationLink}</p>
      `
    })
  } catch (emailError) {
    console.error('Resend error:', emailError)
    return { error: 'Account created but failed to send email. Please contact support.' }
  }

  return { success: true, message: 'Check your email to confirm registration!' }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData) {
  const adminSupabase = await createAdminClient()
  const email = formData.get('email')

  // Generate reset link MANUALLY
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/auth/update-password`,
    },
  })

  if (error) {
    // Determine if we should reveal user existence. Usually no security-wise, 
    // but for UX in this specific app context, returning generic message is safer.
    console.error('Reset error:', error)
    return { error: 'Failed to send reset email. Please try again.' } 
  }

  // Send email via Resend
  const { properties } = data
  const resetLink = properties.action_link

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Reset your ZakTalks Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to set a new password:</p>
        <a href="${resetLink}" style="padding: 10px 20px; background-color: #FFD700; color: black; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        <p>Or copy this link: ${resetLink}</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    })
  } catch (emailError) {
    console.error('Resend error:', emailError)
    return { error: 'Failed to send email.' }
  }

  return { success: true, message: 'Check your email for the reset link!' }
}

export async function updatePassword(formData) {
  const supabase = await createClient()
  const password = formData.get('password')
  const confirmPassword = formData.get('confirm_password')

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  // Debug: Check current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  console.log('updatePassword - Session check:', session ? `User ID: ${session.user?.id}` : 'No session', sessionError?.message || '')
  
  if (!session) {
    return { error: 'No active session. Please click the link in your email again.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('updatePassword - Error:', error.message)
    return { error: error.message }
  }

  redirect('/dashboard')
}
