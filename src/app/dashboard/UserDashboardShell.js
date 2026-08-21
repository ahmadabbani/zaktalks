'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  FaBars,
  FaBookOpen,
  FaCertificate,
  FaChevronLeft,
  FaClipboardCheck,
  FaCoins,
  FaCompass,
  FaLifeRing,
  FaReceipt,
  FaTimes,
  FaUserCog,
} from 'react-icons/fa'
import styles from './dashboard.module.css'

const navigationGroups = [
  {
    label: 'Learning',
    items: [
      { id: 'courses', label: 'My Courses', icon: FaBookOpen, available: true },
      { id: 'assessments', label: 'Assessment Results', icon: FaClipboardCheck, available: true },
      { id: 'certificates', label: 'Certificates', icon: FaCertificate },
    ],
  },
  {
    label: 'Explore',
    items: [
      { id: 'catalog', label: 'Discover Courses', icon: FaCompass, available: true },
      { id: 'rewards', label: 'Points & Rewards', icon: FaCoins },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'purchases', label: 'Purchase History', icon: FaReceipt, available: true },
      { id: 'profile', label: 'Profile & Security', icon: FaUserCog, available: true },
      { id: 'support', label: 'Help & Support', icon: FaLifeRing },
    ],
  },
]

function getInitials(firstName, lastName) {
  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((value) => value.trim().charAt(0))
    .join('')

  return initials.toUpperCase() || 'ZT'
}

const availableSections = new Set(
  navigationGroups.flatMap((group) => group.items.filter((item) => item.available).map((item) => item.id)),
)

export default function UserDashboardShell({ profile, coursesContent, assessmentContent, discoverContent, purchaseContent, profileContent }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const requestedSection = searchParams.get('section')
  const activeSection = availableSections.has(requestedSection) ? requestedSection : 'courses'
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Learner'

  const selectSection = (sectionId) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (sectionId === 'courses') nextParams.delete('section')
    else nextParams.set('section', sectionId)
    nextParams.delete('email')
    const query = nextParams.toString()
    router.replace(query ? `/dashboard?${query}` : '/dashboard', { scroll: false })
    setIsMobileOpen(false)
  }

  return (
    <div className={`${styles.dashboardWorkspace} ${isCollapsed ? styles.dashboardWorkspaceCollapsed : ''}`}>
      <button
        type="button"
        className={styles.dashboardMobileToggle}
        onClick={() => setIsMobileOpen(true)}
        aria-label="Open dashboard navigation"
        aria-expanded={isMobileOpen}
      >
        <FaBars />
        <span>My Dashboard</span>
      </button>

      {isMobileOpen && (
        <button
          type="button"
          className={styles.dashboardSidebarBackdrop}
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close dashboard navigation"
        />
      )}

      <aside className={`${styles.dashboardSidebar} ${isMobileOpen ? styles.dashboardSidebarMobileOpen : ''}`}>
        <div className={styles.dashboardProfile}>
          <div className={styles.dashboardAvatar}>{getInitials(profile?.first_name, profile?.last_name)}</div>
          <div className={styles.dashboardProfileCopy}>
            <span>My dashboard</span>
            <strong>{displayName}</strong>
            <small>{profile?.email}</small>
          </div>
          <button
            type="button"
            className={styles.dashboardCollapseButton}
            onClick={() => setIsCollapsed((value) => !value)}
            aria-label={isCollapsed ? 'Expand dashboard navigation' : 'Collapse dashboard navigation'}
            aria-expanded={!isCollapsed}
          >
            <FaChevronLeft />
          </button>
          <button
            type="button"
            className={styles.dashboardMobileClose}
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close dashboard navigation"
          >
            <FaTimes />
          </button>
        </div>

        <div className={styles.dashboardPointsCard}>
          <span className={styles.dashboardPointsIcon}><FaCoins /></span>
          <span>
            <small>Points balance</small>
            <strong>{Number(profile?.points || 0).toLocaleString()} points</strong>
          </span>
        </div>

        <nav className={styles.dashboardNavigation} aria-label="Learner dashboard">
          {navigationGroups.map((group) => (
            <div className={styles.dashboardNavigationGroup} key={group.label}>
              <span className={styles.dashboardNavigationLabel}>{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = item.id === activeSection

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`${styles.dashboardNavigationItem} ${isActive ? styles.dashboardNavigationItemActive : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={!item.available}
                    title={!item.available ? `${item.label} will be added next` : item.label}
                    onClick={() => {
                      if (item.available) {
                        selectSection(item.id)
                      }
                    }}
                  >
                    <span className={styles.dashboardNavigationIcon}><Icon /></span>
                    <span className={styles.dashboardNavigationText}>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>

      <main className={styles.dashboardMain}>
        {activeSection === 'assessments'
          ? assessmentContent
          : activeSection === 'catalog'
            ? discoverContent
            : activeSection === 'purchases'
              ? purchaseContent
              : activeSection === 'profile'
                ? profileContent
                : coursesContent}
      </main>
    </div>
  )
}
