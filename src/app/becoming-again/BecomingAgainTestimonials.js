'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaQuoteLeft } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import styles from './BecomingAgainTestimonials.module.css'

const testimonials = [
  {
    quote: `In brief, I was totally lost, in a very high anger state almost every day. I used to look and think badly of myself. I wanted to change but did not know how. Then Gilbert, a friend of mine, told me about the unrepeatable creature we are talking about, Zak Dakkash. We also cannot forget Ramy and Michel. Since then, life is easy, simple, beautiful. I am stronger, calmer, smarter, and the best change I made since then. I am always and ever grateful.`,
    name: 'Rony Charbel Nakhle',
    image: '/testimonials/becomingagain/Rony Nakhle.png',
  },
  {
    quote: `Before this experience, I was focused on everything except what was within me. Without realizing it, I was constantly distracting myself from self-discovery. I felt something was wrong but did not yet have the words or awareness to understand it. I only knew I wanted to find the truth and change.

During my first call with Zak, I told him that I felt empty inside and was afraid to look within. He paused and said, 'I am proud of you, Paul.' It was the first time someone had told me they were proud of me.

The shift I have experienced through this ongoing, sometimes painful work can be summarized simply: learning who I truly am and pursuing God relentlessly.`,
    name: 'Paul Anthony Nakhle',
    image: '/testimonials/becomingagain/Paul Anthony.jpg',
  },
  {
    quote: `I had many childhood experiences that were indirectly shaping my relationships, especially my relationship with my mother. My relationships were not working as I wanted them to, and I needed to understand what was behind those patterns.

Meeting Zak was eye-opening. I began to recognize how precious and important I am as a person, and I am still learning this every day. I learned to prioritize myself so that I could improve my relationships with the people around me.

Setting boundaries became a central part of my journey. Step by step, I am learning to set clear, strong boundaries, even with the people closest to me, to protect both myself and my relationships.`,
    name: 'Edwine Zouein',
    image: '/testimonials/becomingagain/edwine zouein.jpeg',
  },
  {
    quote: `I honestly do not know if I would still be here without Zak. I met him through my partner, Paul, and beginning this journey has been one of the most important experiences in my life.

Before working with Zak, I felt I had no personal leadership. Through our work, I became someone who knows how to drive the car of life rather than remain a passenger. I feel closer to God, my partner, my family, and my purpose.

I am eternally grateful for Zak's presence, guidance, and the role he has played in my journey. ❤️`,
    name: 'Pia Maria Obeid',
    image: '/testimonials/becomingagain/Pia maria obeid.jpeg',
  },
  {
    quote: `At the beginning of the year, I promised myself I would seek greater clarity: to understand why I was stuck in certain patterns, unlock my inner potential, and know myself more deeply. A close friend shared an episode of ZakTalks with me, and that led me to begin this journey.

Every encounter with Zak has moved me forward. I gained a deeper understanding of the value and purpose of my existence, reconnected with my inner child, and uncovered underlying reasons for many of my stuck patterns.

I now feel more aligned with my true self, have rebuilt healthier boundaries, and see work, career, family, and relationships through a clearer lens.

Eternal gratitude is an understatement to my journey with Zak.`,
    name: 'Christelle Aouad',
    image: '/testimonials/becomingagain/Christelle Aouad.jpeg',
  },
  {
    quote: `When I first started working with Zak, I had many questions about life, personal experiences, and work. I had heard about him from my older brother for a long time and had already attended the Money Workshop before beginning one-on-one sessions.

Through this journey, I learned the importance of boundaries at work and in my community. I also improved my communication with my family, and today my relationship with my brothers has never been better. The Money Workshop helped me better understand my behavior around money and how my patterns influence my decisions.

Becoming Again Program gave me the opportunity to explore my strengths, weaknesses, and unrealized strengths. It also helped me develop my leadership skills and understand my values and responsibilities more clearly, while connecting with people on their own self-discovery journeys.

I am sure I am leaving out many things in this testimony, but I want to sincerely thank Zak for all the change, growth, and awareness he has helped bring into my life.`,
    name: 'Alec Donerian',
    image: '/testimonials/becomingagain/Alec Donerian.jpeg',
  },
  {
    quote: `Before starting coaching sessions with Zak, I felt lost and carried many questions about my fears, direction, potential, and how to move forward. Although I had experienced coaching and therapy before, I found that Zak created a space where I felt safe enough to open up and explore things more deeply.

His questions helped me pause, reflect, and connect patterns across different areas of my life, including emotions, health, spirituality, finances, communication, relationships, and leadership. Over two years of sessions, workshops, and the leadership program, I learned to communicate more effectively with my husband, heal parental trauma, set healthier boundaries, recognize and work through my feelings, and take clearer action toward my goals.

I also developed a broader mindset, greater self-awareness, and a more grounded understanding of leadership. The work helped me meet the version of myself that was already there: someone important, loved, capable, and fully alive.

So yes, I came to Zak with questions about my life, and somehow I ended up meeting myself along the way. And what a beautiful person she turned out to be.`,
    name: 'Rebecca Abi Khalil',
    image: '/testimonials/becomingagain/Rebecca Abi Khalil.jpg',
  },
]

