'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiClock,
  FiCompass,
  FiEye,
  FiFlag,
  FiGitBranch,
  FiLayers,
  FiMonitor,
  FiShield,
} from 'react-icons/fi'
import OneOnOneTestimonials from './OneOnOneTestimonials'
import styles from './one-on-one.module.css'

const BOOKING_URL =
  'https://calendly.com/zaktalks/1-1-session-with-zak?back=1&month=2026-01'

const fitPoints = [
  'You feel stuck in a loop and can’t fully explain why.',
  'You know something is wrong or missing, but you can’t put it into words.',
  'You are ready to stop running from yourself and start understanding yourself.',
  'You want support that is emotionally honest, not superficial advice.',
]

const notFitPoints = [
  'You are not ready to change or take responsibility.',
  'You prefer to stay in psychological games instead of doing real work.',
  'You expect someone else to “fix” you without your participation.',
  'You want a quick magic solution without deeper reflection.',
]

const weightPoints = [
  {
    id: 'overthinking',
    kind: 'endpoint',
    label: 'Point A',
    text: 'Fear, anxiety, and constant overthinking.',
  },
  {
    id: 'unprocessed',
    kind: 'mid',
    text: 'Pain, sadness, or grief they haven’t fully processed.',
  },
  {
    id: 'anger',
    kind: 'mid',
    text: 'Anger, either turned inward or spilling into their relationships.',
  },
  {
    id: 'disconnected',
    kind: 'mid',
    text: 'Feeling lost, confused, or disconnected from themselves.',
  },
  {
    id: 'present',
    kind: 'endpoint',
    label: 'Point B',
    text: 'A sense that they are not fully present in their own life.',
  },
]

// Each step's name and its descriptor are split only for typographic weight —
// the wording is unchanged.
const journeySteps = [
  {
    id: 'safety',
    Icon: FiShield,
    name: 'Safety',
    lead: 'a place where you can finally exhale',
    text: (
      <>
        We start by creating a genuinely safe space: no blame, no shaming, no performance.
        Just a grounded presence where your nervous system can calm down and your story can
        be told honestly.
      </>
    ),
  },
  {
    id: 'awareness',
    Icon: FiEye,
    name: 'Awareness',
    lead: 'seeing the real story underneath',
    text: (
      <>
        From there, we slow down enough to notice your patterns: how you relate, what you
        repeat, and the beliefs you carry about yourself and others. This is where you begin
        to understand <em>why</em> you feel and react the way you do.
      </>
    ),
  },
  {
    id: 'redecision',
    Icon: FiGitBranch,
    name: 'Redecision',
    lead: 'choosing something different at the root',
    text: (
      <>
        With awareness and safety in place, we go to the deeper layer: the old decisions you
        made about yourself and life, often very young and very alone. Together, we challenge
        those decisions and make new ones that honor who you are today, not who you had to be
        back then.
      </>
    ),
  },
  {
    id: 'integration',
    Icon: FiLayers,
    name: 'Integration',
    lead: 'turning insight into daily life',
    text: (
      <>
        Insight without practice doesn&rsquo;t change much. We translate your new decisions
        into real choices: boundaries, behaviors, conversations, and habits that support the
        life you actually want to live.
      </>
    ),
  },
  {
    id: 'autonomy',
    Icon: FiCompass,
    name: 'Autonomy',
    lead: 'living from your own voice',
    isFinal: true,
    text: (
      <>
        Over time, you experience more freedom: less pressure from old scripts, more grounded
        confidence, clearer communication, and a relationship with yourself that feels honest
        and good. This is autonomy: living from your own voice, not from the expectations
        and fears that used to run the show.
      </>
    ),
  },
]

const structureCards = [
  {
    id: 'format',
    Icon: FiMonitor,
    title: 'Format',
    text: 'Sessions are available both in person and online, so you can choose what feels safest and most convenient.',
  },
  {
    id: 'length',
    Icon: FiClock,
    title: 'Session length',
    text: 'Each session is 50 minutes. Long enough to go deep, focused enough to stay grounded.',
  },
  {
    id: 'frequency',
    Icon: FiCalendar,
    title: 'Frequency',
    text: 'Typically once a week. Biweekly is possible if there is consistency and sustainability in the process.',
  },
  {
    id: 'commitment',
    Icon: FiFlag,
    title: 'Minimum commitment',
    text: 'To allow real work to happen, a minimum of 6–7 sessions is recommended.',
  },
]

const expectPoints = [
  'A safe, non-judgmental space where you can say things you’ve never said out loud.',
  'Co-creative coaching: we step into the space together, not coach above client.',
  'Sessions that are led by honesty and curiosity, allowing the real issue to emerge.',
  'Emotional clarity: understanding what you feel and why.',
  'Practical insight: small, realistic steps that move you from awareness into action.',
]

