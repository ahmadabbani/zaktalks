import { requireAdmin } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }) {
  try {
    await requireAdmin()
  } catch (error) {
    redirect('/dashboard') // Or /login if not logged in at all
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {children}
    </div>
  )
}
