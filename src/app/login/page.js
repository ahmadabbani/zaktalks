import AuthExperience from '@/components/AuthExperience'
import { PUBLIC_AUTH_ENTRY_ENABLED } from '@/lib/publicFeatureFlags'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'Sign In - ZakTalks',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  if (!PUBLIC_AUTH_ENTRY_ENABLED) notFound()

  return <AuthExperience initialMode="login" />
}
