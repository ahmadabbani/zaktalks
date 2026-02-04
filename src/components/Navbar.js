import { createClient } from '@/lib/supabase/server'
import { signout } from '@/app/auth/actions'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let role = null
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role
  }

  return <NavbarClient user={user} role={role} signout={signout} />
}