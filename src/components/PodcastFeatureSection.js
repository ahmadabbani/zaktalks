'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import { FaApple, FaSpotify, FaYoutube } from 'react-icons/fa'
import { MdOutlineMic } from 'react-icons/md'
import styles from './PodcastFeatureSection.module.css'

const waveformBars = [1, 2, 3, 4, 5, 6, 7, 8]

const podcastPlatforms = [
  {
    label: 'Watch on YouTube',
    href: 'https://www.youtube.com/@zak_talks',
    icon: FaYoutube,
  },
  {
    label: 'Listen on Apple',
    href: 'https://podcasts.apple.com/us/podcast/zak-talks/id1818978849?at=1000lHKX&ct=linktree_http&itsct=lt_p&itscg=30200&ls=1',
    icon: FaApple,
  },
  {
    label: 'Listen on Spotify',
    href: 'https://open.spotify.com/show/7E5OWIxCjKRPnEsQaL5o44',
    icon: FaSpotify,
  },
]

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
              <strong>The Elephant In The Room</strong> finally speaks. On <strong>Zak Talks</strong>, Zak explores the truths people avoid, the patterns that shape us, and the conversations that create change. This is where unfiltered conversations, untold truths, and the hard questions finally get spoken out loud. The podcast creates space for reflection and deeper awareness across the topics that shape how we live and relate.
            </p>

            <Link href="/speaking" className={styles.cta}>
              <span>Go to the podcast page</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>

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

          <div
            ref={registerItem('visual')}
            className={itemClassName(styles.visual, 'visual')}
          >
            <div className={styles.platformLinks} aria-label="Listen to Zak Talks">
              {podcastPlatforms.map((platform) => {
                const Icon = platform.icon

                return (
                  <a
                    key={platform.label}
                    href={platform.href}
                    className={styles.platformLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className={styles.platformIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span>{platform.label}</span>
                    <FiArrowUpRight className={styles.platformArrow} aria-hidden="true" />
                  </a>
                )
              })}
            </div>

            <div className={styles.phoneWrap}>
              <Image
                src="/podcast/zak-talks-phone-facing-copy-v2.png"
                alt="Modern phone playing The Conversations We Avoid on Zak Talks"
                width={941}
                height={1672}
                sizes="(max-width: 1024px) 31vw, 34vw"
                className={styles.phone}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
