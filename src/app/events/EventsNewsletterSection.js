'use client'

import { useEffect, useRef, useState } from 'react'
import { FiArrowUpRight, FiMail } from 'react-icons/fi'
import styles from '@/app/speaking/PodcastNewsletterSection.module.css'
import eventStyles from './EventsNewsletterSection.module.css'

export default function EventsNewsletterSection({
  headingId = 'events-newsletter-heading',
  title = 'Experience the work in person',
  paragraphs = [
    'Public talks, workshops, and learning experiences will be announced here.',
    'If you would like to receive updates on upcoming ZakTalks events, join the list.',
  ],
  cta = 'Get Event Updates',
  idleNote = 'No noise. Just upcoming event updates worth opening.',
  successNote = 'Thank you. You are on the event list.',
}) {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { threshold: 0.24, rootMargin: '0px 0px -8% 0px' }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault()
    setIsSubmitted(true)
    event.currentTarget.reset()
  }

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${eventStyles.whiteSection} ${
        isVisible ? styles.sectionVisible : ''
      }`}
      aria-labelledby={headingId}
    >
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.iconMark} aria-hidden="true">
              <FiMail />
            </div>
            <div>
              <h2 id={headingId} className={styles.title}>{title}</h2>
              <div className={`${styles.copy} ${eventStyles.copyGroup}`}>
                {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </div>

          <form className={`${styles.form} ${eventStyles.desktopStackedForm}`} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Name</span>
              <input type="text" name="name" placeholder="Your name" autoComplete="name" required />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
            </label>

            <button type="submit" className={styles.submitButton}>
              <span>{cta}</span>
              <FiArrowUpRight aria-hidden="true" />
            </button>

            <p className={styles.formNote} aria-live="polite">
              {isSubmitted
                ? successNote
                : idleNote}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
