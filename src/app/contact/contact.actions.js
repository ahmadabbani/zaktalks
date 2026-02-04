'use server'

import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend'

export async function sendContactEmail(formData) {
  const supabase = await createClient()
  
  // 1. Check Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Please register or login first.' }
  }

  // 2. Extract Data
  const name = formData.get('name')
  const phone = formData.get('phone')
  const message = formData.get('message')

  // 3. Validation (Server Side)
  if (!name || name.trim().length === 0) return { error: 'Name is required' }
  if (!phone || phone.trim().length === 0) return { error: 'Phone number is required' }
  if (!message || message.trim().length === 0) return { error: 'Message is required' }

  const userEmail = user.email
  const ownerEmail = 'onboarding@resend.dev' // Verified sender in Resend sandbox

  try {
    const { data, error } = await resend.emails.send({
      from: `ZakTalks Contact <${ownerEmail}>`,
      to: ownerEmail,
      reply_to: userEmail,
      subject: `New message from ${name} via ZakTalks`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #F1C40F;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p><strong>Message:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #888;">
            This email was sent from the ZakTalks contact form. You can reply directly to this email to reach the user.
          </p>
        </div>
      `
    })

    if (error) {
      console.error('Resend error:', error)
      return { error: 'Failed to send email. Please try again later.' }
    }

    return { success: true, message: 'Message sent successfully! We will get back to you soon.' }
  } catch (err) {
    console.error('Contact action error:', err)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}
