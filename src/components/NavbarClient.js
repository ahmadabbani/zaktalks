'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Navbar.module.css'

const serviceLinks = [
  { href: '/coaching', label: 'Coaching 1 on 1' },
  { href: '/coaching', label: 'The Courage to Be' },
  {
    href: '/courses',
    label: 'Courses · E-learning',
    children: [
      { href: '/courses', label: 'Interpersonal Communication Dynamics' },
      { href: '/courses', label: 'Unlock Your Financial Frequency' },
    ],
  },
  {
    href: '/speaking',
    label: 'Events',
    children: [
      { href: '/speaking', label: 'Speaker' },
      { href: '/speaking', label: 'Workshops' },
    ],
  },
]

export default function NavbarClient({ user, role, signout }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const [isMobileServicesOpen, setIsMobileServicesOpen] = useState(false)

  const dashboardLink = role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const dashboardText = role === 'admin' ? 'Admin' : 'Dashboard'

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/speaking', label: 'Podcast' },
    { href: '/courses', label: 'Courses' },
    { href: '/contact', label: 'Contact' },
  ]

  const toggleMenu = () => {
    setIsMobileMenuOpen((open) => !open)
    setIsMobileServicesOpen(false)
  }

  const closeMenu = () => {
    setIsMobileMenuOpen(false)
    setIsMobileServicesOpen(false)
    setIsServicesOpen(false)
  }

  const closeServicesOnBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsServicesOpen(false)
    }
  }

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const renderServicesMenu = (classNames) => (
    <ul className={classNames}>
      {serviceLinks.map((service) => (
        <li key={service.label} className={styles.serviceItem}>
          <Link href={service.href} className={styles.serviceLink} onClick={closeMenu}>
            {service.label}
          </Link>
          {service.children && (
            <ul className={styles.serviceSubmenu}>
              {service.children.map((child) => (
                <li key={child.label}>
                  <Link href={child.href} className={styles.serviceSubLink} onClick={closeMenu}>
                    {child.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <nav className={styles.navbar} aria-label="Main navigation">
      <div className="container">
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo} aria-label="ZakTalks home" onClick={closeMenu}>
            <Image
              src="/logowhite1.png"
              alt="ZakTalks"
              width={120}
              height={50}
              priority
            />
          </Link>

          <div className={styles.desktopMenu}>
            <div className={styles.navLinksWrapper}>
              {navLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              ))}

              <div
                className={styles.servicesDropdown}
                onMouseEnter={() => setIsServicesOpen(true)}
                onMouseLeave={() => setIsServicesOpen(false)}
                onFocus={() => setIsServicesOpen(true)}
                onBlur={closeServicesOnBlur}
              >
                <button
                  type="button"
                  className={`${styles.navLink} ${styles.servicesTrigger} ${pathname === '/coaching' ? styles.active : ''}`}
                  aria-expanded={isServicesOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsServicesOpen((open) => !open)}
                >
                  Services <span className={styles.chevron} aria-hidden="true" />
                </button>
                <div className={`${styles.servicesMenu} ${isServicesOpen ? styles.servicesMenuOpen : ''}`}>
                  {renderServicesMenu(styles.serviceMenuList)}
                </div>
              </div>

              {navLinks.slice(2, 4).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              ))}

              {user && (
                <Link
                  href={dashboardLink}
                  className={`${styles.navLink} ${pathname === dashboardLink ? styles.active : ''}`}
                >
                  {dashboardText}
                </Link>
              )}

              {navLinks.slice(4).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${styles.navLink} ${pathname === link.href ? styles.active : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {user ? (
              <form action={signout}>
                <button type="submit" className={styles.btnPrimary}>
                  Sign Out
                </button>
              </form>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${styles.navLink} ${pathname === '/login' ? styles.active : ''}`}
                >
                  Log in
                </Link>
                <Link href="/courses" className={styles.btnPrimary}>
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={`${styles.burgerMenu} ${isMobileMenuOpen ? styles.active : ''}`}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={toggleMenu}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`${styles.mobileMenuOverlay} ${isMobileMenuOpen ? styles.active : ''}`}>
        <div className={styles.mobileMenu} id="mobile-navigation">
          {navLinks.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileNavLink} ${pathname === link.href ? styles.mobileActive : ''}`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}

          <div className={styles.mobileServices}>
            <button
              type="button"
              className={`${styles.mobileNavLink} ${styles.mobileServicesTrigger} ${pathname === '/coaching' ? styles.mobileActive : ''}`}
              aria-expanded={isMobileServicesOpen}
              onClick={() => setIsMobileServicesOpen((open) => !open)}
            >
              Services <span className={styles.chevron} aria-hidden="true" />
            </button>
            <div className={`${styles.mobileServicesMenu} ${isMobileServicesOpen ? styles.mobileServicesMenuOpen : ''}`}>
              {renderServicesMenu(styles.mobileServiceMenuList)}
            </div>
          </div>

          {navLinks.slice(2, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileNavLink} ${pathname === link.href ? styles.mobileActive : ''}`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}

          {user && (
            <Link
              href={dashboardLink}
              className={`${styles.mobileNavLink} ${pathname === dashboardLink ? styles.mobileActive : ''}`}
              onClick={closeMenu}
            >
              {dashboardText}
            </Link>
          )}

          {navLinks.slice(4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.mobileNavLink} ${pathname === link.href ? styles.mobileActive : ''}`}
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <form action={signout}>
              <button type="submit" className={styles.mobileBtnPrimary} onClick={closeMenu}>
                Sign Out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                className={`${styles.mobileNavLink} ${pathname === '/login' ? styles.mobileActive : ''}`}
                onClick={closeMenu}
              >
                Log in
              </Link>
              <Link href="/courses" className={styles.mobileBtnPrimary} onClick={closeMenu}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
