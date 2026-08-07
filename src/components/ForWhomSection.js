'use client'

import { useEffect, useRef, useState } from 'react'
import styles from '@/app/page.module.css'

const audienceCards = [
  <>
    <strong>Professionals</strong> who want to communicate better, lead better, and stop repeating the same patterns.
  </>,
  <>
    For people who feel <strong>stuck, disconnected, overlooked, or trapped</strong> between who they are and who they know they can become.
  </>,
  <>
    For <strong>leaders, educators, entrepreneurs, and teams</strong> who want real conversations and healthier dynamics.
  </>,
  <>
    For those who <strong>are done</strong> with surface-level advice and <strong>ready for work</strong> that is practical, personal, and real.
  </>,
]

export default function ForWhomSection() {
  const sectionRef = useRef(null)
  const itemRefs = useRef({})
  const [motionReady, setMotionReady] = useState(false)
  const [visibleItems, setVisibleItems] = useState([])

  useEffect(() => {
    setMotionReady(true)

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          const itemId = entry.target.dataset.motionItem
          setVisibleItems((currentItems) => (
            currentItems.includes(itemId) ? currentItems : [...currentItems, itemId]
          ))
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.3, rootMargin: '0px 0px -8% 0px' }
    )

    Object.values(itemRefs.current).forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  const registerItem = (itemId) => (node) => {
    if (!node) return

    node.dataset.motionItem = itemId
    itemRefs.current[itemId] = node
  }

  const itemClassName = (baseClass, itemId) => [
    baseClass,
    visibleItems.includes(itemId) ? styles.forWhomItemVisible : '',
  ].filter(Boolean).join(' ')

  const sectionClassName = [
    styles.forWhomSection,
    motionReady ? styles.forWhomMotionReady : '',
  ].filter(Boolean).join(' ')

  return (
    <section ref={sectionRef} className={sectionClassName} aria-labelledby="for-whom-heading">
      <div className={styles.forWhomContainer}>
        <div className={styles.forWhomMosaic}>
          <div ref={registerItem('header')} className={itemClassName(styles.forWhomHeader, 'header')}>
            <p className={styles.forWhomEyebrow}>For whom</p>
            <h2 id="for-whom-heading" className={styles.forWhomTitle}>
              For people who know something has to change
            </h2>
            <p className={styles.forWhomIntro}>
              <strong><em>Okayness</em></strong> is for adults who are ready to stop living on autopilot and start facing what is actually shaping their lives.
            </p>
          </div>

          {audienceCards.map((card, index) => (
            <article
              key={`audience-card-${index}`}
              ref={registerItem(`card-${index}`)}
              className={itemClassName(`${styles.forWhomCard} ${styles[`forWhomCard${index + 1}`]}`, `card-${index}`)}
            >
              <span className={styles.forWhomNumber}>0{index + 1}</span>
              <p>{card}</p>
            </article>
          ))}
        </div>

        <p ref={registerItem('belong')} className={itemClassName(styles.forWhomBelong, 'belong')}>
          <span>A space to be seen, challenged, and supported,</span>
          <strong>without judgment.</strong>
        </p>
      </div>
    </section>
  )
}
