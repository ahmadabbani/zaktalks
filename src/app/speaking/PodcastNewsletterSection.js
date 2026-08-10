'use client'

import { useEffect, useRef, useState } from 'react'
import { FiArrowUpRight, FiMail } from 'react-icons/fi'
import styles from './PodcastNewsletterSection.module.css'

export default function PodcastNewsletterSection() {
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
      className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}
      aria-labelledby="podcast-newsletter-heading"
    >
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.iconMark} aria-hidden="true">
              <FiMail />
            </div>
            <div>
              <h2 id="podcast-newsletter-heading" className={styles.title}>
                Stay in the conversation, even off the podcast.
              </h2>
              <p className={styles.copy}>
                If an episode speaks to you, you&rsquo;ll probably want more than just a
                weekly listen. Join the ZakTalks list to receive episode alerts,
                reflection prompts, and practical tools to help you integrate what you
                hear into how you live and communicate.
              </p>
            </div>
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span>Name</span>
              <input type="text" name="name" placeholder="Your name" autoComplete="name" required />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
            </label>

            <button type="submit" className={styles.submitButton}>
              <span>Get episode alerts and reflections</span>
              <FiArrowUpRight aria-hidden="true" />
            </button>

            <p className={styles.formNote} aria-live="polite">
              {isSubmitted
                ? 'Thank you. You are on the list.'
                : 'No spam, no pressure. Just honest conversations, delivered to your inbox.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
