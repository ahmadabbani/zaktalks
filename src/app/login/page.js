import AuthForm from '@/components/AuthForm'
import { login } from '@/app/auth/actions'
import styles from '../auth.module.css'

export const metadata = {
  title: 'Sign In - ZakTalks',
  description: 'Sign in to your account',
}

export default function LoginPage() {
  return (
    <div className={styles.authContainer}>
      <div className="container">
        <AuthForm type="login" action={login} />
      </div>
    </div>
  )
}