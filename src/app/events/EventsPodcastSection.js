'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaApple, FaSpotify, FaYoutube } from 'react-icons/fa'
import { FiArrowUpRight, FiPlay } from 'react-icons/fi'
import styles from './EventsPodcastSection.module.css'

const clips = [
  { id: '01', image: '/podcast1.png', alt: 'ZakTalks short clip placeholder with a podcast waveform' },
  { id: '02', image: '/podcast2.png', alt: 'ZakTalks short clip placeholder with a podcast microphone' },
  { id: '03', image: '/podcast3.png', alt: 'ZakTalks short clip placeholder with an audio waveform' },
]

const platforms = [
  {
    label: 'Watch on YouTube',
    href: 'https://www.youtube.com/@zak_talks',
    Icon: FaYoutube,
  },
  {
    label: 'Listen on Apple',
    href: 'https://podcasts.apple.com/us/podcast/zak-talks/id1818978849',
    Icon: FaApple,
  },
  {
    label: 'Listen on Spotify',
    href: 'https://open.spotify.com/show/7E5OWIxCjKRPnEsQaL5o44',
    Icon: FaSpotify,
  },
]

function usePodcastReveal() {
  const nodes = useRef(new Map())
  const [visible, setVisible] = useState(() => new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.eventsPodcastReveal)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return
        setVisible((current) => {
          const next = new Set(current)
          revealed.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.14, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const register = useCallback((id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }

    node.dataset.eventsPodcastReveal = id
    nodes.current.set(id, node)
  }, [])

  const classFor = useCallback(
    (baseClass, id) => [baseClass, visible.has(id) ? styles.revealed : ''].filter(Boolean).join(' '),
    [visible]
  )

  return { register, classFor }
}

export default function EventsPodcastSection() {
  const { register, classFor } = usePodcastReveal()

  return (
    <section className={styles.section} aria-labelledby="events-podcast-heading">
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.content}>
            <header ref={register('podcast-header')} className={classFor(styles.header, 'podcast-header')}>
              <p className={styles.eyebrow}>ZakTalks</p>
              <h2 id="events-podcast-heading" className={styles.title}>
                The conversation is already happening
              </h2>
              <p className={styles.subheading}>
                <strong>ZakTalks</strong> is where the elephant in the room gets a voice.
              </p>
            </header>

            <div ref={register('podcast-copy')} className={classFor(styles.copy, 'podcast-copy')}>
              <p>
                Through conversations about personal growth, relationships, communication,
                identity, psychology, and the human experience, Zak has created a platform for
                people tired of simple answers to complex realities.
              </p>
              <p>
                For event organisers, the podcast offers a clear view of Zak&rsquo;s presence:
                reflective, direct, human, and willing to go where the conversation has real
                weight.
              </p>
            </div>

            <div className={styles.clips} aria-label="ZakTalks short clip previews">
              {clips.map((clip, index) => {
                const revealId = `podcast-clip-${index}`

                return (
                  <div
                    key={clip.id}
                    ref={register(revealId)}
                    className={classFor(styles.clip, revealId)}
                    style={{ '--clip-delay': `${index * 85}ms` }}
                  >
                    <Image
                      src={clip.image}
                      alt={clip.alt}
                      fill
                      sizes="(max-width: 680px) 88vw, (max-width: 1024px) 29vw, 19vw"
                      className={styles.clipImage}
                    />
                    <span className={styles.clipShade} aria-hidden="true" />
                    <span className={styles.clipNumber}>Short {clip.id}</span>
                    <span className={styles.playButton} aria-hidden="true">
                      <FiPlay />
                    </span>
                    <span className={styles.clipDuration}>Preview</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div ref={register('podcast-visual')} className={classFor(styles.visual, 'podcast-visual')}>
            <div className={styles.platformLinks} aria-label="Listen to ZakTalks">
              {platforms.map(({ label, href, Icon }, index) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.platformLink}
                  style={{ '--platform-delay': `${260 + index * 110}ms` }}
                >
                  <span className={styles.platformIcon} aria-hidden="true">
                    <Icon />
                  </span>
                  <span>{label}</span>
                  <FiArrowUpRight className={styles.platformArrow} aria-hidden="true" />
                </a>
              ))}
            </div>

            <div className={styles.phoneWrap}>
              <Image
                src="/podcast/zak-talks-phone-facing-copy-v2-trimmed.png"
                alt="Phone playing The Conversations We Avoid on ZakTalks"
                width={564}
                height={1466}
                sizes="(max-width: 420px) 27vw, (max-width: 680px) 20vw, (max-width: 1024px) 15vw, (max-width: 1600px) 12vw, 16rem"
                className={styles.phone}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
