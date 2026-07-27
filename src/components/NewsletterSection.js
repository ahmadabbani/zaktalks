'use client'

import { useEffect, useRef, useState } from 'react'
import { FiArrowUpRight, FiMail } from 'react-icons/fi'
import styles from './NewsletterSection.module.css'

export default function NewsletterSection() {
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
      aria-labelledby="newsletter-heading"
    >
      <div className={styles.container}>
        <div className={styles.panel}>
          <div className={styles.content}>
            <div className={styles.iconMark} aria-hidden="true">
              <FiMail />
            </div>
            <div>
              <h2 id="newsletter-heading" className={styles.title}>
                Stay close to the work
              </h2>
              <p className={styles.copy}>
                Get honest reflections, practical insights, and updates on new episodes, workshops, and courses.
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
              <span>Join the newsletter</span>
              <FiArrowUpRight aria-hidden="true" />
            </button>

            <p className={styles.formNote} aria-live="polite">
              {isSubmitted ? 'Thank you. You are on the list.' : 'No noise. Just reflections and updates worth opening.'}
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
