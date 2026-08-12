'use client'

import { useEffect, useRef, useState } from 'react'
import { FiMinus, FiPlus } from 'react-icons/fi'
import styles from './events.module.css'

const sessions = [
  {
    title: 'Interpersonal Communication Dynamics',
    subtitle: 'Understanding what happens between people.',
    copy: [
      'Why do two people hear the same conversation differently? Why do some conflicts keep repeating, even when everyone has good intentions?',
      'This session explores communication beyond words: the ego states, protective roles, old messages, and relational patterns that shape how people connect, react, lead, and withdraw.',
    ],
    designedFor:
      'Teams, young professionals, leadership groups, communities, and learning events.',
    participants: [
      'How communication patterns are formed',
      'The roles people fall into under pressure',
      'How to move from reaction to awareness',
      'How to create clearer, more respectful conversations',
    ],
    availableAs: 'Keynote, interactive workshop, masterclass, or corporate training.',
  },
  {
    title: 'Unlock Your Financial Frequency',
    subtitle: 'The emotional story behind money.',
    copy: [
      'Money carries more than numbers. It can hold messages about security, worth, power, belonging, loyalty, fear, and possibility.',
      'This session invites participants to look at the personal story behind their relationship with money, and how that story can influence decisions, identity, relationships, and the life they believe is available to them.',
    ],
    designedFor:
      'Entrepreneurship events, young professionals, personal growth communities, employee experiences, and financial well-being programmes.',
    participants: [
      'The emotional meaning they attach to money',
      'How family and culture shape financial patterns',
      'The connection between money, identity, and self-worth',
      'More conscious ways of relating to financial choices',
    ],
    availableAs: 'Keynote, workshop, masterclass, or retreat session.',
  },
]

export default function SignatureSessionsSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [visibleItems, setVisibleItems] = useState(() => new Set())
  const nodes = useRef(new Map())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.sessionReveal)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return
        setVisibleItems((current) => {
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

  const register = (id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }

    node.dataset.sessionReveal = id
    nodes.current.set(id, node)
  }

  return (
    <section className={styles.sessionsSection} aria-labelledby="signature-sessions-heading">
      <div className={styles.contentWidth}>
        <header
          ref={register('sessions-header')}
          className={`${styles.sessionsHeader} ${
            visibleItems.has('sessions-header') ? styles.sessionRevealed : ''
          }`}
        >
          <p className={styles.sectionLabel}>Signature sessions</p>
          <h2 id="signature-sessions-heading" className={styles.sectionTitle}>
            Sessions built for the room
          </h2>
        </header>

        <div className={styles.sessionsRail}>
          {sessions.map((session, index) => {
            const isActive = activeIndex === index
            const revealId = `signature-session-${index}`
            const detailsId = `signature-session-details-${index}`

            return (
              <article
                key={session.title}
                ref={register(revealId)}
                className={`${styles.sessionCard} ${
                  isActive ? styles.sessionCardActive : ''
                } ${visibleItems.has(revealId) ? styles.sessionRevealed : ''}`}
                onPointerEnter={(event) => {
                  if (event.pointerType !== 'touch') setActiveIndex(index)
                }}
                onFocusCapture={() => setActiveIndex(index)}
              >
                <button
                  type="button"
                  className={styles.sessionToggle}
                  aria-expanded={isActive}
                  aria-controls={detailsId}
                  onClick={() => setActiveIndex(index)}
                >
                  <span className={styles.sessionIndex}>0{index + 1}</span>
                  <span className={styles.sessionHeadingGroup}>
                    <span className={styles.sessionTitle}>{session.title}</span>
                    <span className={styles.sessionSubtitle}>{session.subtitle}</span>
                    <span className={styles.sessionPreview}>{session.copy[0]}</span>
                  </span>
                  <span className={styles.sessionToggleIcon} aria-hidden="true">
                    {isActive ? <FiMinus /> : <FiPlus />}
                  </span>
                </button>

                <div
                  id={detailsId}
                  className={styles.sessionDetails}
                  aria-hidden={!isActive}
                >
                  <div className={styles.sessionNarrative}>
                    {session.copy.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  <div className={styles.sessionAudience}>
                    <span>Designed for</span>
                    <p>{session.designedFor}</p>
                  </div>

                  <div className={styles.sessionExplore}>
                    <p className={styles.sessionMicroLabel}>Participants explore</p>
                    <ol className={styles.sessionPoints}>
                      {session.participants.map((point, pointIndex) => (
                        <li key={point}>
                          <span>{String(pointIndex + 1).padStart(2, '0')}</span>
                          <p>{point}</p>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className={styles.sessionFormats}>
                    <span>Available as</span>
                    <p>{session.availableAs}</p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
