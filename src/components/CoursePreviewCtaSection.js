'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight, FiCheckCircle } from 'react-icons/fi'
import styles from './CoursePreviewCtaSection.module.css'

const supportItems = [
  'One-time payment',
  'Lifetime access',
  'Self-paced learning',
  '30-day money-back guarantee',
]

export default function CoursePreviewCtaSection() {
  const sectionRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIsVisible(true)
        observer.disconnect()
      },
      { threshold: 0.22, rootMargin: '0px 0px -8% 0px' }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${isVisible ? styles.sectionVisible : ''}`}
      aria-labelledby="course-preview-heading"
    >
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <h2 id="course-preview-heading" className={styles.title}>
              <span className={styles.titleLine}>Ready to understand the patterns</span>
              <span className={styles.titleLine}>shaping your relationships?</span>
            </h2>
            <p className={styles.copy}>
              Interpersonal Communication Dynamics gives you practical tools to understand how you communicate, why certain patterns repeat, and what can change when awareness becomes action.
            </p>

            <Link href="/courses/interpersonal-communication-dynamics" className={styles.cta}>
              <span>Buy Interpersonal Communication Dynamics</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>

            <ul className={styles.supportList} aria-label="Course purchase details">
              {supportItems.map((item) => (
                <li key={item}>
                  <FiCheckCircle aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.visualWrap}>
            <div className={styles.imageFrame}>
              <Image
                src="/coursepreview-blue-bg.png"
                alt="Zak Dakkash teaching beside a whiteboard for Interpersonal Communication Dynamics"
                width={1029}
                height={1528}
                sizes="(max-width: 840px) min(68vw, 22.5rem), 25vw"
                unoptimized
                className={styles.image}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
