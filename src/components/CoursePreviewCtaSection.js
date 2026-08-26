'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './CoursePreviewCtaSection.module.css'

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
              Some decisions were made before you had the words for them
            </h2>
            <div className={styles.copy}>
              <p>The ways you protect yourself, communicate, lead, or hold back did not appear by accident. Many began as early decisions that once helped you cope but may no longer serve the life you want now.</p>
              <p><strong>Becoming Again</strong> is a hybrid <em>group coaching program</em> that helps you recognise these patterns, understand the roles you keep stepping into, and make more conscious choices in the here and now.</p>
              <p>It is for people ready to <strong>move</strong> beyond insight alone and <strong>practise</strong> a different way of living.</p>
            </div>

            <Link href="/becoming-again" className={styles.cta}>
              <span>Discover Becoming Again</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>

            <p className={styles.discoveryNote}>A discovery call helps us make sure the group is the right fit for you.</p>
          </div>

          <div className={styles.visualWrap}>
            <div className={styles.imageFrame}>
              <Image
                src="/home-coursepreview.jpg"
                alt="Zak Dakkash teaching beside a whiteboard for Interpersonal Communication Dynamics"
                width={1029}
                height={1528}
                sizes="(max-width: 840px) min(68vw, 22.5rem), 25vw"
                quality={86}
                className={styles.image}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