const processSteps = [
  {
    id: 'contracting',
    // Titled from the step's own opening line — the pasted source had no title here.
    title: 'Contracting and shared responsibility',
    paragraphs: [
      'We begin by contracting around positive regard and shared responsibility.',
      'I commit to not blaming or shaming you and to creating a safe, grounded environment.',
      'You commit to showing up honestly, participating in the process, and taking responsibility for your part.',
    ],
  },
  {
    id: 'focus',
    title: 'Clarifying the focus and boundaries',
    paragraphs: [
      'Together, we agree on what we’re working on and what the boundaries of the coaching space are.',
      'This brings clarity: what belongs to the sessions, what doesn’t, and what we’re aiming for.',
    ],
  },
  {
    id: 'sessions',
    title: 'Ongoing sessions',
    paragraphs: [
      'Week by week, we allow the session to lead us to the real issue.',
      'Many people come in thinking “the problem is X,” but together we often discover it’s something deeper, and more meaningful to work on.',
      'As we progress, you’ll begin to feel more calm, more grounded, and more connected to yourself.',
    ],
  },
  {
    id: 'review',
    title: 'Review and next steps',
    paragraphs: [
      'After a cycle of sessions (usually 6–7), we review what has shifted, what you’ve learned, and what you need next: continued coaching, integration time, or a different type of support.',
    ],
  },
]

const faqs = [
  {
    id: 'commitment',
    question: 'How long do I need to commit?',
    answer:
      'A minimum of 6–7 sessions is recommended. Real emotional work needs time, safety, and repetition. This gives us enough space to understand your reality, explore patterns, and start creating tangible change.',
  },
  {
    id: 'results',
    question: 'When will I start seeing results?',
    answer:
      'Results don’t always look like big dramatic breakthroughs. Often, they begin as small shifts: more calm, more clarity, more honesty with yourself, more presence in your relationships. Many clients begin to feel a difference within the first few sessions, and the depth grows over time.',
  },
  {
    id: 'expected',
    question: 'What is expected from me as a client?',
    answer:
      'You are expected to show up, be honest, and take part in the process. Coaching is co-created. Trust, openness, and a willingness to face yourself are essential for this work to be meaningful.',
  },
  {
    id: 'refunds',
    question: 'Do you offer refunds?',
    answer:
      'Because this is a time-based, professional service and the work begins from the very first session, refunds are generally not available once sessions have started. However, if something significant changes in your circumstances, we can discuss options together and try to find a fair and respectful arrangement.',
  },
  {
    id: 'therapy',
    question: 'Is this therapy?',
    answer:
      'This is coaching rooted in emotional awareness and human development, not medical or psychiatric treatment. If during our work it becomes clear that you need a different type of support, we can discuss that openly and adjust accordingly.',
  },
  {
    id: 'combine-therapist',
    question: 'Can I do this if I’m already seeing a therapist?',
    answer:
      'Yes, many people benefit from combining therapy with coaching, as long as it feels safe and aligned with your therapist’s guidance. The focus here is on awareness, responsibility, and change in your daily life.',
  },
]

const closingPoints = [
  'Tell the truth about how you really feel.',
  'Understand what’s happening beneath the surface.',
  'Slowly move from stuckness to movement, from confusion to clarity.',
]

