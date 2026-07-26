'use client'

import { useEffect, useRef, useState } from 'react'
import { FaInstagram, FaYoutube } from 'react-icons/fa'
import { MdOutlineMic } from 'react-icons/md'
import styles from '@/app/page.module.css'

const proofPoints = [
  {
    id: 'youtube',
    value: 11,
    suffix: 'K',
    label: 'YouTube subscribers',
    Icon: FaYoutube,
  },
  {
    id: 'instagram',
    value: 5,
    suffix: 'K',
    label: 'Instagram followers',
    Icon: FaInstagram,
  },
  {
    id: 'podcast',
    label: 'Podcast conversations centered on unfiltered truths and the questions people usually avoid.',
    Icon: MdOutlineMic,
  },
]

function AnimatedStat({ value, suffix, isActive }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    if (!isActive) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return undefined
    }

    const duration = 900
    const startTime = performance.now()
    let frameId

    const updateValue = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(value * easedProgress))

      if (progress < 1) frameId = requestAnimationFrame(updateValue)
    }

    frameId = requestAnimationFrame(updateValue)
    return () => cancelAnimationFrame(frameId)
  }, [isActive, value])

  return (
    <>
      {displayValue}{suffix}<span className={styles.socialProofPlus}>+</span>
    </>
  )
}

export default function SocialProofSection() {
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
      { threshold: 0.3, rootMargin: '0px 0px -8% 0px' }
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
    visibleItems.includes(itemId) ? styles.socialProofItemVisible : '',
  ].filter(Boolean).join(' ')

  const sectionClassName = [
    styles.socialProofSection,
    motionReady ? styles.socialProofMotionReady : '',
  ].filter(Boolean).join(' ')

  return (
    <section className={sectionClassName} aria-labelledby="social-proof-heading">
      <div className={styles.socialProofContainer}>
        <div ref={registerItem('heading')} className={itemClassName(styles.socialProofHeading, 'heading')}>
          <h2 id="social-proof-heading">
            Growing community with real conversations and practical work.
          </h2>
        </div>

        <div className={styles.socialProofGrid}>
          {proofPoints.map(({ id, value, suffix, label, Icon }) => (
            <article
              key={id}
              ref={registerItem(id)}
              className={itemClassName(styles.socialProofCard, id)}
            >
              <Icon className={styles.socialProofIcon} aria-hidden="true" />
              {value && (
                <strong className={styles.socialProofValue}>
                  <AnimatedStat value={value} suffix={suffix} isActive={visibleItems.includes(id)} />
                </strong>
              )}
              <p className={styles.socialProofLabel}>{label}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
