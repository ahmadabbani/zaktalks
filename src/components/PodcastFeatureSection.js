'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import { MdOutlineMic } from 'react-icons/md'
import styles from './PodcastFeatureSection.module.css'

const waveformBars = [1, 2, 3, 4, 5, 6, 7, 8]

export default function PodcastFeatureSection() {
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
      { threshold: 0.26, rootMargin: '0px 0px -8% 0px' }
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
      className={`${styles.section} ${motionReady ? styles.motionReady : ''}`}
      aria-labelledby="podcast-feature-heading"
    >
      <div className={styles.container}>
        <div className={styles.layout}>
          <div
            ref={registerItem('content')}
            className={itemClassName(styles.content, 'content')}
          >
            <h2 id="podcast-feature-heading" className={styles.title}>
              Listen to the conversations most people avoid
            </h2>

            <p className={styles.copy}>
              The elephant in the room finally speaks. On Zak Talks, Zak explores the truths people avoid, the patterns that shape us, and the conversations that create change. This is where unfiltered conversations, untold truths, and the hard questions finally get spoken out loud. The podcast creates space for honesty, reflection, and deeper awareness across the topics that shape how we live and relate.
            </p>

            <Link href="/speaking" className={styles.cta}>
              <span>Go to the podcast page</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>

          <div
            ref={registerItem('visual')}
            className={itemClassName(styles.visual, 'visual')}
          >
            <div className={styles.imageFrame}>
              <Image
                src="/podcast.jpg"
                alt="Zak Dakkash holding a microphone for Zak Talks podcast"
                width={1100}
                height={1100}
                sizes="(max-width: 780px) 91vw, (max-width: 1200px) 48vw, 42vw"
                className={styles.image}
              />
            </div>
          </div>
        </div>

        <div
          ref={registerItem('episode')}
          className={itemClassName(styles.episodePrompt, 'episode')}
        >
          <div className={styles.audioMark} aria-hidden="true">
            <MdOutlineMic />
            <div className={styles.waveform}>
              {waveformBars.map((bar) => <span key={bar} />)}
            </div>
          </div>
          <p>Start with the latest episode and keep exploring from there.</p>
        </div>
      </div>
    </section>
  )
}
