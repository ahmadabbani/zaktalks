'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import styles from './Navbar.module.css'

export default function NavbarClient({ user, role, signout }) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const dashboardLink = role === 'admin' ? '/admin/dashboard' : '/dashboard'
  const dashboardText = role === 'admin' ? 'Admin' : 'Dashboard'
  
  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/courses', label: 'Courses' },
    { href: '/speaking', label: 'The Podcast' },
    { href: '/coaching', label: 'Coaching' },
    { href: '/contact', label: 'Contact' },
  ]

  const toggleMenu = () => setIsMobileMenuOpen(prev => !prev)
  const closeMenu = () => setIsMobileMenuOpen(false)

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  return (
    <nav className={styles.navbar}>
      <div className="container">
        <div className={styles.navContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <Image 
              src="/logo.png" 
              alt="Logo" 
              width={120} 
              height={50}
              priority
            />
          </Link>

          {/* Desktop Menu */}
          <div className={styles.desktopMenu}>
            <div className={styles.navLinksWrapper}>
              {navLinks.map((link) => (
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
              <>
                <Link 
                  href={dashboardLink}
                  className={`${styles.navLink} ${pathname === dashboardLink ? styles.active : ''}`}
                >
                  {dashboardText}
                </Link>
                <form action={signout}>
                  <button type="submit" className={styles.btnPrimary}>
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link 
                  href="/login" 
                  className={`${styles.navLink} ${pathname === '/login' ? styles.active : ''}`}
                >
                  Login
                </Link>
                <Link href="/courses" className={styles.btnPrimary}>
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className={`${styles.burgerMenu} ${isMobileMenuOpen ? styles.active : ''}`}
            aria-label="Toggle menu"
            onClick={toggleMenu}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`${styles.mobileMenuOverlay} ${isMobileMenuOpen ? styles.active : ''}`}>
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
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
            <>
              <Link 
                href={dashboardLink}
                className={`${styles.mobileNavLink} ${pathname === dashboardLink ? styles.mobileActive : ''}`}
                onClick={closeMenu}
              >
                {dashboardText}
              </Link>
              <form action={signout}>
                <button type="submit" className={styles.mobileBtnPrimary} onClick={closeMenu}>
                  Sign Out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link 
                href="/login" 
                className={`${styles.mobileNavLink} ${pathname === '/login' ? styles.mobileActive : ''}`}
                onClick={closeMenu}
              >
                Login
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