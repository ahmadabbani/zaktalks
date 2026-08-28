import AuthExperience from '@/components/AuthExperience'
import { PUBLIC_AUTH_ENTRY_ENABLED } from '@/lib/publicFeatureFlags'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Create Account - ZakTalks',
  description: 'Join ZakTalks today',
}

export default function RegisterPage() {
  if (!PUBLIC_AUTH_ENTRY_ENABLED) notFound()

  return <AuthExperience initialMode="register" />
}
