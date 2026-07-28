'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './AboutTeaserSection.module.css'

const teaserLine = '"I am here to help people face the splinter beneath the symptoms and do the work that actually changes things."'
const teaserWords = teaserLine.split(' ')
const bioParagraphs = [
  'Zak Dakkash is a purpose-driven coach and educator whose work helps people understand themselves more clearly, communicate more honestly, and reconnect with a fuller way of living.',
  'His approach is co-creative, direct, and deeply human, built around safety, awareness, re-decision, integration, and autonomy rather than a rigid formula.',
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
              <Image
                src="/meetzak.jpg"
                alt="Zak Dakkash speaking with a microphone"
                width={1920}
                height={1280}
                sizes="(max-width: 900px) min(78vw, 28rem), 34vw"
                unoptimized
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
                {bioParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
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
