'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaQuoteLeft } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import styles from './OneOnOneTestimonials.module.css'

const testimonials = [
  {
    quote: 'The communication course helped me notice the reaction before it took over. I started speaking with more honesty, less defensiveness, and a clearer sense of what I actually needed.',
    name: 'Joseph',
    role: 'Team Lead',
    image: '/testimonials/avatar-1.jpg',
  },
  {
    quote: 'Unlock Your Financial Frequency changed the way I looked at money. It became less about pressure and more about awareness, responsibility, and the choices I was avoiding.',
    name: 'Melissa Bader',
    role: 'Entrepreneur',
    image: '/testimonials/avatar-2.jpg',
  },
  {
    quote: 'I came in wanting tools for better conversations and left with a deeper understanding of my patterns. The work felt practical, direct, and surprisingly human.',
    name: 'Tia',
    role: 'Educator',
    image: '/testimonials/avatar-3.jpg',
  },
  {
    quote: 'The sessions around interpersonal dynamics helped me stop blaming the room and start owning my part in it. That shift changed how I lead, listen, and respond.',
    name: 'Jessy',
    role: 'Operations Manager',
    image: '/testimonials/avatar-5.jpg',
  },
  {
    quote: 'The financial course gave language to beliefs I had carried for years. Once I could see them clearly, I could make calmer decisions and rebuild trust with myself.',
    name: 'Lara',
    role: 'Creative Professional',
    image: '/testimonials/avatar-lara.jpg',
  },
]

function getCardsPerView() {
  if (typeof window === 'undefined') return 4
  if (window.matchMedia('(max-width: 680px)').matches) return 1
  if (window.matchMedia('(max-width: 1024px)').matches) return 2
  return 4
}

export default function OneOnOneTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardsPerView, setCardsPerView] = useState(4)
  const [motionReady, setMotionReady] = useState(false)
  const [visibleItems, setVisibleItems] = useState([])
  const itemRefs = useRef({})

  const maxIndex = Math.max(0, testimonials.length - cardsPerView)

  useEffect(() => {
    const updateCardsPerView = () => setCardsPerView(getCardsPerView())

    updateCardsPerView()
    window.addEventListener('resize', updateCardsPerView)
    return () => window.removeEventListener('resize', updateCardsPerView)
  }, [])

  useEffect(() => {
    setActiveIndex((currentIndex) => Math.min(currentIndex, maxIndex))
  }, [maxIndex])

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
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    )

    Object.values(itemRefs.current).forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  const registerItem = (itemId) => (node) => {
    if (!node) return

    node.dataset.motionItem = itemId
    itemRefs.current[itemId] = node
  }

  const isVisible = (itemId) => visibleItems.includes(itemId)
  const movePrev = () => setActiveIndex((currentIndex) => (
    currentIndex === 0 ? maxIndex : currentIndex - 1
  ))
  const moveNext = () => setActiveIndex((currentIndex) => (
    currentIndex >= maxIndex ? 0 : currentIndex + 1
  ))

  return (
    <section
      className={`${styles.section} ${motionReady ? styles.motionReady : ''}`}
      aria-labelledby="oo-testimonials-heading"
    >
      <div className={styles.container}>
        <header
          ref={registerItem('header')}
          className={`${styles.header} ${isVisible('header') ? styles.itemVisible : ''}`}
        >
          <div className={styles.headingBlock}>
            <h2 id="oo-testimonials-heading" className={styles.title}>
              <span className={styles.titleLine}>What clients say about</span>
              <span className={styles.titleLine}>One-on-One Coaching</span>
            </h2>
            <p className={styles.intro}>
              Real words from people who showed up, did the work, and started relating to
              themselves and others differently.
            </p>
          </div>

        </header>

        <div className={styles.carouselViewport}>
          <div className={styles.track} style={{ '--testimonial-index': activeIndex }}>
            {testimonials.map((testimonial, index) => {
              const itemId = `testimonial-${index}`

              return (
                <article
                  key={testimonial.name}
                  ref={registerItem(itemId)}
                  className={`${styles.card} ${isVisible(itemId) ? styles.itemVisible : ''}`}
                  style={{ '--testimonial-delay': `${index * 90}ms` }}
                >
                  <FaQuoteLeft className={styles.quoteIcon} aria-hidden="true" />
                  <p className={styles.quoteText}>{testimonial.quote}</p>
                  <div className={styles.person}>
                    <Image
                      src={testimonial.image}
                      alt=""
                      width={160}
                      height={160}
                      sizes="(max-width: 680px) 68px, 76px"
                      unoptimized
                      className={styles.avatar}
                    />
                    <div>
                      <h3 className={styles.name}>{testimonial.name}</h3>
                      <p className={styles.role}>{testimonial.role}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        <div className={styles.controls} aria-label="Testimonials carousel controls">
          <button type="button" className={styles.controlButton} onClick={movePrev} aria-label="Previous testimonials">
            <FiArrowLeft aria-hidden="true" />
          </button>
          <button type="button" className={styles.controlButton} onClick={moveNext} aria-label="Next testimonials">
            <FiArrowRight aria-hidden="true" />
          </button>
        </div>

        <div className={styles.progress} aria-hidden="true">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <span
              key={index}
              className={`${styles.progressDot} ${index === activeIndex ? styles.progressDotActive : ''}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
