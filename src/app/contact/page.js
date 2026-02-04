import { createClient } from '@/lib/supabase/server'
import ContactPage from './ContactPage'

export const metadata = {
  title: 'Contact Zak | ZakTalks',
  description: 'Get in touch with Zak for coaching, speaking engagements, or course inquiries.',
}

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <ContactPage userEmail={user?.email} />
}
