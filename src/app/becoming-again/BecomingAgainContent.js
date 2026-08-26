'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  FiArrowUpRight,
  FiCalendar,
  FiCheck,
  FiClipboard,
  FiClock,
  FiCompass,
  FiHelpCircle,
  FiMessageCircle,
  FiTarget,
  FiVideo,
  FiX,
} from 'react-icons/fi'
import BecomingAgainTestimonials from './BecomingAgainTestimonials'
import styles from './becoming-again.module.css'

const WAITLIST_URL =
  'https://calendly.com/zaktalks/1-1-session-with-zak?back=1&month=2026-01'
const DISCOVERY_CALL_URL =
  'https://calendly.com/zaktalks/1-1-session-with-zak?back=1&month=2026-01'

const cohortDetails = [
  {
    id: 'date',
    Icon: FiCalendar,
    label: 'Next cohort starts',
    value: 'March 2027',
  },
  {
    id: 'enrollment-starts',
    Icon: FiCalendar,
    label: 'Enrollment starts',
    value: 'Jan Feb 2027',
  },
  {
    id: 'enrollment-closes',
    Icon: FiClock,
    label: 'Enrollment closes',
    value: '1st week of March 2027',
  },
]

const fitPoints = [
  'Entrepreneurs and business owners who want to balance business with a more grounded, meaningful personal life.',
  'Executives and leaders who carry a lot of responsibility and want to lead themselves as strongly as they lead others.',
  'People who have been in pain, emotionally, relationally, or professionally, and are ready to move out of it instead of staying stuck.',
  'Anyone who feels disconnected from themselves and keeps thinking: “I don’t know myself, I don’t know my purpose, I don’t understand my emotions.”',
]

const notFitPoints = [
  'You want quick tips without doing the inner work or showing up consistently.',
  'You’re looking for pure business strategy without personal development and emotional honesty.',
  'You’re not willing to reflect, share, and be challenged in a respectful way.',
  'You prefer to stay in familiar patterns even if they are hurting you.',
]

const formatCards = [
  {
    id: 'sessions',
    Icon: FiVideo,
    title: 'Live sessions (hybrid)',
    points: [
      <>
        <strong>13 group coaching sessions</strong> (live, 2 hours, biweekly).
      </>,
      <>
        <strong>2 one-on-one sessions</strong> with Zak for deeper, personal work.
      </>,
    ],
  },
  {
    id: 'community',
    Icon: FiMessageCircle,
    title: 'Community & support',
    points: [
      <>
        A dedicated <strong>WhatsApp group</strong> for ongoing connection,
        reflection, and support.
      </>,
      <>
        A small group of <strong>8&ndash;10 participants</strong> to keep the space
        intimate, safe, and honest.
      </>,
      'Additional one-on-one support when needed, depending on your situation.',
    ],
  },
  {
    id: 'tools',
    Icon: FiClipboard,
    title: 'Tools & resources',
    points: [
      <>
        <strong>9 assessments</strong> to help you see your patterns and
        measure your growth.
      </>,
      <>
        A <strong>participant book/manual</strong> to guide you through the
        program and keep your insights organized.
      </>,
    ],
  },
]

const discoveryCallSteps = [
  {
    id: 'explore',
    Icon: FiCompass,
    text: 'Explore where you are right now and what you want to change.',
  },
  {
    id: 'clarify',
    Icon: FiTarget,
    text: 'Clarify whether the program’s structure and intensity match your needs.',
  },
  {
    id: 'answer',
    Icon: FiHelpCircle,
    text: 'Answer any questions you have about the curriculum, schedule, or investment.',
  },
]

const faqs = [
  {
    id: 'length',
    question: 'How long is the program?',
    answer:
      'The live sessions run across seven months, with biweekly 2-hour group sessions and two one-on-one sessions. The impact is designed to last far beyond the program itself.',
  },
  {
    id: 'format',
    question: 'Is it online or in person?',
    answer: (
      <>
        It&rsquo;s <strong>hybrid</strong>, a mix of online calls and in-person sessions
        in Lebanon (when possible). This allows for flexibility while still maintaining
        depth and connection.
      </>
    ),
  },
  {
    id: 'language',
    question: 'What language is the program in?',
    answer: (
      <>
        The program is primarily in <strong>English facilitated in Arabic</strong>, with
        a style that matches how people actually speak and think in real life.
      </>
    ),
  },
  {
    id: 'entrepreneur',
    question: 'Do I need to be an entrepreneur to join?',
    answer:
      'No. Entrepreneurs and executives are a big part of the community, but the core requirement is that you’re serious about leading a more conscious life.',
  },
  {
    id: 'missed-session',
    question: 'What if I miss a session?',
    answer:
      'We keep the group small so each person’s presence matters. When you miss, you’ll receive key takeaways and support, but we encourage a strong commitment to show up.',
  },
  {
    id: 'therapy',
    question: 'Is this therapy?',
    answer: (
      <>
        No. Becoming Again Program is a <strong>coaching and personal development</strong>{' '}
        program. It can complement therapy, but it does not replace professional mental
        health treatment.
      </>
    ),
  },
]

