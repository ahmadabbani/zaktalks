import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAccessContext } from '@/lib/auth-utils'
import Link from 'next/link'
import { FaChartLine, FaUsers, FaDollarSign, FaGraduationCap, FaCog, FaTicketAlt, FaArrowLeft, FaArrowRight } from 'react-icons/fa'
import styles from './admin-dashboard.module.css'

export default async function AdminDashboardPage() {
  const access = await getAccessContext()
  const supabase = await createAdminClient()
  const can = (permission) => access.role === 'admin' || access.permissions.includes(permission)
  const canSeeUsers = access.role === 'admin' || access.permissions.some((permission) => permission.startsWith('users.'))
  const canSeeCourses = can('courses.view') || can('courses.create') || can('courses.edit') || can('courses.content')
  const canSeeOverview = can('dashboard.overview')

  const [{ count: coursesCount }, { count: verifiedStudentsCount }, { data: enrollments }] = canSeeOverview
    ? await Promise.all([
      supabase.from('courses').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user').eq('email_verified', true),
      supabase.from('user_enrollments').select('amount_paid_cents').eq('payment_status', 'completed'),
    ])
    : [{ count: 0 }, { count: 0 }, { data: [] }]
  
  const totalRevenueCents = enrollments?.reduce((sum, e) => sum + (e.amount_paid_cents || 0), 0) || 0
  const totalRevenue = (totalRevenueCents / 100).toFixed(2)
  return (
    <div className={styles.dashboard}>
      <div className={styles.welcome}>
        <span className={styles.welcomeEyebrow}>{access.role === 'creator' ? 'Creator access' : 'Administration'}</span>
        <h1>{access.role === 'creator' ? 'Creator Workspace' : 'Admin Dashboard'}</h1>
        <p>{access.role === 'creator' ? 'Your assigned management areas and tools.' : 'Manage your courses, users, and platform settings'}</p>
      </div>

      {/* Overview Statistics */}
      {canSeeOverview && <section className={styles.overviewSection}>
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
      </section>}

      <section className={styles.navigationSection}>
        <div className={styles.navigationHeader}>
          <div>
            <span>Workspace</span>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
          </div>
          <p>Core platform management areas.</p>
        </div>
        <div className={styles.widgetsGrid}>
          {canSeeCourses && <Link href="/admin/courses" className={styles.widgetCard}>
            <div className={styles.widgetTop}>
              <div className={styles.widgetIcon}><FaGraduationCap /></div>
              <FaArrowRight className={styles.widgetArrow} />
            </div>
            <span className={styles.widgetLabel}>Courses</span>
            <h3 className={styles.widgetTitle}>Manage Courses</h3>
            <p className={styles.widgetDescription}>
              Create, edit, and organize course content, modules, and lessons.
            </p>
          </Link>}

          {canSeeUsers && <Link href="/admin/users" className={styles.widgetCard}>
            <div className={styles.widgetTop}>
              <div className={styles.widgetIcon}><FaUsers /></div>
              <FaArrowRight className={styles.widgetArrow} />
            </div>
            <span className={styles.widgetLabel}>People</span>
            <h3 className={styles.widgetTitle}>Users</h3>
            <p className={styles.widgetDescription}>
              Review accounts, enrollments, learning progress, and access.
            </p>
          </Link>}

          {can('settings.manage') && <Link href="/admin/settings" className={styles.widgetCard}>
            <div className={styles.widgetTop}>
              <div className={styles.widgetIcon}><FaCog /></div>
              <FaArrowRight className={styles.widgetArrow} />
            </div>
            <span className={styles.widgetLabel}>Platform</span>
            <h3 className={styles.widgetTitle}>Discount Settings</h3>
            <p className={styles.widgetDescription}>
              Configure first-purchase discounts and the points system.
            </p>
          </Link>}

          {can('coupons.manage') && <Link href="/admin/coupons" className={styles.widgetCard}>
            <div className={styles.widgetTop}>
              <div className={styles.widgetIcon}><FaTicketAlt /></div>
              <FaArrowRight className={styles.widgetArrow} />
            </div>
            <span className={styles.widgetLabel}>Promotions</span>
            <h3 className={styles.widgetTitle}>Coupons</h3>
            <p className={styles.widgetDescription}>
              Create and manage promotional coupon codes and availability.
            </p>
          </Link>}
        </div>
      </section>

      {/* Bottom Actions */}
      <div className={styles.bottomActions}>
        <Link href="/dashboard" className={styles.backLink}>
          <FaArrowLeft /> Back to Site
        </Link>
      </div>
    </div>
  )
}
