import { after, NextResponse } from 'next/server'
import { maybeSendWelcomeEmail } from '@/lib/auth/welcome-email'
import { createClient } from '@/lib/supabase/server'

export async function POST(req) {
  const supabase = await createClient()
  const authorization = req.headers.get('authorization') || ''
  const accessToken = authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : null

  const { data: { user }, error } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  after(() => maybeSendWelcomeEmail(user.id))
  return NextResponse.json({ received: true, status: 'scheduled' })
}
