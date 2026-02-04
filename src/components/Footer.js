import Image from 'next/image'
import Link from 'next/link'
import { 
  FaTiktok, 
  FaYoutube, 
  FaInstagram, 
  FaLinkedinIn, 
  FaFacebookF, 
  FaWhatsapp 
} from 'react-icons/fa'
import styles from './Footer.module.css'

export default function Footer() {
  // Use fixed year for now as requested or dynamic: "@2026 zaktalks"
  // User requested "@2026" specifically.
  const year = "2026"; 
  
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className={styles.footerContainer}>
          
          {/* Top: Logo & Socials */}
          <div className={styles.topSection}>
            <Link href="/">
              <Image 
                src="/logowhite1.png" 
                alt="ZakTalks Logo" 
                width={300} 
                height={150} 
                className={styles.logo}
              />
            </Link>
            
            <div className={styles.socialLinks}>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="TikTok">
                <FaTiktok />
              </a>
              <a href="https://www.youtube.com/@zak_talks" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="YouTube">
                <FaYoutube />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Instagram">
                <FaInstagram />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="LinkedIn">
                <FaLinkedinIn />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="Facebook">
                <FaFacebookF />
              </a>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.socialIcon} aria-label="WhatsApp">
                <FaWhatsapp />
              </a>
            </div>
          </div>

          {/* Middle: Main Navigation (Big Fonts) */}
          <nav className={styles.mainNav}>
            <Link href="/" className={styles.navLink}>Home</Link>
            <Link href="/about" className={styles.navLink}>About</Link>
            <Link href="/courses" className={styles.navLink}>Courses</Link>
            <Link href="/speaking" className={styles.navLink}>The Podcast</Link>
            <Link href="/coaching" className={styles.navLink}>Coaching</Link>
            {/* Contact is handled by the button below */}
          </nav>

          {/* Contact CTA */}
          <Link href="/contact" className={styles.contactBtn}>
            Contact Us
          </Link>

          {/* Bottom: Legal & Copyright */}
          <div className={styles.footerBottom}>
            <div className={styles.legalLinks}>
              <Link href="/privacy-policy" className={styles.legalLink}>Privacy Policy</Link>
              <Link href="/terms-of-use" className={styles.legalLink}>Terms of Use</Link>
              <Link href="/refund-policy" className={styles.legalLink}>Refund Policy</Link>
            </div>
            <p className={styles.copyright}>
              @{year} zaktalks all rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  )
}
