import AuthExperience from '@/components/AuthExperience'

export const metadata = {
  title: 'Sign In - ZakTalks',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return <AuthExperience initialMode="login" />
}
