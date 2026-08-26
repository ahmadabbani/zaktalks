'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FiArrowUpRight,
  FiCheck,
  FiCompass,
  FiEye,
  FiGitBranch,
  FiLayers,
  FiShield,
} from 'react-icons/fi'
import OneOnOneTestimonials from './OneOnOneTestimonials'
import styles from './one-on-one.module.css'

const BOOKING_URL =
  'https://calendly.com/zaktalks/1-1-session-with-zak?back=1&month=2026-01'

const fitPoints = [
  "You're ready to examine the patterns shaping your decisions, relationships, and leadership.",
  'You value honest inquiry over quick answers.',
  "You're willing to question long-held assumptions and make new choices.",
  'You believe meaningful change begins with awareness, responsibility, and authentic contact.',
  "You're looking for a Thinking Partner, not someone to tell you what to do.",
]

const notFitPoints = [
  "You're looking for advice, motivation, or a quick solution.",
  'You want change without self-reflection or personal responsibility.',
  "You're seeking someone to fix your problems rather than work with you to understand them.",
  "You're not yet ready to question the patterns that have shaped your life.",
]

const currentRealityPoints = [
  'Repeating the same relationship dynamics with different people.',
  'Feeling successful on the outside but disconnected on the inside.',
  'Reacting automatically instead of responding intentionally.',
  'Living from survival patterns that once protected you but now limit you.',
  'Struggling to communicate what you really think, feel, or need.',
  'Feeling responsible for everyone else while neglecting yourself.',
  "Caught between who you've been and who you're becoming.",
  'Overthinking decisions while repeating familiar outcomes.',
  'Knowing what you want but not understanding what keeps getting in the way.',
  'Sensing that something needs to change without being able to name it.',
]

const weightPoints = [
  {
    id: 'point-a',
    kind: 'endpoint',
    label: 'Point A',
    text: "They don't truly know where they are right now",
    roadY: 10,
  },
  ...currentRealityPoints.map((text, index) => ({
    id: `current-reality-${index + 1}`,
    kind: 'mid',
    text,
    roadY: [82, 38, 92, 45, 87, 34, 94, 42, 86, 36][index],
  })),
  {
    id: 'point-b',
    kind: 'endpoint',
    label: 'Point B',
    text: 'They know where they want to go',
    roadY: 10,
  },
]

const weightRoadPoints = weightPoints.map((point, index) => ({
  x: ((index + 0.5) / weightPoints.length) * 1000,
  y: point.roadY,
}))

