'use client'

import { useEffect, useRef, useState } from 'react'
import {
  FiBookOpen,
  FiBriefcase,
  FiMessageCircle,
  FiMic,
  FiSliders,
  FiUsers,
} from 'react-icons/fi'
import styles from './EventFormatsSection.module.css'

const formats = [
  { title: 'Keynote', bestFor: 'Conferences, summits, large community gatherings', duration: 'Around 90 minutes', icon: FiMic },
  { title: 'Interactive workshop', bestFor: 'Audiences ready to participate, reflect, and work with a topic in depth', duration: 'One or two days', icon: FiUsers },
  { title: 'Corporate training', bestFor: 'Teams developing communication, relational awareness, and group dynamics', duration: 'Two days', icon: FiBriefcase },
  { title: 'Masterclass', bestFor: 'Focused learning experiences for a defined audience', duration: 'Five hours or more', icon: FiBookOpen },
  { title: 'Panel', bestFor: 'Events that need a grounded psychological perspective', duration: 'Flexible', icon: FiMessageCircle },
  { title: 'Custom session', bestFor: 'A format designed around your event and audience', duration: 'To be agreed together', icon: FiSliders },
]

const topics = [
  'Relationships and relationship dynamics',
  'Self-esteem and the way people see themselves',
  'Boundaries, saying no, and people-pleasing patterns',
  'Purpose, passion, and the search for meaning',
  'Generational patterns and workplace communication',
  'Managers’ blind spots and cross-generational tension',
  'Personality differences and how they shape connection',
  'Inner-child awareness',
  'Life narratives: the stories people carry about who they are',
  'The emotional dimensions of family, identity, and change',
]

function useSectionReveal() {
  const nodes = useRef(new Map())
  const [visibleItems, setVisibleItems] = useState(() => new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.eventFormatReveal)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return
        setVisibleItems((current) => {
          const next = new Set(current)
          revealed.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.13, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const register = (id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }
    node.dataset.eventFormatReveal = id
    nodes.current.set(id, node)
  }

  return { register, visibleItems }
}

export default function EventFormatsSection() {
  const { register, visibleItems } = useSectionReveal()
  const isVisible = (id) => visibleItems.has(id)

  return (
    <section className={styles.section} aria-labelledby="event-formats-heading">
      <div className={styles.container}>
        <header
          ref={register('formats-header')}
          className={`${styles.header} ${isVisible('formats-header') ? styles.revealed : ''}`}
        >
          <p className={styles.eyebrow}>Ways to work together</p>
          <h2 id="event-formats-heading" className={styles.title}>
            Conversations Zak Can Bring to Your Event
          </h2>
          <p className={styles.intro}>Choose the format that fits</p>
        </header>

        <div className={styles.formatGrid}>
          {formats.map((format, index) => {
            const Icon = format.icon
            const revealId = `format-card-${index}`

            return (
              <article
                key={format.title}
                ref={register(revealId)}
                className={`${styles.formatCard} ${isVisible(revealId) ? styles.revealed : ''}`}
                style={{ '--format-delay': `${index * 70}ms` }}
              >
                <div className={styles.cardTopline}>
                  <span className={styles.cardIndex}>{String(index + 1).padStart(2, '0')}</span>
                  <Icon className={styles.cardIcon} aria-hidden="true" />
                </div>
                <h3>{format.title}</h3>
                <div className={styles.cardDetail}>
                  <span>Best for</span>
                  <p>{format.bestFor}</p>
                </div>
                <div className={styles.cardDuration}>
                  <span>Typical duration</span>
                  <p>{format.duration}</p>
                </div>
              </article>
            )
          })}
        </div>

        <p
          ref={register('formats-note')}
          className={`${styles.deliveryNote} ${isVisible('formats-note') ? styles.revealed : ''}`}
        >
          Sessions are available in person and online. In-person delivery is preferred when
          possible.
        </p>

        <div className={styles.topicsArea}>
          <div
            ref={register('topics-header')}
            className={`${styles.topicsHeader} ${isVisible('topics-header') ? styles.revealed : ''}`}
          >
            <p className={styles.topicsTitle}>Topics that meet people where they are</p>
            <p className={styles.topicsIntro}>Zak can also tailor a session around:</p>
          </div>

          <ol className={styles.topicsList}>
            {topics.map((topic, index) => {
              const revealId = `topic-${index}`
              return (
                <li
                  key={topic}
                  ref={register(revealId)}
                  className={isVisible(revealId) ? styles.revealed : ''}
                  style={{ '--topic-delay': `${(index % 5) * 65}ms` }}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{topic}</p>
                </li>
              )
            })}
          </ol>
        </div>

        <p
          ref={register('formats-closing')}
          className={`${styles.closingNote} ${isVisible('formats-closing') ? styles.revealed : ''}`}
        >
          Every session is shaped around your audience, the purpose of the event, and what your
          people are navigating.
        </p>
      </div>
    </section>
  )
}
