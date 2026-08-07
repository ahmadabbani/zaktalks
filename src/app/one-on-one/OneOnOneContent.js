'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './one-on-one.module.css'

const BOOKING_URL =
  'https://calendly.com/zaktalks/1-1-session-with-zak?back=1&month=2026-01'

export default function OneOnOneContent() {
  const [heroReady, setHeroReady] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <main className={styles.page}>
      <section
        className={`${styles.hero} ${heroReady ? styles.heroReady : ''}`}
        aria-labelledby="one-on-one-hero-heading"
      >
        <div className={`${styles.contentWidth} ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Private 1:1 Coaching</p>

            <h1 id="one-on-one-hero-heading" className={styles.heroTitle}>
              When the conversation gets hard, it means we&rsquo;re getting somewhere.
            </h1>

            <div className={styles.heroActions}>
              <Link
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className={styles.primaryCta}
              >
                <span>Book Your Session</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>

              <Link href="#who-is-it-for" className={styles.secondaryCta}>
                <span>Who is it for</span>
              </Link>
            </div>
          </div>

          {/* Stretches the full hero height so the frame, pinned with
              margin-top:auto, seats its bottom edge on the hero's own bottom
              edge — the seam is a layout relationship, not a magic offset. */}
          <div className={styles.heroVisual}>
            <div className={styles.heroImageFrame}>
              <img
                src="/1on1-hero.jpg"
                alt="Zak Dakkash holding a microphone during a session"
                className={styles.heroImage}
              />

              <div className={styles.heroFactCard}>
                <p className={styles.factValue}>20+</p>
                <p className={styles.factLabel}>Years of experience</p>

                <p className={styles.factTitle}>Co-Creative Transactional Analysis</p>
                <p className={styles.factNote}>Practitioner, coach and educator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quoteSection} aria-label="Quote">
        <div className={styles.contentWidth}>
          <blockquote className={styles.quoteBlock}>
            <p className={styles.quote}>
              &ldquo;A Safe Space To Finally Tell Yourself The Truth&rdquo;
            </p>
          </blockquote>
        </div>
      </section>
    </main>
  )
}
