import Image from 'next/image'
import Link from 'next/link'
import {
  FaApple,
  FaEnvelope,
  FaFacebookF,
  FaHeadphones,
  FaInstagram,
  FaMapMarkerAlt,
  FaSpotify,
  FaTiktok,
  FaYoutube,
} from 'react-icons/fa'
import styles from './Footer.module.css'

const quickLinks = [
  { href: '/coaching', label: 'Coaching 1 on 1' },
  { href: '/coaching', label: 'Becoming Again' },
  { href: '/courses', label: 'Online Courses' },
  { href: '/speaking', label: 'Events' },
]

const socialLinks = [
  { href: 'https://www.instagram.com/zak_talks/', label: 'Instagram', icon: FaInstagram },
  { href: 'https://www.facebook.com/share/1DRC6pYKhu/', label: 'Facebook', icon: FaFacebookF },
  { href: 'https://www.tiktok.com/@zaktalkss?_r=1&_t=ZS-98H142Tj8kS', label: 'TikTok', icon: FaTiktok },
  { href: 'https://www.youtube.com/@zak_talks', label: 'YouTube', icon: FaYoutube },
  { href: 'https://play.anghami.com/podcast/1067932393', label: 'Anghami', icon: FaHeadphones },
  { href: 'https://open.spotify.com/show/7E5OWIxCjKRPnEsQaL5o44', label: 'Spotify', icon: FaSpotify },
  { href: 'https://podcasts.apple.com/us/podcast/zak-talks/id1818978849?at=1000lHKX&ct=linktree_http&itsct=lt_p&itscg=30200&ls=1', label: 'Apple Podcasts', icon: FaApple },
]

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContainer}>
            <div className={styles.footerGrid}>
              <div className={styles.brandColumn}>
                <div className={styles.brandIntro}>
                  <Link href="/" className={styles.logoFrame} aria-label="ZakTalks home">
                    <Image
                      src="/logowhite1.png"
                      alt="ZakTalks"
                      width={220}
                      height={110}
                      className={styles.logo}
                    />
                  </Link>
                  <p className={styles.brandText}>
                    Conversations and learning experiences for living, relating, and growing with more intention.
                  </p>
                </div>
              <div className={styles.socialBlock} aria-label="Find ZakTalks">
                <p className={styles.socialText}>Follow Zak:</p>
                <div className={styles.socialLinks}>
                  {socialLinks.map(({ href, label, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialIcon}
                      aria-label={label}
                      title={label}
                    >
                      <Icon aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <section className={styles.footerColumn} aria-labelledby="footer-contact-title">
              <h2 id="footer-contact-title" className={styles.footerTitle}>Contact info</h2>
              <div className={styles.contactLinks}>
                <a href="mailto:hello@zaktalks.com" className={styles.contactLink}>
                  <FaEnvelope aria-hidden="true" />
                  <span>hello@zaktalks.com</span>
                </a>
                <a
                  href="https://share.google/L3jYcCUZawsNWY1c0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.contactLink}
                >
                  <FaMapMarkerAlt aria-hidden="true" />
                  <span>
                    <strong>Antonio&apos;s Center, Byblos</strong>
                    <small>Lebanon</small>
                  </span>
                </a>
              </div>
            </section>

            <section className={styles.footerColumn} aria-labelledby="footer-links-title">
              <h2 id="footer-links-title" className={styles.footerTitle}>Quick access</h2>
              <nav aria-label="Footer navigation">
                <ul className={styles.quickLinks}>
                  {quickLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={styles.quickLink}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </section>

          </div>

          <div className={styles.footerBottom}>
            <div className={styles.legalLinks}>
              <Link href="/privacy-policy" className={styles.legalLink}>Privacy Policy</Link>
              <Link href="/terms-of-use" className={styles.legalLink}>Terms of Service</Link>
              <Link href="/refund-policy" className={styles.legalLink}>Refund Policy</Link>
            </div>
            <p className={styles.copyright}>@2026 zaktalks all rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
