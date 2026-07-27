import Image from 'next/image'
import Link from 'next/link'
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
              <h1 className={styles.heroTitle}>
                Stop repeating the patterns that keep you stuck.
              </h1>
              <p className={styles.heroDescription}>
                Zak helps adults move from survival patterns into self-awareness, stronger communication, healthier relationships, and a more intentional life through coaching, courses, and honest conversations.
              </p>
              <div className={styles.heroActions}>
                <Link href="/courses/interpersonal-communication-dynamics" className={styles.primaryHeroCta}>
                  <span className={styles.ctaLabel}>Enroll in Interpersonal Communication Dynamics</span>
                </Link>
                <Link href="/coaching" className={styles.secondaryHeroCta}>
                  <span className={styles.ctaLabel}>Explore how I work</span>
                </Link>
              </div>
            </div>

            <div className={styles.heroRight}>
              <div className={styles.heroImageWrapper}>
                <Image
                  src="/hero.png"
                  alt="Zak"
                  width={800}
                  height={800}
                  priority
                  className={styles.heroImage}
                  sizes="(max-width: 700px) 94vw, (max-width: 1200px) 48vw, 42vw"
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
