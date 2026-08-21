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
  FaLock,
  FaPlayCircle,
  FaShoppingBag,
  FaUserCheck,
  FaUserShield,
  FaUsers,
} from 'react-icons/fa'
import OverviewDashboard from './OverviewDashboard'
import UserDirectory from './UserDirectory'
import EnrollmentsDashboard from './EnrollmentsDashboard'
import LearningProgressDashboard from './LearningProgressDashboard'
import CoursePerformanceDashboard from './CoursePerformanceDashboard'
import VideoAnalyticsDashboard from './VideoAnalyticsDashboard'
import AssessmentResultsDashboard from './AssessmentResultsDashboard'
import PaymentsDashboard from './PaymentsDashboard'
import RolesAccessDashboard from './RolesAccessDashboard'
import styles from './admin-users.module.css'

const navigationGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'overview', permission: 'users.overview', label: 'Overview & Stats', description: 'Key user metrics and activity at a glance.', icon: FaChartBar },
      { id: 'directory', permission: 'users.directory', label: 'User Directory', description: 'Search, review, and manage every user account.', icon: FaUsers },
    ],
  },
  {
    label: 'Learning',
    items: [
      { id: 'enrollments', permission: 'users.enrollments', label: 'Enrollments', description: 'Review course access and enrollment records.', icon: FaBookOpen },
      { id: 'progress', permission: 'users.progress', label: 'Learning Progress', description: 'Track module completion and learner progress.', icon: FaChartLine },
      { id: 'course-performance', permission: 'users.course_performance', label: 'Course Performance', description: 'Compare course health, engagement, and outcomes.', icon: FaChartPie },
      { id: 'video-analytics', permission: 'users.video_analytics', label: 'Video Analytics', description: 'Understand viewing progress and learning activity.', icon: FaPlayCircle },
      { id: 'assessments', permission: 'users.assessments', label: 'Assessment Results', description: 'Review attempts, scores, and completion results.', icon: FaClipboardCheck },
      { id: 'certificates', permission: 'users.certificates', label: 'Certificates', description: 'Manage earned and issued certificates.', icon: FaCertificate },
    ],
  },
  {
    label: 'Administration',
    items: [
      { id: 'purchases', permission: 'users.purchases', label: 'Payments', description: 'Review payments, discounts, fulfillment, and order history.', icon: FaShoppingBag },
      { id: 'roles', adminOnly: true, label: 'Roles & Access', description: 'Control account roles and administrative access.', icon: FaUserShield },
    ],
  },
]

const views = navigationGroups.flatMap((group) => group.items)

export default function UserManagementWorkspace({ overviewData, accessRole = 'admin', allowedPermissions = [], creatorPermissions = [] }) {
  const canAccess = (view) => accessRole === 'admin' || (!view.adminOnly && allowedPermissions.includes(view.permission))
  const initialView = views.find(canAccess) || views[0]
  const [activeViewId, setActiveViewId] = useState(initialView.id)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const activeView = views.find((view) => view.id === activeViewId) ?? views[0]
  const ActiveIcon = activeView.icon

  const selectView = (viewId) => {
    const nextView = views.find((view) => view.id === viewId)
    if (!nextView || !canAccess(nextView)) return
    setActiveViewId(viewId)
    setIsMobileMenuOpen(false)
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.pageEyebrow}>Admin workspace</span>
          <h1>User Management</h1>
          <p>Users, access, learning activity, and account records.</p>
        </div>
        <Link href="/admin/dashboard" className={styles.backLink}>
          <FaArrowLeft aria-hidden="true" />
          <span>Back to Dashboard</span>
        </Link>
      </header>

      <section className={styles.workspace}>
        <button
          type="button"
          className={styles.mobileMenuButton}
          onClick={() => setIsMobileMenuOpen((current) => !current)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="user-management-navigation"
        >
          <span className={styles.mobileMenuCurrent}>
            <ActiveIcon aria-hidden="true" />
            <span>{activeView.label}</span>
          </span>
          <FaChevronDown className={isMobileMenuOpen ? styles.mobileChevronOpen : ''} aria-hidden="true" />
        </button>

        <div className={styles.workspaceGrid}>
          <aside id="user-management-navigation" className={`${styles.sidebar} ${isMobileMenuOpen ? styles.sidebarOpen : ''}`}>
            <div className={styles.sidebarIntro}>
              <span className={styles.sidebarIcon}><FaUserCheck aria-hidden="true" /></span>
              <strong>User operations</strong>
            </div>

            <nav className={styles.sidebarNavigation} aria-label="User management">
              {navigationGroups.map((group) => (
                <div className={styles.navigationGroup} key={group.label}>
                  <span className={styles.groupLabel}>{group.label}</span>
                  <div className={styles.navigationItems}>
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = item.id === activeViewId
                      const isAllowed = canAccess(item)
                      return (
                        <button
                          type="button"
                          key={item.id}
                          className={`${styles.navigationItem} ${isActive ? styles.navigationItemActive : ''} ${!isAllowed ? styles.navigationItemLocked : ''}`}
                          onClick={() => selectView(item.id)}
                          disabled={!isAllowed}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <span className={styles.navigationIcon}><Icon aria-hidden="true" /></span>
                          <span>{item.label}</span>
                          {!isAllowed && <FaLock className={styles.navigationLock} aria-label="Not allowed" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </aside>

          <section className={styles.mainPanel} aria-live="polite">
            <div className={styles.panelHeading}>
              <span className={styles.panelIcon}><ActiveIcon aria-hidden="true" /></span>
              <div>
                <h2>{activeView.label}</h2>
                <p>{activeView.description}</p>
              </div>
            </div>
            {activeViewId === 'overview' && <OverviewDashboard data={overviewData} />}
            {activeViewId === 'directory' && <UserDirectory />}
            {activeViewId === 'enrollments' && <EnrollmentsDashboard />}
            {activeViewId === 'progress' && <LearningProgressDashboard />}
            {activeViewId === 'course-performance' && <CoursePerformanceDashboard />}
            {activeViewId === 'video-analytics' && <VideoAnalyticsDashboard />}
            {activeViewId === 'assessments' && <AssessmentResultsDashboard />}
            {activeViewId === 'purchases' && <PaymentsDashboard />}
            {activeViewId === 'roles' && accessRole === 'admin' && <RolesAccessDashboard initialAccounts={(overviewData.users || []).filter((user) => user.role === 'admin' || user.role === 'creator')} initialPermissions={creatorPermissions} />}
          </section>
        </div>
      </section>
    </main>
  )
}
