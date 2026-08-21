'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resend, ZAKTALKS_EMAIL_FROM } from '@/lib/resend'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { maybeSendWelcomeEmail } from '@/lib/auth/welcome-email'
import { buildAuthCallbackUrl, escapeHtml, secureActionLink } from '@/lib/email/action-link'
import { validateNewPassword } from '@/lib/auth/password-policy'
import {
  clientIpFromServerAction,
  enforceRateLimits,
  normalizeSecurityEmail,
  PublicSecurityError,
  verifyTurnstileToken,
} from '@/lib/security/abuse-protection'

const AUTH_EMAIL_BUTTON_STYLE = 'display:inline-block;padding:10px 20px;background-color:#f4c400;color:#212c2d;text-decoration:none;border-radius:999px;font-weight:bold;'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function protectAuthAction(formData, action, email, limits) {
  const ip = await clientIpFromServerAction()

  await enforceRateLimits([
    {
      action: `${action}_ip`,
      value: ip,
      limit: limits.ipLimit,
      windowSeconds: limits.windowSeconds,
    },
    {
      action: `${action}_email`,
      value: email,
      limit: limits.emailLimit,
      windowSeconds: limits.windowSeconds,
    },
  ])

  await verifyTurnstileToken(formData.get('cf-turnstile-response'), ip)
}

function securityActionError(error) {
  if (error instanceof PublicSecurityError) return { error: error.message }
  console.error('Public authentication protection failed:', error.message)
  return { error: 'This request is temporarily unavailable. Please try again.' }
}

