'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FaArrowLeft,
  FaBookOpen,
  FaCertificate,
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaChevronDown,
  FaClipboardCheck,
  FaCog,
  FaGraduationCap,
  FaLink,
  FaLock,
  FaPlayCircle,
  FaShoppingBag,
  FaTag,
  FaUserCheck,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa'
import { ADMIN_DASHBOARD_GROUPS, canAccessDashboardView } from '@/lib/auth/admin-dashboard-views'
import styles from '../users/admin-users.module.css'

function DashboardIcon({ name }) {
  switch (name) {
    case 'users': return <FaUsers aria-hidden="true" />
    case 'enrollments': return <FaBookOpen aria-hidden="true" />
    case 'progress': return <FaChartLine aria-hidden="true" />
    case 'performance': return <FaChartPie aria-hidden="true" />
    case 'video': return <FaPlayCircle aria-hidden="true" />
    case 'assessments': return <FaClipboardCheck aria-hidden="true" />
    case 'certificates': return <FaCertificate aria-hidden="true" />
    case 'payments': return <FaShoppingBag aria-hidden="true" />
    case 'courses': return <FaGraduationCap aria-hidden="true" />
    case 'links': return <FaLink aria-hidden="true" />
    case 'discounts': return <FaCog aria-hidden="true" />
    case 'coupons': return <FaTag aria-hidden="true" />
    case 'roles': return <FaUserShield aria-hidden="true" />
    default: return <FaChartBar aria-hidden="true" />
  }
}

export default function AdminWorkspaceShell({ access, activeView, accessDenied = false, children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.pageEyebrow}>{access.role === 'creator' ? 'Creator workspace' : 'Admin workspace'}</span>
          <h1>Platform Management</h1>
          <p>Learning, courses, payments, promotions, and access in one workspace.</p>
        </div>
        <Link href="/dashboard" className={styles.backLink}>
          <FaArrowLeft aria-hidden="true" />
          <span>Back to Site</span>
        </Link>
      </header>

      {accessDenied && <div className={styles.workspaceAccessNotice} role="status">
        That area is not enabled for this account. Your available workspace is shown below.
      </div>}

      <section className={styles.workspace}>
        {activeView && <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="admin-workspace-navigation"
        >
          <span className={styles.mobileMenuCurrent}>
            <DashboardIcon name={activeView.icon} />
            <span>{activeView.label}</span>
          </span>
          <FaChevronDown className={isMobileMenuOpen ? styles.mobileChevronOpen : ''} aria-hidden="true" />
        </button>}

        <div className={styles.workspaceGrid}>
          <aside id="admin-workspace-navigation" className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarIntro}>
              <span className={styles.sidebarIcon}><FaUserCheck aria-hidden="true" /></span>
              <strong>Admin operations</strong>
            </div>

            <nav className={styles.sidebarNavigation} aria-label="Administration">
              {ADMIN_DASHBOARD_GROUPS.map((group) => (
                <div className={styles.navigationGroup} key={group.id}>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <div className={styles.navigationItems}>
                    {group.items.map((item) => {
                      const isActive = item.id === activeView?.id
                      const isAllowed = canAccessDashboardView(access, item)
                      const className = `${styles.navigationItem} ${isActive ? styles.navigationItemActive : ''} ${!isAllowed ? styles.navigationItemLocked : ''}`

                      if (!isAllowed) {
                        return <button type="button" key={item.id} className={className} disabled>
                          <span className={styles.navigationIcon}><DashboardIcon name={item.icon} /></span>
                          <span>{item.label}</span>
                          <FaLock className={styles.navigationLock} aria-label="Not allowed" />
                        </button>
                      }

                      return <Link
                        key={item.id}
                        href={`/admin/dashboard?view=${item.id}`}
                        className={className}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => setIsMobileMenuOpen(false)}
                        scroll={false}
                      >
                        <span className={styles.navigationIcon}><DashboardIcon name={item.icon} /></span>
                        <span>{item.label}</span>
                      </Link>
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <section className={styles.mainPanel} aria-live="polite">
            {activeView ? <>
              <div className={styles.panelHeading}>
                <span className={styles.panelIcon}><DashboardIcon name={activeView.icon} /></span>
                <div>
                  <h2>{activeView.label}</h2>
                  <p>{activeView.description}</p>
                </div>
              </div>
              {children}
            </> : <div className={styles.workspaceEmptyAccess}>
              <FaLock aria-hidden="true" />
              <h2>No workspace areas assigned</h2>
              <p>An administrator can enable the areas this creator account needs.</p>
            </div>}
          </section>
        </div>
      </section>
    </main>
  )
}
