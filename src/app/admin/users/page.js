import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FaArrowLeft, FaUsers } from 'react-icons/fa'
import styles from './admin-users.module.css'
import UsersListClient from './UsersListClient'

export default async function AdminUsersPage() {
  const supabase = await createClient()
  
  // Fetch all users with their enrollments (purchases)
  const { data: users, error } = await supabase
    .from('users')
    .select(`
      id,
      first_name,
      last_name,
      email,
      email_verified,
      role,
      created_at,
      enrollments:user_enrollments(
        id,
        amount_paid_cents,
        original_price_cents,
        discount_applied_cents,
        first_purchase_discount_applied,
        coupon_id,
        payment_status,
        created_at,
        course:courses(
          id,
          title
        ),
        coupon:coupons(
          code,
          discount_type,
          discount_value
        )
      )
    `)
    .order('created_at', { ascending: false })

  // Filter only completed purchases for each user
  const usersWithPurchases = users?.map(user => ({
    ...user,
    completedPurchases: user.enrollments?.filter(e => e.payment_status === 'completed') || []
  }))

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>User Management</h1>
        <Link href="/admin/dashboard" className={styles.backLink}>
          <FaArrowLeft /> Back to Dashboard
        </Link>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--color-error)', 
          color: 'white', 
          padding: 'var(--space-md)', 
          borderRadius: '0.5rem',
          marginBottom: 'var(--space-lg)'
        }}>
          {error.message}
        </div>
      )}

      {!users || users.length === 0 ? (
        <div className={styles.emptyState}>
          <FaUsers />
          <p>No users found</p>
        </div>
      ) : (
        <UsersListClient users={usersWithPurchases} />
      )}
    </div>
  )
}
