'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaQuoteLeft } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import styles from './OneOnOneTestimonials.module.css'

const testimonials = [
  {
    quote: `Zak shifted my life.

At the beginning of the journey, I wondered what was happening to me. But through the growth, becoming, and learning to accept myself for who I am, I can say it has been worth every minute and every dime I invested in the process.`,
    name: 'Jean Paul El Hajj',
    image: '/testimonials/1on1/Jean-Paul El Hage.jpeg',
  },
  {
    quote: `As an introspective overthinker, I believed I did not need therapy to solve my problems or understand what was going on. But in February 2026, I noticed a recurring pattern in my life and could not understand why it kept repeating.

I decided to start working with Zak, and although the first session was overwhelming, it was also deeply eye-opening. Zak is an excellent listener and brings a valuable balance of analytical thinking and empathy.

Through this process, I have changed how I approach relationships, becoming more mindful of who I allow into my life and how I view myself in every context. I have also learned to hold 'mini Jenny' dearly, wherever life takes me.`,
    name: 'Jenny Elia',
    image: '/testimonials/1on1/Jenny Elia.JPG',
  },
  {
    quote: `At 25, I felt completely lost and stuck in recurring cycles across work, family, and relationships. As a fashion designer, I had been out of work for nearly two years, stepping back from opportunities because I was unsure of myself and my direction. I had also lost my creative spark and was facing financial instability and family strain.

Zak helped me feel safe while gently challenging the beliefs that kept me stuck. He helped me understand the patterns and ego states influencing my family dynamics and work habits.

Through this experience, I found myself again. I am now launching my own brand, setting healthier boundaries with my family, and becoming more aware of patterns in my relationship. I also gained a deeper understanding of the connection between my emotional stress and physical health while living with endometriosis. The inner work continues, but returning home to myself has been worth every step.`,
    name: 'Romy Bader',
    image: '/testimonials/1on1/Romy Bader.jpg',
  },
  {
    quote: `I was often feeling upset and exhausted, and I struggled to communicate clearly and deal with certain situations. From my first session with Zak, I felt relaxed after speaking with him. I felt that he understood me and recognized what I was truly feeling.`,
    name: 'Elie Saade',
    image: '/testimonials/1on1/Elie Saadeh.jpeg',
  },
  {
    quote: `I began working with Zak during one of the most difficult periods of my life, while navigating major changes, motherhood, a demanding professional life, and the need to find balance again.

What stood out was that he did not focus only on what I was facing in the present. He helped me explore where certain patterns, reactions, and beliefs came from, including experiences from childhood. Reconnecting with and healing my inner child was an important part of the process.

Our sessions helped me handle challenges with my children in a healthier way, set better boundaries, and approach personal and professional relationships with greater clarity. I also learned to recognize my value at work and in life, and to understand where I should not compromise myself.

It was not one dramatic change. It was a series of small realizations and shifts that gradually changed the way I see myself, handle situations, make decisions, and trust myself.`,
    name: 'Amy Aoun',
    image: '/testimonials/1on1/Amy Aoun.JPG',
  },
  {
    quote: `I used to be afraid to speak in front of an audience, new people, or even friends. Through working with Zak and taking part in Becoming Again Program, I gained confidence, learned how to communicate more comfortably, and became more able to be myself around others.`,
    name: 'Arno Donerian',
    image: '/testimonials/1on1/Arno Donerian.jpeg',
  },
  {
    quote: `Although many things in my life were going well on the outside, I felt overwhelmed and disconnected from myself. I was overthinking, questioning my decisions, and reacting emotionally without always understanding what was beneath those reactions.

What made working with Zak possible was the non-judgmental space he created. I never felt I needed to have everything figured out or present a certain version of myself. Rather than telling me what to do, he asks questions that help me see myself and situations differently, while balancing support with the challenge I sometimes need.

I am still in the process, but I have become more aware of my patterns, triggers, overthinking, and tendency to seek reassurance outside myself. I am learning to pause, understand what I feel before reacting, connect with my inner child, and express my feelings more clearly. I now see this as an ongoing journey of getting to know myself, including the parts that are not always easy to face.`,
    name: 'Christelle El Maasri',
    image: '/testimonials/1on1/Christelle El Maasri.jpeg',
  },
  {
    quote: `Through Zak's mentorship, I found more clarity about my limiting beliefs. I learned about the importance of self-reflection and understanding my ego to open my heart more fully to life.

I also began letting go of deeply rooted limiting beliefs, which reshaped how I see my existence. Zak's approach stood out because he noticed even subtle shifts in my body language and small reactions. He is so in the moment, and this helped me notice and uncover thought patterns I had not fully recognized.

His compassion and loving kindness made this work possible. I am grateful for the opportunity to truly work on myself and develop my character with such a kind and genuine person. Today, I feel freer and happier. I am beyond grateful.

Thank you Zak!`,
    name: 'Marianne Eid',
    image: '/testimonials/1on1/Ianne Universe.jpeg',
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

export default function OneOnOneTestimonials() {
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
      aria-labelledby="oo-testimonials-heading"
    >
      <div className={styles.container}>
        <header
          ref={registerItem('header')}
          className={`${styles.header} ${isVisible('header') ? styles.itemVisible : ''}`}
        >
          <div className={styles.headingBlock}>
            <h2 id="oo-testimonials-heading" className={styles.title}>
              What clients say about<br />One-on-One Coaching
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
