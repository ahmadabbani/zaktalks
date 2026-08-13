'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import styles from './EventPlannerQASection.module.css'

const questions = [
  {
    id: 'formats',
    question: 'Is Zak available for keynote speaking as well as workshops?',
    answer:
      'Yes. Zak is available for keynotes, interactive workshops, corporate trainings, masterclasses, panels, and custom sessions. The right format depends on your audience, event flow, and the kind of experience you want to create.',
  },
  {
    id: 'tailored',
    question: 'Can the session be tailored to our audience?',
    answer:
      'Yes. Each session is shaped around the people in the room, your event theme, and the outcome you want to support. This can include adapting the examples, discussion points, activities, and depth of the topic.',
  },
  {
    id: 'audiences',
    question: 'What audiences is this work suited to?',
    answer:
      'Zak’s work is particularly relevant for Millennials and Gen Z, as well as the organisations, teams, communities, and institutions that work with them. Topics can be adapted for employees, leaders, young professionals, entrepreneurs, educators, community members, or mixed audiences.',
  },
  {
    id: 'topics',
    question: 'What topics can Zak speak about?',
    answer: (
      <>
        Signature sessions include <strong>Interpersonal Communication Dynamics</strong> and{' '}
        <strong>Unlock Your Financial Frequency</strong>. Other themes include relationships,
        self-esteem, boundaries, purpose, workplace and generational dynamics, personality, life
        narratives, and the emotional patterns that shape how people relate.
      </>
    ),
  },
  {
    id: 'interactive',
    question: 'Are sessions interactive?',
    answer:
      'They can be. A keynote can include reflection and audience participation, while workshops and trainings create more room for dialogue, exercises, play, and group exploration. The level of interaction is agreed during planning.',
  },
  {
    id: 'delivery',
    question: 'Is Zak available online and in person?',
    answer:
      'Yes. Sessions can be delivered online or in person. In-person events are preferred where possible.',
  },
  {
    id: 'requirements',
    question: 'What does Zak need from us before the event?',
    answer:
      'Start with the date, location or online format, expected audience size, preferred topic, intended outcome, and available budget. From there, the format and practical requirements can be discussed together.',
  },
  {
    id: 'availability',
    question: 'How do we check availability?',
    answer:
      'Use the booking form and share the key details of your event. You will receive a response with availability and the most suitable next step.',
  },
]

function useQAReveal() {
  const nodes = useRef(new Map())
  const [visible, setVisible] = useState(() => new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.qaReveal)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return
        setVisible((current) => {
          const next = new Set(current)
          revealed.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const register = useCallback((id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }
    node.dataset.qaReveal = id
    nodes.current.set(id, node)
  }, [])

  return { register, visible }
}

export default function EventPlannerQASection() {
  const [openIndex, setOpenIndex] = useState(0)
  const { register, visible } = useQAReveal()

  return (
    <section className={styles.section} aria-labelledby="event-planner-qa-heading">
      <div className={styles.container}>
        <header
          ref={register('qa-header')}
          className={`${styles.header} ${visible.has('qa-header') ? styles.revealed : ''}`}
        >
          <p className={styles.eyebrow}>Before you book</p>
          <h2 id="event-planner-qa-heading" className={styles.title}>
            Event Planner Q&amp;A
          </h2>
        </header>

        <div className={styles.list}>
          {questions.map((item, index) => {
            const isOpen = openIndex === index
            const revealId = `qa-${item.id}`
            const panelId = `event-qa-panel-${item.id}`
            const triggerId = `event-qa-trigger-${item.id}`

            return (
              <article
                key={item.id}
                ref={register(revealId)}
                className={`${styles.item} ${isOpen ? styles.itemOpen : ''} ${
                  visible.has(revealId) ? styles.revealed : ''
                }`}
              >
                <h3 className={styles.questionHeading}>
                  <button
                    id={triggerId}
                    type="button"
                    className={styles.trigger}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                  >
                    <span className={styles.question}>{item.question}</span>
                    <span className={styles.toggle} aria-hidden="true">
                      <span className={styles.toggleVertical} />
                      <span className={styles.toggleHorizontal} />
                    </span>
                  </button>
                </h3>

                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  className={styles.panel}
                >
                  <div className={styles.panelInner}>
                    <p>{item.answer}</p>
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
