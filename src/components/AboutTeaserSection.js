'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './AboutTeaserSection.module.css'

const teaserLine = '"I\'m here to help people look beyond the symptoms, understand what\'s driving them, and do the work that creates lasting change."'
const teaserWords = teaserLine.split(' ')
const bioParagraphs = [
  <>
    Zak is a <strong>Transactional Analysis</strong> practitioner, coach, and educator who helps people understand the patterns shaping their lives, strengthen their relationships, and reclaim greater awareness, choice, and autonomy.
  </>,
  <>
    His work is grounded in <strong>Co-Creative Transactional Analysis</strong>, where change begins with a clear contract and grows through an Adult-to-Adult relationship. Together, coach and client create the conditions for authentic contact, curiosity, and exploration, making it possible to question old survival patterns, make new decisions, and integrate more life-affirming ways of being.
  </>,
]

export default function AboutTeaserSection() {
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
      { threshold: 0.2, rootMargin: '0px 0px -7% 0px' }
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
    visibleItems.includes(itemId) ? styles.itemVisible : '',
  ].filter(Boolean).join(' ')

  return (
    <section
      id="about-teaser"
      className={`${styles.section} ${motionReady ? styles.motionReady : ''}`}
      aria-labelledby="about-teaser-heading"
    >
      <div className={styles.container}>
        <blockquote
          ref={registerItem('quote')}
          className={itemClassName(styles.quoteBlock, 'quote')}
        >
          <p className={styles.quote} aria-label={teaserLine}>
            {teaserWords.map((word, index) => (
              <span className={styles.wordWindow} aria-hidden="true" key={`${word}-${index}`}>
                <span
                  className={styles.word}
                  style={{ '--word-index': index }}
                >
                  {word}
                </span>
              </span>
            ))}
          </p>
        </blockquote>

        <div className={styles.storyLayout}>
          <div
            ref={registerItem('portrait')}
            className={itemClassName(styles.portraitStage, 'portrait')}
          >
            <div className={styles.portraitFrame}>
              <img
                src="/home-meetzak.jpg"
                alt="Zak Dakkash speaking with a microphone"
                className={styles.portrait}
              />
            </div>
          </div>

          <div className={styles.storyColumn}>
            <div
              ref={registerItem('story')}
              className={itemClassName(styles.story, 'story')}
            >
              <h2 id="about-teaser-heading" className={styles.title}>Meet Zak</h2>
              <div className={styles.bio}>
                {bioParagraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>

              <Link href="/about" className={styles.storyLink}>
                <span>Learn my story</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
