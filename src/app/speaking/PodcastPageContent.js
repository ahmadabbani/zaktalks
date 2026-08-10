'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaApple, FaHeadphones, FaInstagram, FaSpotify, FaYoutube } from 'react-icons/fa'
import useHeroPin from './useHeroPin'
import PodcastArchiveSection from './PodcastArchiveSection'
import PodcastNewsletterSection from './PodcastNewsletterSection'
import styles from './podcast.module.css'

const CHANNEL_URL = 'https://www.youtube.com/@zak_talks'

// Order matches the reference layout: YouTube, Apple, Spotify.
const heroBadges = [
  { id: 'youtube', label: 'Watch on YouTube', href: CHANNEL_URL, Icon: FaYoutube },
  {
    id: 'apple',
    label: 'Listen on Apple',
    href: 'https://podcasts.apple.com/us/podcast/zak-talks/id1818978849',
    Icon: FaApple,
  },
  {
    id: 'spotify',
    label: 'Listen on Spotify',
    href: 'https://open.spotify.com/show/7E5OWIxCjKRPnEsQaL5o44',
    Icon: FaSpotify,
  },
]

const proofPoints = [
  { id: 'youtube', value: 11, suffix: 'K', label: 'YouTube followers / subscribers', Icon: FaYoutube },
  { id: 'instagram', value: 5, suffix: 'K', label: 'Instagram followers', Icon: FaInstagram },
]

const subscribePlatforms = [
  {
    id: 'apple',
    name: 'Apple Podcasts',
    action: 'Subscribe',
    href: 'https://podcasts.apple.com/us/podcast/zak-talks/id1818978849',
    Icon: FaApple,
  },
  {
    id: 'spotify',
    name: 'Spotify',
    action: 'Follow',
    href: 'https://open.spotify.com/show/7E5OWIxCjKRPnEsQaL5o44',
    Icon: FaSpotify,
  },
  {
    id: 'anghami',
    name: 'Anghami',
    action: 'Listen',
    href: 'https://play.anghami.com/podcast/1067932393',
    Icon: FaHeadphones,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    action: 'Subscribe',
    href: CHANNEL_URL,
    Icon: FaYoutube,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@zak_talks',
    action: 'Follow for clips, reflections, and behind-the-scenes',
    href: 'https://www.instagram.com/zak_talks/',
    Icon: FaInstagram,
  },
]

const numberFormatter = new Intl.NumberFormat('en-US')

/**
 * One observer, many targets, each unobserved as it reveals — so content lower
 * in a section animates when it is scrolled to rather than all at once when the
 * section's top edge appears.
 */
function useReveal() {
  const nodes = useRef(new Map())
  const [visible, setVisible] = useState(() => new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.revealId)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return

        setVisible((current) => {
          const next = new Set(current)
          revealed.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const register = useCallback((id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }

    node.dataset.revealId = id
    nodes.current.set(id, node)
  }, [])

  const cx = useCallback(
    (base, id) => [base, visible.has(id) ? styles.isVisible : ''].filter(Boolean).join(' '),
    [visible]
  )

  return { register, cx }
}

function CountUp({ value, suffix, active }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!active) return undefined

    // Reduced motion collapses the count to a single frame rather than
    // setting state synchronously here, which would cascade renders.
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1100
    const start = performance.now()
    let frame

    const step = (now) => {
      const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(value * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }

    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, value])

  return (
    <>
      {numberFormatter.format(display)}{suffix}
      <span className={styles.proofPlus}>+</span>
    </>
  )
}

