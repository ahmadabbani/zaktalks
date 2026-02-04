import AuthForm from '@/components/AuthForm'
import { signup } from '@/app/auth/actions'
import styles from '../auth.module.css'

export const metadata = {
  title: 'Create Account - ZakTalks',
  description: 'Join ZakTalks today',
}

export default function RegisterPage() {
  return (
    <div className={styles.authContainer}>
      <div className="container">
        <AuthForm type="register" action={signup} />
      </div>
    </div>
  )
}