/**
 * One observer, many targets, each unobserved as it reveals — so content
 * lower on the page animates in as it is scrolled to, rather than every
 * tracked element firing at once when the page first mounts.
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
  const [openFaq, setOpenFaq] = useState(-1)
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
              When the conversation gets hard, it means we&rsquo;re getting somewhere.
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

          {/* Stretches the full hero height so the frame, pinned with
              margin-top:auto, seats its bottom edge on the hero's own bottom
              edge — the seam is a layout relationship, not a magic offset. */}
          <div className={styles.heroVisual}>
            <div className={styles.heroImageFrame}>
              <img
                src="/1on1-hero.jpg"
                alt="Zak Dakkash holding a microphone during a session"
                className={styles.heroImage}
              />

              <div className={styles.heroFactCard}>
                <p className={styles.factValue}>20+</p>
                <p className={styles.factLabel}>Years of experience</p>

                <p className={styles.factTitle}>Co-Creative Transactional Analysis</p>
                <p className={styles.factNote}>Practitioner, coach and educator</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.quoteSection} aria-label="Quote">
        <div className={styles.contentWidth}>
          <blockquote
            ref={register('quote')}
            className={cx(styles.quoteBlock, 'quote')}
          >
            <p className={styles.quote}>
              &ldquo;A Safe Space To Finally Tell Yourself The Truth&rdquo;
            </p>
          </blockquote>
        </div>
      </section>

      <section
        id="who-is-it-for"
        className={styles.fitSection}
        aria-labelledby="who-is-it-for-heading"
      >
        <div className={`${styles.contentWidth} ${styles.fitLayout}`}>
          <div
            ref={register('fit-intro')}
            className={cx(styles.fitIntro, 'fit-intro')}
          >
            <h2 id="who-is-it-for-heading" className={styles.fitTitle}>Who Is It For</h2>

            <div className={styles.fitCopy}>
              <p>
                For people who feel &ldquo;I need to change&rdquo; but don&rsquo;t know where
                to start, this is a private, honest space where you can be fully yourself,
                understand what&rsquo;s really happening inside, and start moving toward the
                life you know you&rsquo;re meant to live.
              </p>
              <p>
                This is not motivational hype or quick tips; It&rsquo;s real work, done
                together.
              </p>
              <p>
                If you feel something in your life cannot stay the same anymore, whether your
                relationships, your patterns, or your inner world, One-on-One Coaching gives
                you a safe, grounded place to explore it, name it, and slowly change it.
              </p>
            </div>
          </div>

          <div
            ref={register('fit-lists')}
            className={cx(styles.fitLists, 'fit-lists')}
          >
            <div className={styles.fitList}>
              <h3 className={styles.fitListTitle}>This is for you if:</h3>
              <ul>
                {fitPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>

            <div className={styles.fitList}>
              <h3 className={styles.fitListTitle}>This is not for you if:</h3>
              <ul>
                {notFitPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.weightSection} aria-labelledby="weight-heading">
        <div className={`${styles.contentWidth} ${styles.weightInner}`}>
          <div
            ref={register('weight-heading')}
            className={cx(styles.weightHeader, 'weight-heading')}
          >
            <p className={styles.eyebrow}>Before We Begin</p>

            <h2 id="weight-heading" className={styles.weightTitle}>
              The silent weight you&rsquo;ve been carrying
            </h2>

            <p className={styles.weightSubheading}>
              Before people come to One-on-One Coaching, they&rsquo;re usually living with a
              mix of:
            </p>
          </div>

          <div
            ref={register('weight-timeline')}
            className={cx(styles.weightTimeline, 'weight-timeline')}
          >
            <ol className={styles.weightList}>
              {weightPoints.map((point, index) => (
                <li
                  key={point.id}
                  className={[
                    styles.weightPoint,
                    point.kind === 'endpoint' ? styles.weightPointEndpoint : '',
                  ].filter(Boolean).join(' ')}
                  style={{ '--point-delay': `${index * 90}ms` }}
                >
                  <span className={styles.weightDot} aria-hidden="true" />
                  {point.label && <span className={styles.weightPointLabel}>{point.label}</span>}
                  <span className={styles.weightPointText}>{point.text}</span>
                </li>
              ))}
            </ol>
          </div>

          <div
            ref={register('weight-copy')}
            className={cx(styles.weightCopy, 'weight-copy')}
          >
            <p className={styles.weightLead}>
              They often know where they want to go; call it destination B.
              <br />
              But they don&rsquo;t truly know where they are right now: point A.
            </p>
            <p>
              Without clearly seeing point A, it becomes almost impossible to measure the
              distance between A and B, and even harder to know how to reach it. Anything that
              cannot be measured is difficult to reach.
            </p>
            <p>
              In our work together, we start by understanding A: your current reality, your
              patterns, your emotions, your story. Once A becomes clearer, B is no longer a
              vague dream. It becomes a destination you can actually move toward, step by
              step.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.journeySection} aria-labelledby="journey-heading">
        <div className={`${styles.contentWidth} ${styles.journeyLayout}`}>
          <div
            ref={register('journey-header')}
            className={cx(styles.journeyHeader, 'journey-header')}
          >
            <h2 id="journey-heading" className={styles.journeyTitle}>
              The journey we walk together
            </h2>

            <p className={styles.journeySubheading}>
              Real change doesn&rsquo;t happen by accident. In one-on-one coaching, we follow a
              clear, human process that helps you move from surviving on old patterns to
              living with real choice.
            </p>
          </div>

          <ol className={styles.journeySteps}>
            {journeySteps.map((step, index) => (
              <li
                key={step.id}
                ref={register(`journey-${step.id}`)}
                className={cx(
                  [styles.journeyStep, step.isFinal ? styles.journeyStepFinal : '']
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
                    <span className={styles.journeyIcon} aria-hidden="true">
                      <step.Icon />
                    </span>
                    <span className={styles.journeyStepName}>{step.name}</span>
                    <span className={styles.journeyStepLead}>&ndash; {step.lead}</span>
                  </h3>

                  <p className={styles.journeyStepText}>{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div
            ref={register('journey-outro')}
            className={cx(styles.journeyOutro, 'journey-outro')}
          >
            <p className={styles.journeyOutroText}>
              Ready to move from &lsquo;I need to change&rsquo; to actually changing? Start by
              booking your first session.
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

      <section className={styles.structureSection} aria-labelledby="structure-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('structure-header')}
            className={cx(styles.structureHeader, 'structure-header')}
          >
            <p className={styles.eyebrow}>The Structure</p>

            <h2 id="structure-heading" className={styles.structureTitle}>
              What One-on-One Coaching practically looks like
            </h2>
          </div>

          <div className={styles.structureCards}>
            {structureCards.map((card, index) => (
              <article
                key={card.id}
                ref={register(`structure-${card.id}`)}
                className={cx(styles.structureCard, `structure-${card.id}`)}
                style={{ '--card-delay': `${index * 90}ms` }}
              >
                <span className={styles.structureIcon} aria-hidden="true">
                  <card.Icon />
                </span>

                <h3 className={styles.structureCardTitle}>{card.title}</h3>
                <p className={styles.structureCardText}>{card.text}</p>
              </article>
            ))}
          </div>

          <div
            ref={register('structure-expect')}
            className={cx(styles.structureExpect, 'structure-expect')}
          >
            <p className={styles.structureExpectTitle}>
              Inside the sessions, you can expect:
            </p>

            <ul className={styles.structureList}>
              {expectPoints.map((point) => (
                <li key={point}>
                  <span className={styles.structureCheck} aria-hidden="true">
                    <FiCheck />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <p className={styles.structureNote}>
              This experience is not just &ldquo;uplifting.&rdquo; It is designed to be
              genuinely transformative, not motivational noise that fades after a few
              days.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.processSection} aria-labelledby="process-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('process-header')}
            className={cx(styles.processHeader, 'process-header')}
          >
            <div className={styles.processHeaderText}>
              <p className={styles.eyebrow}>The Process</p>

              <h2 id="process-heading" className={styles.processTitle}>
                How it works
              </h2>
            </div>

            <span className={styles.processHeaderRule} aria-hidden="true" />
          </div>

          <div className={styles.processCards}>
            {processSteps.map((step, index) => (
              <article
                key={step.id}
                ref={register(`process-${step.id}`)}
                className={cx(styles.processCard, `process-${step.id}`)}
                style={{ '--card-delay': `${index * 90}ms` }}
              >
                <span className={styles.processNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>

                <h3 className={styles.processStepTitle}>{step.title}</h3>

                <div className={styles.processCardText}>
                  {step.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div
            ref={register('process-outro')}
            className={cx(styles.processOutro, 'process-outro')}
          >
            <div className={styles.processOutroCopy}>
              <p className={styles.processOutroText}>
                One-on-One Coaching is an investment in the part of your life you
                can&rsquo;t outsource: your inner world, your relationships, your
                emotional health.
              </p>

              <p className={styles.processOutroLead}>
                Ready to explore if this is for you?
              </p>
            </div>

            <Link
              href={BOOKING_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.processCta}
            >
              <span>Book Your Session</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <OneOnOneTestimonials />

      <section className={styles.faqSection} aria-labelledby="faq-heading">
        <div className={styles.contentWidth}>
          <div ref={register('faq-header')} className={cx(styles.faqHeader, 'faq-header')}>
            <h2 id="faq-heading" className={styles.faqTitle}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className={styles.faqList}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index

              return (
                <div
                  key={faq.id}
                  ref={register(`faq-${faq.id}`)}
                  className={cx(
                    [styles.faqItem, isOpen ? styles.faqItemOpen : ''].filter(Boolean).join(' '),
                    `faq-${faq.id}`
                  )}
                >
                  <h3 className={styles.faqHeading}>
                    <button
                      type="button"
                      className={styles.faqTrigger}
                      aria-expanded={isOpen}
                      aria-controls={`faq-panel-${faq.id}`}
                      id={`faq-trigger-${faq.id}`}
                      onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    >
                      <span className={styles.faqQuestion}>{faq.question}</span>

                      <span className={styles.faqToggle} aria-hidden="true">
                        <span className={styles.faqToggleLineV} />
                        <span className={styles.faqToggleLineH} />
                      </span>
                    </button>
                  </h3>

                  <div
                    id={`faq-panel-${faq.id}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${faq.id}`}
                    className={styles.faqPanel}
                  >
                    <div className={styles.faqPanelInner}>
                      <p>{faq.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className={styles.closingSection} aria-labelledby="closing-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('closing-header')}
            className={cx(styles.closingHeader, 'closing-header')}
          >
            <h2 id="closing-heading" className={styles.closingTitle}>
              If something inside you knows you can&rsquo;t keep living the same way, that
              voice deserves a safe space.
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

          <div
            ref={register('closing-cta')}
            className={cx(styles.closingCtaBlock, 'closing-cta')}
          >
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
