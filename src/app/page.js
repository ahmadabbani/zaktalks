import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './page.module.css'
import ForWhomSection from '@/components/ForWhomSection'
import SocialProofSection from '@/components/SocialProofSection'
import WhatIDoSection from '@/components/WhatIDoSection'
import PodcastFeatureSection from '@/components/PodcastFeatureSection'
import AboutTeaserSection from '@/components/AboutTeaserSection'
import TestimonialsSection from '@/components/TestimonialsSection'
import CoursePreviewCtaSection from '@/components/CoursePreviewCtaSection'
import NewsletterSection from '@/components/NewsletterSection'

export default async function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            <div className={styles.heroLeft}>
              <h1 id="home-hero-heading" className={styles.heroTitle}>
                <span>What if you’ve been <strong><em>Okay</em></strong> all along?</span>
              </h1>
              <p className={styles.heroDescription}>
                <strong><em>Okayness</em></strong> begins from the position that <em>I’m OK, You’re OK</em>. Our behaviors and patterns may need to change, but our human worth is not in question. From this <strong>position</strong>, we can meet ourselves and others with <strong>Curiosity</strong>, <strong>Respect</strong> and <strong>Openness</strong> to change.
              </p>
              <div className={styles.heroActions}>
                <Link href="/courses/interpersonal-communication-dynamics" className={`${styles.primaryHeroCta} ${styles.hiddenHeroCta}`}>
                  <span className={styles.ctaLabel}>Enroll in Interpersonal Communication Dynamics</span>
                </Link>
                <Link href="/becoming-again" className={styles.secondaryHeroCta}>
                  <span className={styles.ctaLabel}>Work with Zak</span>
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.heroImageWrapper}>
                <Image
                  src="/home-hero.jpg"
                  alt="Zak speaking beside a flipchart during a live session"
                  width={2500}
                  height={3334}
                  priority
                  quality={86}
                  className={styles.heroImage}
                  sizes="(max-width: 480px) 74vw, (max-width: 700px) 70vw, (max-width: 1024px) 62vw, 460px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <ForWhomSection />
      <SocialProofSection />
      <WhatIDoSection />
      <PodcastFeatureSection />
      <AboutTeaserSection />
      <TestimonialsSection />
      <CoursePreviewCtaSection />
      <NewsletterSection />
    </main>
  )
}