const TESTIMONIAL_PREVIEW_LENGTH = 320

function getPreviewQuote(quote) {
  if (quote.length <= TESTIMONIAL_PREVIEW_LENGTH) return quote

  const preview = quote.slice(0, TESTIMONIAL_PREVIEW_LENGTH)
  const lastSpace = preview.lastIndexOf(' ')
  return `${preview.slice(0, lastSpace > 0 ? lastSpace : TESTIMONIAL_PREVIEW_LENGTH).trimEnd()}…`
}

function getCardsPerView() {
  if (typeof window === 'undefined') return 3
  if (window.matchMedia('(max-width: 680px)').matches) return 1
  if (window.matchMedia('(max-width: 1280px)').matches) return 2
  return 3
}

export default function BecomingAgainTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardsPerView, setCardsPerView] = useState(3)
  const [expandedIndex, setExpandedIndex] = useState(null)
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
      aria-labelledby="ba-testimonials-heading"
    >
      <div className={styles.container}>
        <header
          ref={registerItem('header')}
          className={`${styles.header} ${isVisible('header') ? styles.itemVisible : ''}`}
        >
          <div className={styles.headingBlock}>
            <h2 id="ba-testimonials-heading" className={styles.title}>
              Voices from people who became again
            </h2>
            <p className={styles.intro}>
              Real words from people who showed up for seven months, did the work
              in front of each other, and walked away leading their lives with
              more strength, clarity, and honesty.
            </p>
          </div>

        </header>

        <div className={styles.carouselViewport}>
          <div className={styles.track} style={{ '--testimonial-index': activeIndex }}>
            {testimonials.map((testimonial, index) => {
              const itemId = `testimonial-${index}`
              const isExpanded = expandedIndex === index
              const canExpand = testimonial.quote.length > TESTIMONIAL_PREVIEW_LENGTH
              return (
                <article
                  key={testimonial.name}
                  ref={registerItem(itemId)}
                  className={`${styles.card} ${isExpanded ? styles.isExpanded : ''} ${isVisible(itemId) ? styles.itemVisible : ''}`}
                  style={{ '--testimonial-delay': `${index * 90}ms` }}
                >
                  <FaQuoteLeft className={styles.quoteIcon} aria-hidden="true" />
                  <p className={styles.quoteText}>{isExpanded ? testimonial.quote : getPreviewQuote(testimonial.quote)}</p>
                  {canExpand && (
                    <button type="button" className={styles.quoteToggle} onClick={() => setExpandedIndex(isExpanded ? null : index)} aria-expanded={isExpanded}>
                      {isExpanded ? 'See less' : 'See more'}
                    </button>
                  )}
                  <div className={styles.person}>
                    <Image
                      src={testimonial.image}
                      alt=""
                      width={160}
                      height={160}
                      sizes="(max-width: 680px) 68px, 76px"
                      quality={64}
                      className={styles.avatar}
                    />
                    <div>
                      <h3 className={styles.name}>{testimonial.name}</h3>
                      {testimonial.role && <p className={styles.role}>{testimonial.role}</p>}
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