const enrollmentFacts = [
  {
    id: 'starts',
    Icon: FiCalendar,
    label: 'Next cohort starts',
    value: 'March 2027',
  },
  {
    id: 'enrollment-starts',
    Icon: FiCalendar,
    label: 'Enrollment starts',
    value: 'Jan Feb 2027',
  },
  {
    id: 'enrollment-closes',
    Icon: FiClock,
    label: 'Enrollment closes',
    value: '1st week of March 2027',
  },
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

export default function BecomingAgainContent() {
  const [heroReady, setHeroReady] = useState(false)
  const [openFaq, setOpenFaq] = useState(-1)
  const { register, cx } = useReveal()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroReady(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <main className={`${styles.page} ${heroReady ? styles.heroReady : ''}`}>
      <section className={styles.hero} aria-labelledby="ba-hero-heading">
        <div className={`${styles.contentWidth} ${styles.heroInner}`}>
          <div className={styles.heroContent}>
            <p className={styles.eyebrow}>Becoming Again Program</p>

            <h1 id="ba-hero-heading" className={styles.heroTitle}>
              <strong className={styles.heroTitleLead}>Becoming Again Program</strong>
              <span>Group Coaching for People Who Are Done Letting Life Just Happen</span>
            </h1>

            <p className={styles.heroSubtitle}>
              A 7-month journey to lead your life with strength, emotional
              intelligence, and conscious decisions, in a small group of people
              ready for real change.
            </p>
          </div>

          <aside className={styles.cohortCard} aria-label="Next cohort details">
            <p className={styles.cohortEyebrow}>Next Cohort</p>

            <ul className={styles.cohortList}>
              {cohortDetails.map((detail) => (
                <li key={detail.id} className={styles.cohortRow}>
                  <span className={styles.cohortIcon} aria-hidden="true">
                    <detail.Icon />
                  </span>
                  <span className={styles.cohortText}>
                    <span className={styles.cohortLabel}>{detail.label}</span>
                    <span className={styles.cohortValue}>{detail.value}</span>
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.cohortActions}>
              <Link
                href={WAITLIST_URL}
                target="_blank"
                rel="noreferrer"
                className={styles.primaryCta}
              >
                <span>Join waiting list</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.forSection} aria-labelledby="ba-for-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('for-header')}
            className={cx(styles.forHeader, 'for-header')}
          >
            <h2 id="ba-for-heading" className={styles.forTitle}>
              Who Becoming Again Program is for
            </h2>

            <p className={styles.forIntro}>
              This program is built for people who feel, deep down:{' '}
              <em>&ldquo;I&rsquo;m done with what I&rsquo;ve been through. Now I need
              change.&rdquo;</em>
            </p>
          </div>

          <div className={styles.forLayout}>
            <div
              ref={register('for-yes')}
              className={cx(`${styles.forColumn} ${styles.forColumnYes}`, 'for-yes')}
            >
              <h3 className={styles.forColumnTitle}>It is especially right for:</h3>

              <ul className={styles.forList}>
                {fitPoints.map((point) => (
                  <li key={point} className={styles.forListItemYes}>
                    <span className={styles.forMarkYes} aria-hidden="true">
                      <FiCheck />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              ref={register('for-no')}
              className={cx(`${styles.forColumn} ${styles.forColumnNo}`, 'for-no')}
            >
              <h3 className={styles.forColumnTitle}>Who it&rsquo;s not for</h3>

              <p className={styles.forColumnLead}>
                This Program is <strong>Not</strong> a fit if:
              </p>

              <ul className={styles.forList}>
                {notFitPoints.map((point) => (
                  <li key={point} className={styles.forListItemNo}>
                    <span className={styles.forMarkNo} aria-hidden="true">
                      <FiX />
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.forColumnNote}>
                <strong>Becoming Again Program</strong> is a space for people who are
                serious about growth, not just interested in it.
              </p>
            </div>
          </div>

          <p
            ref={register('for-closing')}
            className={cx(styles.forClosing, 'for-closing')}
          >
            If you&rsquo;re ready to look honestly at your decisions and patterns, and
            you want support, structure, and community as you change, Becoming Again Program
            is for you.
          </p>
        </div>
      </section>

      <section className={styles.curriculumSection} aria-labelledby="ba-curriculum-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('curriculum-header')}
            className={cx(styles.curriculumHeader, 'curriculum-header')}
          >
            <h2 id="ba-curriculum-heading" className={styles.curriculumTitle}>
              Curriculum breakdown
            </h2>

            <p className={styles.curriculumSubtitle}>
              Over the course of the program, you move through a structured journey
              that connects self-awareness, emotional intelligence, communication,
              and leadership, all in real life, not just theory.
            </p>
          </div>

          <div
            ref={register('curriculum-copy')}
            className={cx(styles.curriculumBody, 'curriculum-copy')}
          >
            <p>
              Becoming Again Program follows a structured growth journey built around
              the areas that shape how you live, lead, connect, and make decisions.
            </p>
            <p>
              Together, we explore self-awareness, emotional intelligence, resilience,
              communication, responsibility, values, purpose, and personal leadership.
            </p>
            <p>
              The exact process is intentionally experienced inside the program, not
              simply explained on a page because real transformation comes through
              reflection, practice, honest conversation, and consistent support.
            </p>
            <p>
              You will leave with greater clarity about who you are, what is shaping
              your choices, and how to move forward with more intention.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.formatSection} aria-labelledby="ba-format-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('format-header')}
            className={cx(styles.formatHeader, 'format-header')}
          >
            <h2 id="ba-format-heading" className={styles.formatTitle}>
              How the program works
            </h2>

            <p className={styles.formatSubtitle}>
              Becoming Again Program is designed to give you enough structure to create
              change, and enough support to stay with it.
            </p>
          </div>

          <div className={styles.formatCards}>
            {formatCards.map((card, index) => (
              <div
                key={card.id}
                ref={register(`format-${card.id}`)}
                className={cx(styles.formatCard, `format-${card.id}`)}
                style={{ '--card-delay': `${index * 90}ms` }}
              >
                <span className={styles.formatIcon} aria-hidden="true">
                  <card.Icon />
                </span>

                <h3 className={styles.formatCardTitle}>{card.title}</h3>

                <ul className={styles.formatList}>
                  {card.points.map((point, pointIndex) => (
                    <li key={pointIndex}>{point}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p
            ref={register('format-note')}
            className={cx(styles.formatNote, 'format-note')}
          >
            All sessions are live, not pre-recorded. The focus is on real
            conversation, real examples, and real change, not just content
            consumption.
          </p>
        </div>
      </section>

      <section className={styles.enrollSection} aria-labelledby="ba-enroll-heading">
        <div className={styles.contentWidth}>
          <div className={styles.enrollLayout}>
            <div
              ref={register('enroll-invest')}
              className={cx(styles.enrollInvest, 'enroll-invest')}
            >
              <p className={styles.eyebrow}>Investment &amp; Enrollment</p>

              <h2 id="ba-enroll-heading" className={styles.enrollTitle}>
                A lifetime investment, not a short course
              </h2>

              <p className={styles.enrollText}>
                This program is positioned as a <strong>lifetime investment</strong>{' '}
                in your growth, not just a short course. The structure is built to
                create long-term change, not temporary motivation.
              </p>

              <div className={styles.enrollPayment}>
                <span className={styles.enrollPaymentLabel}>Payment options</span>
                <span className={styles.enrollPaymentValue}>
                  Installments / payment plan available
                </span>
              </div>
            </div>

            <div
              ref={register('enroll-call')}
              className={cx(styles.enrollCall, 'enroll-call')}
            >
              <h3 className={styles.enrollCallTitle}>How enrollment works</h3>

              <p className={styles.enrollCallText}>
                Before you join, we schedule a <strong>discovery call</strong> to
                make sure Becoming Again Program is the right fit for you and for the
                group.
              </p>

              <p className={styles.enrollCallLabel}>On this call, we:</p>

              <ul className={styles.enrollSteps}>
                {discoveryCallSteps.map((step) => (
                  <li key={step.id} className={styles.enrollStep}>
                    <span className={styles.enrollStepIcon} aria-hidden="true">
                      <step.Icon />
                    </span>
                    <span className={styles.enrollStepText}>{step.text}</span>
                  </li>
                ))}
              </ul>

              <p className={styles.enrollCallClosing}>
                If both sides feel it&rsquo;s a good fit, you reserve your spot and
                join the next cohort.
              </p>

              <Link
                href={DISCOVERY_CALL_URL}
                target="_blank"
                rel="noreferrer"
                className={styles.enrollCta}
              >
                <span>Book a discovery call</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <BecomingAgainTestimonials />

      <section className={styles.instructorSection} aria-labelledby="ba-instructor-heading">
        <div className={styles.contentWidth}>
          <div className={styles.instructorLayout}>
            <div
              ref={register('instructor-portrait')}
              className={cx(styles.instructorPortraitStage, 'instructor-portrait')}
            >
              <div className={styles.instructorPortraitFrame}>
                <Image
                  src="/becomingagain-mettheperson.jpg"
                  alt="Zak Dakkash, founder of ZakTalks"
                  width={1000}
                  height={1333}
                  sizes="(max-width: 900px) min(68vw, 22.5rem), 27vw"
                  quality={86}
                  className={`${styles.instructorPortrait} ${styles.instructorPortraitDesktop}`}
                />
                <Image
                  src="/becomingagain-mettheperson.jpg"
                  alt="Zak Dakkash, founder of ZakTalks"
                  width={1000}
                  height={1333}
                  sizes="(max-width: 1024px) min(70vw, 18rem), 1px"
                  quality={86}
                  className={`${styles.instructorPortrait} ${styles.instructorPortraitMobile}`}
                />
              </div>
            </div>

            <div
              ref={register('instructor-story')}
              className={cx(styles.instructorStory, 'instructor-story')}
            >
              <h2 id="ba-instructor-heading" className={styles.instructorTitle}>
                Meet the person guiding the room
              </h2>

              <div className={styles.instructorBio}>
                <p>
                  Becoming Again Program is led by Zak, a multipotentialite who has
                  spent years working with entrepreneurs, executives, and organizations
                  in Lebanon and beyond.
                </p>
                <p>
                  Zak&rsquo;s work combines <strong>real-life experience</strong>,
                  coaching methodologies, and deep psychological insight. He doesn&rsquo;t
                  just teach concepts; he shares what he has lived, tested, and seen work
                  in actual businesses and personal lives.
                </p>
                <p>
                  For more about Zak&rsquo;s background, work, and story, visit the{' '}
                  <strong>About</strong> page.
                </p>
              </div>

              <Link href="/about" className={styles.instructorLink}>
                <span>Meet Zak</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.faqSection} aria-labelledby="ba-faq-heading">
        <div className={styles.contentWidth}>
          <div ref={register('faq-header')} className={cx(styles.faqHeader, 'faq-header')}>
            <h2 id="ba-faq-heading" className={styles.faqTitle}>
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

      <section className={styles.finalSection} aria-labelledby="ba-final-heading">
        <div className={styles.contentWidth}>
          <div
            ref={register('final-eyebrow')}
            className={cx(styles.finalEyebrowRow, 'final-eyebrow')}
          >
            <p className={styles.eyebrow}>Limited Spots</p>
          </div>

          <div className={styles.finalLayout}>
            <aside
              ref={register('final-facts')}
              className={cx(styles.finalFactsCard, 'final-facts')}
              aria-label="Enrollment details"
            >
              <ul className={styles.finalFactsList}>
                {enrollmentFacts.map((fact) => (
                  <li key={fact.id} className={styles.finalFactRow}>
                    <span className={styles.finalFactIcon} aria-hidden="true">
                      <fact.Icon />
                    </span>
                    <span className={styles.finalFactText}>
                      <span className={styles.finalFactLabel}>{fact.label}</span>
                      <span className={styles.finalFactValue}>{fact.value}</span>
                    </span>
                  </li>
                ))}
              </ul>

            </aside>

            <div
              ref={register('final-cta')}
              className={cx(styles.finalCtaBlock, 'final-cta')}
            >
              <h2 id="ba-final-heading" className={styles.finalTitle}>
                If you&rsquo;re ready to live from choice instead of survival, it&rsquo;s time
                to become&nbsp;again.
              </h2>

              <div className={styles.finalActions}>
                <Link
                  href={WAITLIST_URL}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.primaryCta}
                >
                  <span>Join waiting list</span>
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