function buildWeightRoadPath(points) {
  if (!points.length) return ''

  let path = `M ${points[0].x.toFixed(2)} ${points[0].y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const distance = next.x - current.x

    // The final middle point and Point B both sit high. Add one deliberate
    // valley between them so the road finishes with the same wave rhythm.
    // The return rises a little beyond Point B before approaching it from the
    // right, giving this last curve the horizontal room available to the
    // earlier waves without moving either point.
    if (index === points.length - 2) {
      const middleX = current.x + distance * 0.5
      const valleyY = 82

      path += ` C ${(current.x + distance * 0.3).toFixed(2)} ${current.y} ${(middleX - distance * 0.26).toFixed(2)} ${valleyY} ${middleX.toFixed(2)} ${valleyY}`
      path += ` C ${(middleX + distance * 0.26).toFixed(2)} ${valleyY} ${(next.x + distance * 0.32).toFixed(2)} ${next.y} ${next.x.toFixed(2)} ${next.y}`
      continue
    }

    // One controlled S-curve connects each pair directly. The point heights
    // create the wave, while short handles make each change happen at a
    // stronger angle instead of spreading the turn across the whole gap.
    path += ` C ${(current.x + distance * 0.34).toFixed(2)} ${current.y} ${(next.x - distance * 0.34).toFixed(2)} ${next.y} ${next.x.toFixed(2)} ${next.y}`
  }

  return path
}

const weightRoadPath = buildWeightRoadPath(weightRoadPoints)

const journeySteps = [
  {
    id: 'contract',
    Icon: FiShield,
    name: 'Contract',
    text: (
      <>
        Every coaching engagement begins by establishing a shared understanding of what
        matters, what you&rsquo;re working toward, and how we&rsquo;ll work together. The
        contract becomes the foundation for everything that follows.
      </>
    ),
  },
  {
    id: 'awareness',
    Icon: FiEye,
    name: 'Awareness',
    text: (
      <>
        Together, we examine the patterns shaping your thinking, relationships,
        communication, and decisions. As your current reality becomes clearer, new
        possibilities begin to emerge.
      </>
    ),
  },
  {
    id: 'inquiry',
    Icon: FiGitBranch,
    name: 'Inquiry',
    text: (
      <>
        We explore the assumptions, adaptations, and script decisions that continue to
        organize your experience. The goal isn&rsquo;t to revisit the past for its own sake,
        but to understand what still influences the present.
      </>
    ),
  },
  {
    id: 'choices',
    Icon: FiLayers,
    name: 'New Choices',
    text: (
      <>
        As awareness expands, so does your capacity to respond differently. New decisions
        become practical choices expressed through your conversations, relationships,
        leadership, and everyday actions.
      </>
    ),
  },
  {
    id: 'autonomy',
    Icon: FiCompass,
    name: 'Autonomy',
    text: (
      <>
        The aim is not dependence on coaching, but greater autonomy, the capacity to think
        clearly, relate authentically, and lead your life from awareness rather than from
        unconscious survival patterns.
      </>
    ),
  },
]

const closingPoints = [
  'Tell the truth about how you really feel.',
  'Understand what is happening beneath the surface.',
  'Slowly move from stuckness to movement, from confusion to clarity.',
]

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
      { threshold: 0.2, rootMargin: '0px 0px -7% 0px' }
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

export default function OneOnOneContent() {
  const [heroReady, setHeroReady] = useState(false)
  const [openJourney, setOpenJourney] = useState(0)
  const { register, cx } = useReveal()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <main className={styles.page}>
      <section
        className={`${styles.hero} ${heroReady ? styles.heroReady : ''}`}
        aria-labelledby="one-on-one-hero-heading"
      >
        <div className={`${styles.contentWidth} ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Private 1:1 Coaching</p>

            <h1 id="one-on-one-hero-heading" className={styles.heroTitle}>
              <span>When the conversation</span>
              <span>gets hard, it means we&rsquo;re</span>
              <span>getting somewhere.</span>
            </h1>

            <div className={styles.heroActions}>
              <Link
                href={BOOKING_URL}
                target="_blank"
                rel="noreferrer"
                className={styles.primaryCta}
              >
                <span>Book Your Session</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>

              <Link href="#who-is-it-for" className={styles.secondaryCta}>
                <span>Who is it for</span>
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroImageFrame}>
              <Image
                src="/1on1-hero.jpg?v=20260826"
                alt="Zak Dakkash holding a microphone during a session"
                width={1000}
                height={1334}
                sizes="(max-width: 1024px) 100vw, 42vw"
                quality={86}
                className={styles.heroImage}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quoteSection} aria-label="Quote">
        <div className={styles.contentWidth}>
          <blockquote ref={register('quote')} className={cx(styles.quoteBlock, 'quote')}>
            <p className={styles.quote}>&ldquo;A safe space to be your true self&rdquo;</p>
          </blockquote>
        </div>
      </section>

      <section
        id="who-is-it-for"
        className={styles.fitSection}
        aria-labelledby="who-is-it-for-heading"
      >
        <div className={styles.contentWidth}>
          <div className={styles.fitLayout}>
            <div ref={register('fit-intro')} className={cx(styles.fitIntro, 'fit-intro')}>
              <div ref={register('fit-header')} className={cx(styles.fitHeader, 'fit-header')}>
                <p className={styles.eyebrow}>Who this is for</p>
                <h2 id="who-is-it-for-heading" className={styles.fitTitle}>
                  Who Is It For
                </h2>
              </div>
              <div className={styles.fitCopy}>
                <p>
                  For people who feel the <strong>Need</strong> to change but don&rsquo;t know
                  where to start, this is a confidential, <strong>safe space</strong> where you
                  can be fully yourself, <strong>understand what&rsquo;s really happening inside</strong>,
                  and start moving toward the life you know you&rsquo;re meant to live.
                </p>
                <p>
                  When you&rsquo;re no longer willing to be led by the same patterns, One-to-One
                  Coaching offers a contracted, co-creative partnership to examine what is
                  shaping your life and relationships.
                </p>
                <p>
                  Together, we explore the assumptions, adaptations, and decisions beneath
                  recurring challenges, not to fix who you are, but to expand your awareness,
                  strengthen your capacity for choice, and develop greater autonomy in how you
                  think, relate, lead, and live.
                </p>
                <p>
                  This is not advice, accountability, or performance coaching. It is a
                  disciplined process of inquiry, grounded in a Co-Creative way, where lasting
                  change emerges through authentic contact, honest reflection, and new decisions.
                </p>
              </div>
            </div>

            <div ref={register('fit-lists')} className={cx(styles.fitLists, 'fit-lists')}>
              <div className={styles.fitList}>
                <h3 className={styles.fitListTitle}>This practice is for you if:</h3>
                <ul>
                  {fitPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>

              <div className={styles.fitList}>
                <h3 className={styles.fitListTitle}>This practice may not be the right fit if:</h3>
                <ul>
                  {notFitPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.weightSection} aria-labelledby="weight-heading">
        <div className={`${styles.contentWidth} ${styles.weightInner}`}>
          <div ref={register('weight-heading')} className={cx(styles.weightHeader, 'weight-heading')}>
            <p className={styles.eyebrow}>Before We Begin</p>

            <h2 id="weight-heading" className={styles.weightTitle}>
              The adaptations that no longer serve you
            </h2>
            <div className={styles.weightSubheading}>
              <p><strong>You know where you want to go. The question is: where are you now?</strong></p>
              <p>
                Many people have a clear vision of the life, relationships, or leadership
                they want. What they often lack is an accurate understanding of the patterns
                shaping their current reality.
              </p>
            </div>
          </div>

          <div
            ref={register('weight-timeline')}
            className={cx(styles.weightTimeline, 'weight-timeline')}
          >
            <svg
              className={styles.weightRoad}
              viewBox="0 0 1000 120"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d={weightRoadPath} vectorEffect="non-scaling-stroke" />
            </svg>

            <ol className={styles.weightList}>
              {weightPoints.map((point, index) => (
                <li
                  key={point.id}
                  className={[
                    styles.weightPoint,
                    point.kind === 'endpoint' ? styles.weightPointEndpoint : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={{
                    '--point-delay': `${index * 70}ms`,
                    '--point-y': `${3 + point.roadY * (8 / 120)}rem`,
                  }}
                >
                  {point.label && <span className={styles.weightPointLabel}>{point.label}</span>}
                  <span className={styles.weightDot} aria-hidden="true" />
                  <span className={styles.weightPointText}>{point.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div ref={register('weight-copy')} className={cx(styles.weightInsight, 'weight-copy')}>
            <div className={styles.weightCards}>
              <article className={styles.weightCard}>
                <p>
                  Without a clear understanding of <strong>Point A,</strong> where you are
                  today, it is difficult to understand the distance between where you are and
                  where you want to be. When your current reality remains unclear, meaningful
                  progress often feels uncertain or inconsistent.
                </p>
              </article>

              <article className={styles.weightCard}>
                <p>
                  Our work begins by bringing <strong>Point A</strong> into focus: your
                  patterns, your emotions, your relationships, your assumptions, and the story
                  you&rsquo;ve been living. As your awareness expands, <strong>Point B</strong>{' '}
                  becomes more than a vision. It becomes a direction you can move toward
                  intentionally, with greater clarity, choice, and autonomy.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.journeySection} aria-labelledby="journey-heading">
        <div className={`${styles.contentWidth} ${styles.journeyLayout}`}>
          <div
            ref={register('journey-header')}
            className={cx(styles.journeyHeader, 'journey-header')}
          >
            <p className={styles.eyebrow}>The coaching process</p>
            <h2 id="journey-heading" className={styles.journeyTitle}>
              How We Work Together
            </h2>

            <p className={styles.journeySubheading}>
              Our work is guided by a clear contract and unfolds through a co-creative
              process. Rather than following a rigid method, we work with what emerges in the
              relationship, always in service of greater awareness, choice, and autonomy.
            </p>
          </div>

          <ol className={styles.journeySteps}>
            {journeySteps.map((step, index) => {
              const isOpen = openJourney === index

              return (
                <li
                  key={step.id}
                  ref={register(`journey-${step.id}`)}
                  className={cx(
                    [styles.journeyStep, isOpen ? styles.journeyStepOpen : '']
                      .filter(Boolean)
                      .join(' '),
                    `journey-${step.id}`
                  )}
                >
                  <span className={styles.journeyNumber} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <div className={styles.journeyBody}>
                    <h3 className={styles.journeyStepTitle}>
                      <button
                        type="button"
                        className={styles.journeyTrigger}
                        aria-expanded={isOpen}
                        aria-controls={`journey-panel-${step.id}`}
                        onClick={() => setOpenJourney(isOpen ? -1 : index)}
                      >
                        <span className={styles.journeyTitleContent}>
                          <span className={styles.journeyIcon} aria-hidden="true">
                            <step.Icon />
                          </span>
                          <span className={styles.journeyStepName}>{step.name}</span>
                        </span>
                        <span className={styles.journeyToggle} aria-hidden="true" />
                      </button>
                    </h3>

                    <div
                      id={`journey-panel-${step.id}`}
                      className={styles.journeyPanel}
                      aria-hidden={!isOpen}
                    >
                      <div className={styles.journeyPanelInner}>
                        <p className={styles.journeyStepText}>{step.text}</p>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>

          <div ref={register('journey-outro')} className={cx(styles.journeyOutro, 'journey-outro')}>
            <p className={styles.journeyOutroText}>
              This is a practice of inquiry, not advice. A place where authentic contact,
              honest reflection, and disciplined thinking create the conditions for lasting
              change.
            </p>

            <Link
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.primaryCta}
            >
              <span>Book Your Session</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <OneOnOneTestimonials />

      <section className={styles.closingSection} aria-labelledby="closing-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('closing-header')}
            className={cx(styles.closingHeader, 'closing-header')}
          >
            <h2 id="closing-heading" className={styles.closingTitle}>
              <span>If something inside you knows</span>
              <span>you can&rsquo;t keep living the same way,</span>
              <span>that voice deserves a safe space.</span>
            </h2>
            <p className={styles.closingSubheading}>
              One-on-One Coaching is where you can:
            </p>
          </div>

          <div className={styles.closingCards}>
            {closingPoints.map((point, index) => (
              <div
                key={point}
                ref={register(`closing-card-${index}`)}
                className={cx(styles.closingCard, `closing-card-${index}`)}
                style={{ '--card-delay': `${index * 90}ms` }}
              >
                <span className={styles.closingIcon} aria-hidden="true">
                  <FiCheck />
                </span>
                <p className={styles.closingCardText}>{point}</p>
              </div>
            ))}
          </div>

          <div ref={register('closing-cta')} className={cx(styles.closingCtaBlock, 'closing-cta')}>
            <p className={styles.closingLead}>You don&rsquo;t have to do this alone.</p>

            <Link
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.closingCta}
            >
              <span>Book Your Session</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
