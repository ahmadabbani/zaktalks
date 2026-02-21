import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FaChartLine, FaUsers, FaDollarSign, FaGraduationCap, FaCog, FaTicketAlt, FaArrowLeft } from 'react-icons/fa'
import CreateAdminButton from './CreateAdminButton'
import styles from './admin-dashboard.module.css'

export default async function AdminDashboardPage() {
  const supabase = await createClient()

  // Fetch total courses (non-deleted)
  const { count: coursesCount } = await supabase
    .from('courses')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null)

  // Fetch verified students count (users with email_verified = true, excluding admins)
  const { count: verifiedStudentsCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'user')
    .eq('email_verified', true)

  // Fetch total revenue from completed payments
  const { data: enrollments } = await supabase
    .from('user_enrollments')
    .select('amount_paid_cents')
    .eq('payment_status', 'completed')
  
  const totalRevenueCents = enrollments?.reduce((sum, e) => sum + (e.amount_paid_cents || 0), 0) || 0
  const totalRevenue = (totalRevenueCents / 100).toFixed(2)

  return (
    <div className={styles.dashboard}>
      {/* Welcome Section */}
      <div className={styles.welcome}>
        <h1>Admin Dashboard</h1>
        <p>Manage your courses, users, and platform settings</p>
      </div>

      {/* Overview Statistics */}
      <section className={styles.overviewSection}>
        <h2 className={styles.sectionTitle}>
          <FaChartLine /> Overview
        </h2>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaGraduationCap />
            </div>
            <div className={styles.statLabel}>Total Courses</div>
            <div className={styles.statValue}>{coursesCount || 0}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaUsers />
            </div>
            <div className={styles.statLabel}>Verified Students</div>
            <div className={styles.statValue}>{verifiedStudentsCount || 0}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FaDollarSign />
            </div>
            <div className={styles.statLabel}>Total Revenue</div>
            <div className={styles.statValue}>${totalRevenue}</div>
          </div>
        </div>
      </section>

      {/* Navigation Widgets */}
      <section className={styles.navigationSection}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.widgetsGrid}>
          <Link href="/admin/courses" className={styles.widgetCard}>
            <div className={styles.widgetIcon}>
              <FaGraduationCap />
            </div>
            <h3 className={styles.widgetTitle}>Manage Courses</h3>
            <p className={styles.widgetDescription}>
              Create, edit, and organize your course content and lessons
            </p>
          </Link>

          <Link href="/admin/users" className={styles.widgetCard}>
            <div className={styles.widgetIcon}>
              <FaUsers />
            </div>
            <h3 className={styles.widgetTitle}>Users</h3>
            <p className={styles.widgetDescription}>
              View and manage all registered users and students
            </p>
          </Link>

          <Link href="/admin/settings" className={styles.widgetCard}>
            <div className={styles.widgetIcon}>
              <FaCog />
            </div>
            <h3 className={styles.widgetTitle}>Discount Settings</h3>
            <p className={styles.widgetDescription}>
              Configure first-purchase discounts and points system
            </p>
          </Link>

          <Link href="/admin/coupons" className={styles.widgetCard}>
            <div className={styles.widgetIcon}>
              <FaTicketAlt />
            </div>
            <h3 className={styles.widgetTitle}>Coupons</h3>
            <p className={styles.widgetDescription}>
              Create and manage promotional coupon codes
            </p>
          </Link>
        </div>
      </section>

      {/* Bottom Actions */}
      <div className={styles.bottomActions}>
        <Link href="/dashboard" className={styles.backLink}>
          <FaArrowLeft /> Back to Site
        </Link>
        <CreateAdminButton />
      </div>
    </div>
  )
}
