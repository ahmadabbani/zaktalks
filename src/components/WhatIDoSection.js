'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './WhatIDoSection.module.css'

const services = [
  {
    title: 'One-on-One Coaching',
    copy: 'A focused space for adults who want to work deeply on themselves, understand the root of their patterns, and make meaningful change in how they think, relate, and live.',
    cta: 'Book a session',
    href: '/contact',
    image: '/home-whatido-1on1.jpg',
    mobileImage: '/home-whatido-1on1-mobile.jpg',
    imageAlt: 'Abstract illustration of two people connecting through a path of personal growth',
    tone: 'light',
  },
  {
    title: 'Becoming Again',
    copy: 'A leadership coaching experience for executives, entrepreneurs, emerging leaders, and educators who want to lead consciously, live intentionally, and grow beyond old roles and reactions.',
    cta: 'Join Becoming Again',
    href: '/becoming-again',
    image: '/home-whatido-becomeagain.jpg',
    mobileImage: '/home-whatido-becomeagain-mobile.jpg',
    imageAlt: 'Abstract illustration of a leader moving toward a new horizon',
    tone: 'blue',
  },
  {
    title: 'Online Courses',
    copy: 'Self-paced programs designed to turn insight into action. Start with Interpersonal Communication Dynamics or explore deeper work through Unlock Your Financial Frequency.',
    cta: 'View courses',
    href: '/courses',
    image: '/what-i-do/online-courses.webp',
    imageAlt: 'Abstract illustration of learning panels becoming a path forward',
    tone: 'dark',
    hidden: true,
  },
  {
    title: 'Events',
    copy: 'Live experiences for teams, organizations, and communities that want practical insight, emotional honesty, and conversations that lead to real change.',
    cta: 'Inquire about events',
    href: '/contact',
    image: '/home-whatido-events.jpg',
    mobileImage: '/home-whatido-events-mobile.jpg',
    imageAlt: 'Abstract illustration of a microphone connecting a community through conversation',
    tone: 'yellow',
  },
]

export default function WhatIDoSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [motionReady, setMotionReady] = useState(false)
  const [visibleItems, setVisibleItems] = useState([])
  const itemRefs = useRef({})

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
      { threshold: 0.24, rootMargin: '0px 0px -7% 0px' }
    )

    Object.values(itemRefs.current).forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  const registerItem = (itemId) => (node) => {
    if (!node) return

    node.dataset.motionItem = itemId
    itemRefs.current[itemId] = node
  }

  const isItemVisible = (itemId) => visibleItems.includes(itemId)
  const visibleServices = services.filter((service) => !service.hidden)

  return (
    <section
      className={`${styles.section} ${motionReady ? styles.motionReady : ''}`}
      aria-labelledby="what-i-do-heading"
    >
      <div className={styles.container}>
        <header
          ref={registerItem('header')}
          className={`${styles.header} ${isItemVisible('header') ? styles.itemVisible : ''}`}
        >
          <div className={styles.headingBlock}>
            <p className={styles.eyebrow}>What I do</p>
            <h2 id="what-i-do-heading" className={styles.title}>
              Choose the path that meets you where you are
            </h2>
            <p className={styles.intro}>
              The work is built around what you need, what you are ready for, and what will actually move you forward.
            </p>
          </div>

          <Link href="/services" className={styles.servicesLink}>
            <span>Explore all services</span>
            <FiArrowUpRight aria-hidden="true" />
          </Link>
        </header>

        <div className={styles.rail}>
          {[0, 2].map((rowStart) => (
            <div key={rowStart} className={styles.railRow}>
              {visibleServices.slice(rowStart, rowStart + 2).map((service, rowIndex) => {
                const index = rowStart + rowIndex
                const isActive = activeIndex === index
                const itemId = `service-${index}`
                const detailsId = `service-details-${index}`

                return (
                  <article
                    key={service.title}
                    ref={registerItem(itemId)}
                    className={[
                      styles.card,
                      styles[`card${index + 1}`],
                      styles[`tone${service.tone[0].toUpperCase()}${service.tone.slice(1)}`],
                      isActive ? styles.cardActive : '',
                      isItemVisible(itemId) ? styles.itemVisible : '',
                    ].filter(Boolean).join(' ')}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== 'touch') setActiveIndex(index)
                    }}
                    onFocusCapture={() => setActiveIndex(index)}
                  >
                    <button
                      type="button"
                      className={styles.cardToggle}
                      aria-expanded={isActive}
                      aria-controls={detailsId}
                      onClick={() => setActiveIndex(index)}
                    >
                      <span className={styles.cardNumber}>0{index + 1}</span>
                      <span className={styles.cardTitle}>{service.title}</span>
                    </button>

                    <div
                      id={detailsId}
                      className={styles.details}
                      aria-hidden={!isActive}
                    >
                      <p className={styles.copy}>{service.copy}</p>
                    </div>

                    <div className={styles.imageWrap} aria-hidden={!isActive}>
                      <Image
                        src={service.image}
                        alt={service.imageAlt}
                        width={720}
                        height={720}
                        sizes="(max-width: 720px) 82vw, (max-width: 1040px) 38vw, 18vw"
                        quality={64}
                        className={`${styles.image} ${styles.imageDesktop}`}
                      />
                      {service.mobileImage && (
                        <Image
                          src={service.mobileImage}
                          alt={service.imageAlt}
                          width={1000}
                          height={1234}
                          sizes="(max-width: 720px) 82vw, 1px"
                          quality={64}
                          className={`${styles.image} ${styles.imageMobile}`}
                        />
                      )}
                    </div>

                    <Link href={service.href} className={styles.cardCta}>
                      <span>{service.cta}</span>
                      <FiArrowUpRight aria-hidden="true" />
                    </Link>
                  </article>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