export async function login(formData) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const email = normalizeSecurityEmail(formData.get('email'))
  const password = formData.get('password')

  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || !password) {
    return { error: 'Invalid email or password.' }
  }

  try {
    await protectAuthAction(formData, 'auth_login', email, {
      ipLimit: 30,
      emailLimit: 15,
      windowSeconds: 15 * 60,
    })
  } catch (error) {
    return securityActionError(error)
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  // A successful password sign-in is definitive evidence that this account has
  // a usable password. This also repairs older profiles created before the flag
  // was synchronized explicitly.
  const { error: passwordStatusError } = await adminSupabase
    .from('users')
    .update({ password_set: true, updated_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .eq('password_set', false)

  if (passwordStatusError) {
    console.error('Login password-status synchronization failed:', passwordStatusError.message)
  }

  // Retries only an explicitly pending welcome. Existing accounts default to
  // not pending, so ordinary logins never create a new welcome notification.
  after(() => maybeSendWelcomeEmail(data.user.id))

  // Check user role for redirection
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', data.user.id)
    .single()

  revalidatePath('/', 'layout')

  if (profile?.role === 'admin' || profile?.role === 'creator') {
    redirect('/admin/dashboard')
  } else {
    redirect('/dashboard')
  }
}

export async function signup(formData) {
  const adminSupabase = await createAdminClient()

  const email = normalizeSecurityEmail(formData.get('email'))
  const password = formData.get('password')
  const confirmPassword = formData.get('confirm_password')
  const firstName = typeof formData.get('first_name') === 'string'
    ? formData.get('first_name').trim().slice(0, 100)
    : ''
  const lastName = typeof formData.get('last_name') === 'string'
    ? formData.get('last_name').trim().slice(0, 100)
    : ''

  if (!EMAIL_PATTERN.test(email) || !firstName || !lastName) {
    return { error: 'Enter valid account details.' }
  }

  const passwordError = validateNewPassword(password)
  if (passwordError) return { error: passwordError }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  try {
    await protectAuthAction(formData, 'auth_signup', email, {
      ipLimit: 10,
      emailLimit: 3,
      windowSeconds: 60 * 60,
    })
  } catch (error) {
    return securityActionError(error)
  }

  let confirmationRedirect

  try {
    confirmationRedirect = buildAuthCallbackUrl({ welcome: 'signup' })
  } catch (error) {
    console.error('Signup callback URL error:', error.message)
    return { error: 'Account setup is temporarily unavailable. Please try again.' }
  }

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
      redirectTo: confirmationRedirect,
    },
  })

  if (error) {
    console.error('Signup error:', error)
    return { error: error.message }
  }

  if (!data?.user?.id) {
    return { error: 'Account setup did not return a valid user. Please try again.' }
  }

  const { error: passwordStatusError } = await adminSupabase
    .from('users')
    .update({
      password_set: true,
      welcome_email_pending: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.user.id)

  if (passwordStatusError) {
    console.error('Signup password-status error:', passwordStatusError.message)
    return { error: 'Account created but its setup status could not be saved. Please contact support.' }
  }

  // Send the email with Resend
  const { properties } = data
  const confirmationLink = properties.action_link
  const confirmationButton = secureActionLink(
    confirmationLink,
    'Confirm Email',
    AUTH_EMAIL_BUTTON_STYLE,
  )
  
  try {
    const { error: emailError } = await resend.emails.send({
      from: ZAKTALKS_EMAIL_FROM,
      to: email,
      subject: 'Confirm your ZakTalks email',
      html: `
        <h1>Confirm your email, ${escapeHtml(firstName)}</h1>
        <p>Please confirm your account by clicking the link below:</p>
        <p>${confirmationButton}</p>
        <p>This secure link is single-use. If the button does not work, request a new confirmation email.</p>
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return { error: 'Account created but failed to send confirmation email. Please contact support.' }
    }
  } catch (emailError) {
    console.error('Resend error:', emailError)
    return { error: 'Account created but failed to send confirmation email. Please contact support.' }
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
  const email = normalizeSecurityEmail(formData.get('email'))
  const genericResult = {
    success: true,
    message: 'If an account exists for that email, a secure reset link has been sent.',
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { error: 'Enter a valid email address.' }
  }

  try {
    await protectAuthAction(formData, 'auth_recovery', email, {
      ipLimit: 10,
      emailLimit: 3,
      windowSeconds: 60 * 60,
    })
  } catch (error) {
    return securityActionError(error)
  }

  let recoveryRedirect

  try {
    recoveryRedirect = buildAuthCallbackUrl({ next: '/auth/update-password' })
  } catch (error) {
    console.error('Password recovery callback URL error:', error.message)
    return { error: 'Password recovery is temporarily unavailable. Please try again.' }
  }

  // Generate reset link MANUALLY
  const { data, error } = await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: recoveryRedirect,
    },
  })

  if (error) {
    // Never reveal whether an address belongs to an account.
    console.info('Password recovery link was not generated:', error.message)
    return genericResult
  }

  // Send email via Resend
  const { properties } = data
  const resetLink = properties.action_link
  const resetButton = secureActionLink(
    resetLink,
    'Reset Password',
    AUTH_EMAIL_BUTTON_STYLE,
  )

  try {
    const { error: emailError } = await resend.emails.send({
      from: ZAKTALKS_EMAIL_FROM,
      to: email,
      subject: 'Reset your ZakTalks Password',
      html: `
        <h1>Password Reset Request</h1>
        <p>Click the link below to set a new password:</p>
        <p>${resetButton}</p>
        <p>This secure link is single-use. If it has expired, request a new password reset.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return genericResult
    }
  } catch (emailError) {
    console.error('Resend error:', emailError)
    return genericResult
  }

  return genericResult
}

export async function updatePassword(formData) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const password = formData.get('password')
  const confirmPassword = formData.get('confirm_password')

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const passwordError = validateNewPassword(password)
  if (passwordError) return { error: passwordError }

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'No active session. Please click the link in your email again.' }
  }

  const { data: profileBeforeUpdate, error: profileReadError } = await adminSupabase
    .from('users')
    .select('password_set')
    .eq('id', user.id)
    .single()

  if (profileReadError) {
    console.error('Password setup profile read failed:', profileReadError.message)
    return { error: 'Account setup could not be verified. Please try again.' }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error('updatePassword - Error:', error.message)
    return { error: error.message }
  }

  const { error: passwordStatusError } = await adminSupabase
    .from('users')
    .update({ password_set: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (passwordStatusError) {
    console.error('Password-status synchronization failed:', passwordStatusError.message)
    return { error: 'Your password was updated, but account setup could not be finalized. Please contact support.' }
  }

  if (!profileBeforeUpdate.password_set) {
    const { data: guestCheckout, error: guestCheckoutError } = await adminSupabase
      .from('checkout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .eq('fulfillment_state', 'fulfilled')
      .not('password_setup_email_sent_at', 'is', null)
      .limit(1)
      .maybeSingle()

    if (guestCheckoutError) {
      console.error('Guest welcome eligibility check failed:', guestCheckoutError.message)
    } else if (guestCheckout) {
      const { error: pendingError } = await adminSupabase
        .from('users')
        .update({ welcome_email_pending: true, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .is('welcome_email_sent_at', null)

      if (pendingError) {
        console.error('Unable to mark guest welcome email pending:', pendingError.message)
      }
    }
  }

  after(() => maybeSendWelcomeEmail(user.id))

  redirect('/dashboard')
}
