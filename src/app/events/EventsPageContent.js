'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import EventsGallerySection from './EventsGallerySection'
import SignatureSessionsSection from './SignatureSessionsSection'
import EventsTestimonialsSection from './EventsTestimonialsSection'
import EventFormatsSection from './EventFormatsSection'
import EventsPodcastSection from './EventsPodcastSection'
import EventsNewsletterSection from './EventsNewsletterSection'
import EventPlannerQASection from './EventPlannerQASection'
import EventsBookingSection from './EventsBookingSection'
import styles from './events.module.css'

const clamp01 = (value) => {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function useEventsHeroDrift(stageRef) {
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return undefined

    const pin = stage.querySelector('[data-events-pin]')
    if (!pin) return undefined

    const pinMedia = window.matchMedia('(min-width: 1025px) and (min-height: 621px)')
    const motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
    let enabled = false
    let inView = true
    let queued = false
    let frame = 0
    let stageTop = 0
    let travel = 1
    let lastProgress = -1
    let lastCovered = null

    const reset = () => {
      pin.style.removeProperty('--events-progress')
      delete pin.dataset.eventsCovered
      lastProgress = -1
      lastCovered = null
    }

    const measure = () => {
      stageTop = stage.getBoundingClientRect().top + window.scrollY
      travel = Math.max(1, stage.offsetHeight - pin.offsetHeight)
    }

    const paint = () => {
      queued = false
      if (!enabled) return

      const scrolled = window.scrollY - stageTop
      const progress = Math.round(clamp01(scrolled / travel) * 1000) / 1000

      if (progress === lastProgress) return
      lastProgress = progress

      pin.style.setProperty('--events-progress', String(progress))

      const covered = progress >= 0.999
      if (covered !== lastCovered) {
        const value = covered ? 'true' : 'false'
        pin.dataset.eventsCovered = value
        lastCovered = covered
      }
    }

    const request = () => {
      if (queued || !enabled || !inView) return
      queued = true
      frame = window.requestAnimationFrame(paint)
    }

    const remeasure = () => {
      if (!enabled) return
      measure()
      request()
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) request()
    })

    const resizeObserver = new ResizeObserver(remeasure)

    const sync = () => {
      const next = pinMedia.matches && !motionMedia.matches
      if (next === enabled) return

      enabled = next
      if (enabled) {
        inView = true
        measure()
        observer.observe(stage)
        resizeObserver.observe(stage)
        request()
      } else {
        observer.disconnect()
        resizeObserver.disconnect()
        window.cancelAnimationFrame(frame)
        queued = false
        reset()
      }
    }

    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', remeasure)
    window.addEventListener('orientationchange', remeasure)
    pinMedia.addEventListener('change', sync)
    motionMedia.addEventListener('change', sync)
    sync()

    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('orientationchange', remeasure)
      pinMedia.removeEventListener('change', sync)
      motionMedia.removeEventListener('change', sync)
      observer.disconnect()
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frame)
      reset()
    }
  }, [stageRef])
}

export default function EventsPageContent({ galleryImages = [] }) {
  const heroStageRef = useRef(null)
  const [heroReady, setHeroReady] = useState(false)

  useEventsHeroDrift(heroStageRef)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <main className={styles.page}>
      <section
        ref={heroStageRef}
        className={`${styles.heroStage} ${heroReady ? styles.heroReady : ''}`}
        aria-labelledby="events-hero-heading"
      >
        <div className={styles.heroPin} data-events-pin>
          <div className={styles.heroPlane}>
            <div className={styles.contentWidth}>
              <div className={styles.heroGrid}>
                <div className={styles.heroCopy}>
                  <h1 id="events-hero-heading" className={styles.heroTitle}>
                    Bring ZakTalks to Your Event
                  </h1>

                  <p className={styles.heroSubheading}>
                    Some conversations stay on the surface. Others change the way people see
                    themselves, each other, and the patterns they keep repeating.
                  </p>

                  <div className={styles.heroText}>
                    <p>
                      Zak Dakkash is a Transactional Analyst, facilitator, and the voice behind{' '}
                      <strong>ZakTalks</strong>, a platform for the conversations people often
                      avoid, but deeply need.
                    </p>
                    <p>
                      He is now available for keynotes, workshops, trainings, panels, and tailored
                      sessions for organisations, companies, NGOs, institutions, and communities.
                    </p>
                  </div>

                  <p className={styles.heroNote}>
                    For events and teams ready for a conversation with depth, participation, and
                    practical relevance.
                  </p>
                </div>

                <div className={styles.heroVisual} aria-label="ZakTalks events and speaking">
                  <div className={styles.imageShell}>
                    <Image
                      src="/eventshero1.jpg"
                      alt="Zak Dakkash speaking at an event"
                      width={1535}
                      height={1025}
                      priority
                      unoptimized
                      sizes="(max-width: 1024px) 88vw, 43vw"
                      className={styles.heroImage}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.afterHero}>
        <section className={styles.introSection} aria-labelledby="events-intro-heading">
          <div className={styles.contentWidth}>
            <p className={styles.sectionLabel}>Introduction</p>

            <div className={styles.introGrid}>
              <div className={styles.introHeader}>
                <h2 id="events-intro-heading" className={styles.sectionTitle}>
                  <span className={styles.titleLine}>A new speaker chapter.</span>
                  <span className={styles.titleLine}>Work with real roots.</span>
                </h2>

                <p className={styles.introLead}>
                  Zak&rsquo;s speaking work grows from conversations already happening through{' '}
                  <strong>ZakTalks</strong> and workshops such as{' '}
                  <strong>Interpersonal Communication Dynamics</strong> and{' '}
                  <strong>Unlock Your Financial Frequency</strong>.
                </p>
              </div>

              <div className={styles.introCopy}>
                <p>
                  This is not about delivering a polished speech and leaving the room unchanged. It
                  is about creating a space where people can recognise the roles they take on, the
                  messages they carry, and the ways these patterns show up in their relationships,
                  work, choices, and sense of self.
                </p>

                <p>
                  Through a Transactional Analysis lens, Zak brings psychological insight into
                  language people can actually use.
                </p>
              </div>
            </div>
          </div>
        </section>

        <EventsGallerySection images={galleryImages} />
        <SignatureSessionsSection />
        <EventsTestimonialsSection />
        <EventFormatsSection />
        <EventsPodcastSection />
        <EventsNewsletterSection />
        <EventPlannerQASection />
        <EventsBookingSection />
      </div>
    </main>
  )
}