export default function PodcastPageContent({ episodes = [] }) {
  const stageRef = useRef(null)
  const pinRef = useRef(null)
  const [heroReady, setHeroReady] = useState(false)

  useHeroPin(stageRef, pinRef)
  const { register, cx } = useReveal()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <main className={styles.page}>
      {/* ---------------------------------------------------------------- HERO */}
      <section
        ref={stageRef}
        className={styles.heroStage}
        aria-labelledby="podcast-hero-heading"
      >
        <div
          ref={pinRef}
          className={`${styles.heroPin} ${heroReady ? styles.heroReady : ''}`}
        >
          <div className={styles.heroBackdrop} aria-hidden="true" />

          <div className={styles.heroCopyRow}>
            <div className={styles.heroCopyInner}>
              <div className={styles.heroHeading}>
                <div className={styles.heroHeadingReveal}>
                  <h1 id="podcast-hero-heading" className={styles.heroTitle}>
                    Season 2 launch
                  </h1>

                  <p className={styles.heroSubheading}>
                    Season 2 arriving end of August, subscribe so you don&rsquo;t miss it.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Figure, badges and proof strip are ONE transformed plane: the seam
              between figure and strip is a layout relationship, so it can
              never open a gap. */}
          <div className={styles.heroFrontPlane}>
            <div className={styles.heroFigureRail}>
              <div className={styles.heroFigureBox}>
                <div className={styles.heroBadgeStack}>
                  {heroBadges.map((platform, index) => (
                    <a
                      key={platform.id}
                      href={platform.href}
                      className={styles.heroBadge}
                      target="_blank"
                      rel="noreferrer"
                      style={{ '--badge-delay': `${index * 90}ms` }}
                    >
                      <span className={styles.heroBadgeIcon} aria-hidden="true">
                        <platform.Icon />
                      </span>
                      <span className={styles.heroBadgeLabel}>{platform.label}</span>
                    </a>
                  ))}

                  <Image
                    src="/podcast4.png"
                    alt=""
                    aria-hidden="true"
                    width={1310}
                    height={264}
                    className={styles.heroWave}
                  />
                </div>

                <Image
                  src="/podcasthero.png"
                  alt="Zak Dakkash holding a microphone"
                  width={1100}
                  height={1700}
                  priority
                  sizes="(max-width: 620px) 74vw, (max-width: 1024px) 52vw, 34vw"
                  className={styles.heroFigure}
                />
              </div>
            </div>

            <div className={styles.proofStrip}>
              <div className={styles.proofStripInner}>
                <ul className={styles.proofList}>
                  {proofPoints.map((point) => (
                    <li key={point.id} className={styles.proofItem}>
                      <point.Icon className={styles.proofIcon} aria-hidden="true" />
                      <p className={styles.proofValue}>
                        <CountUp value={point.value} suffix={point.suffix} active={heroReady} />
                      </p>
                      <p className={styles.proofLabel}>{point.label}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- everything that slides over */}
      <div className={styles.afterHero}>
        {/* ------------------------------------------------------------ THE SHOW */}
        <section className={styles.elephantSection} aria-labelledby="elephant-heading">
          <div className={styles.contentWidth}>
            <div className={styles.elephantLayout}>
              <div
                ref={register('elephant-content')}
                className={cx(styles.elephantContent, 'elephant-content')}
              >
                <h2 id="elephant-heading" className={styles.sectionTitle}>
                  Where the elephant in the room finally speaks.
                </h2>

                <p className={styles.elephantSubtitle}>
                  ZakTalks is a podcast about the truths we all feel, rarely name, and can no
                  longer afford to avoid.
                </p>

                <div className={styles.elephantCopy}>
                  <p>
                    We talk about the patterns you keep repeating, the conversations you&rsquo;re
                    postponing, and the parts of you that quietly shape every relationship,
                    decision, and day.
                  </p>
                  <p>
                    Maybe the elephant is in your relationship. Maybe in your work. Maybe in your
                    family. Or maybe&hellip; inside you.
                  </p>
                  <p>
                    The question isn&rsquo;t whether it&rsquo;s there. The question is: how long
                    are you willing to keep acting like it&rsquo;s not?
                  </p>
                </div>
              </div>

              <div
                ref={register('elephant-panel')}
                className={cx(styles.visual, 'elephant-panel')}
              >
                <div className={styles.subscribeHeading}>
                  <p className={styles.eyebrow}>Listen and subscribe</p>
                  <p className={styles.subscribeIntro}>
                    Listen on your favorite platform and subscribe to stay part of the conversation.
                  </p>
                </div>

                <ul className={styles.subscribeLinks}>
                  {subscribePlatforms.map((platform, index) => (
                    <li
                      key={platform.id}
                      className={styles.subscribeItem}
                      style={{ '--row-delay': `${index * 70}ms` }}
                    >
                      <a href={platform.href} target="_blank" rel="noreferrer" className={styles.subscribeLink}>
                        <span className={styles.subscribeIcon} aria-hidden="true">
                          <platform.Icon />
                        </span>
                        <span className={styles.subscribeNames}>
                          <span className={styles.subscribeName}>{platform.name}</span>
                          <span className={styles.subscribeAction}>{platform.action}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>

                <div className={styles.phoneWrap}>
                  <Image
                    src="/podcast/zak-talks-phone-facing-copy-v2.png"
                    alt="Phone playing a ZakTalks episode"
                    width={941}
                    height={1672}
                    sizes="(max-width: 1024px) 40vw, 22vw"
                    className={styles.phone}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- WHO/WHAT */}
        <section className={styles.audienceSection} aria-labelledby="audience-heading">
          <div className={styles.audienceLayout}>
            <div
              ref={register('audience-photo')}
              className={cx(styles.audiencePhotoFrame, 'audience-photo')}
            >
              <Image
                src="/Who this podcast is for.jpg"
                alt="A room of people connecting after a ZakTalks live session"
                width={1692}
                height={1128}
                sizes="(max-width: 900px) 100vw, 48vw"
                className={styles.audiencePhoto}
              />
            </div>

            <div
              ref={register('audience-cards')}
              className={cx(styles.audienceCards, 'audience-cards')}
            >
              <p className={styles.eyebrow}>Before you hit play</p>
              <h2 id="audience-heading" className={styles.sectionTitle}>
                Real talk, for people ready to hear it.
              </h2>

              <article className={styles.audienceCard} style={{ '--card-delay': '0ms' }}>
                <span className={styles.audienceNumber}>01</span>
                <h3 className={styles.audienceCardTitle}>Who this podcast is for</h3>
                <p>
                  ZakTalks is for people who feel there is more to their life and
                  relationships, but can&rsquo;t quite name what&rsquo;s missing. For
                  Millennials and beyond who are tired of surface-level advice and want real
                  conversations about communication, self-awareness, and personal growth.
                </p>
              </article>

              <article className={styles.audienceCard} style={{ '--card-delay': '110ms' }}>
                <span className={styles.audienceNumber}>02</span>
                <h3 className={styles.audienceCardTitle}>What you&rsquo;ll walk away with</h3>
                <p>
                  Every episode leaves you with practical insight and language for what you
                  feel but struggle to express: clearer understanding of your patterns, tools
                  to communicate differently, and the courage to face what you&rsquo;ve been
                  avoiding, with yourself and with others.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- SEASON ARCHIVE */}
        <PodcastArchiveSection episodes={episodes} />

        {/* ------------------------------------------------------- NEWSLETTER */}
        <PodcastNewsletterSection />
      </div>
    </main>
  )
}
