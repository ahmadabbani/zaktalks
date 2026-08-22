import AuthExperience from '@/components/AuthExperience'

export const metadata = {
  title: 'Create Account - ZakTalks',
  description: 'Join ZakTalks today',
}

export default function RegisterPage() {
  return <AuthExperience initialMode="register" />
}
