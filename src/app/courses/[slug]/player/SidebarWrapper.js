'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { FaChevronDown, FaLayerGroup } from 'react-icons/fa'
import { TbLayoutSidebarLeftCollapse, TbLayoutSidebarLeftExpand } from 'react-icons/tb'
import styles from './player-layout.module.css'

export default function SidebarWrapper({ children }) {
  const [mobileMenuState, setMobileMenuState] = useState(null)
  const [isDesktopOpen, setIsDesktopOpen] = useState(true)
  const pathname = usePathname()
  const isMobileOpen = mobileMenuState?.pathname === pathname && mobileMenuState.isOpen

  return (
    <>
      {/* Desktop sidebar (visible on > 992px via CSS) */}
      <div className={`${styles.desktopSidebarShell} ${!isDesktopOpen ? styles.desktopSidebarShellClosed : ''}`}>
        <aside className={styles.sidebar} aria-hidden={!isDesktopOpen}>
          {children}
        </aside>
        <button
          type="button"
          className={styles.desktopSidebarToggle}
          onClick={() => setIsDesktopOpen((current) => !current)}
          aria-label={isDesktopOpen ? 'Hide course modules' : 'Show course modules'}
          aria-expanded={isDesktopOpen}
          title={isDesktopOpen ? 'Hide course modules' : 'Show course modules'}
        >
          {isDesktopOpen ? <TbLayoutSidebarLeftCollapse /> : <TbLayoutSidebarLeftExpand />}
        </button>
      </div>

      {/* Dropdown toggle button (visible on <= 992px via CSS) */}
      <button
        className={styles.sidebarToggle}
        onClick={() => setMobileMenuState({ pathname, isOpen: !isMobileOpen })}
        aria-label={isMobileOpen ? 'Close course modules' : 'Open course modules'}
        aria-expanded={isMobileOpen}
      >
        <span className={styles.sidebarToggleLabel}>
          <FaLayerGroup /> Course Modules
        </span>
        <FaChevronDown className={`${styles.toggleIcon} ${isMobileOpen ? styles.toggleIconOpen : ''}`} />
      </button>

      {/* Dropdown panel (visible on <= 992px via CSS) */}
      <div className={`${styles.dropdownPanel} ${isMobileOpen ? styles.dropdownPanelOpen : ''}`}>
        {children}
      </div>
    </>
  )
}
