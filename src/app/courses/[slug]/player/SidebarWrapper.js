'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { FaChevronDown, FaList } from 'react-icons/fa'
import styles from './player-layout.module.css'

export default function SidebarWrapper({ children }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Close dropdown when navigating to a new lesson
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <>
      {/* Desktop sidebar (visible on > 992px via CSS) */}
      <aside className={styles.sidebar}>
        {children}
      </aside>

      {/* Dropdown toggle button (visible on <= 992px via CSS) */}
      <button
        className={styles.sidebarToggle}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close lessons menu' : 'Open lessons menu'}
      >
        <span className={styles.sidebarToggleLabel}>
          <FaList /> Course Lessons
        </span>
        <FaChevronDown className={`${styles.toggleIcon} ${isOpen ? styles.toggleIconOpen : ''}`} />
      </button>

      {/* Dropdown panel (visible on <= 992px via CSS) */}
      <div className={`${styles.dropdownPanel} ${isOpen ? styles.dropdownPanelOpen : ''}`}>
        {children}
      </div>
    </>
  )
}
