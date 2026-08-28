'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { FaQuoteLeft } from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi'
import styles from './TestimonialsSection.module.css'

const testimonials = [
  {
    quote: `Zack helped me better understand myself and work through the issues I was facing. With his knowledge and experience, he guided me throughout this journey and helped me become a better person. His approach is unique: he draws on different schools of thought to understand each situation from multiple angles and work toward resolution. Because of our work together, I feel more confident and happier, and I have developed stronger communication skills.`,
    name: 'Jad Fakhry',
    image: '/testimonials/home/jad fakhry.jpeg',
  },
  {
    quote: `Zak has had a huge impact on my life. A year ago, I did not believe in myself and was unaware of my potential. I often sought approval through people-pleasing, even when it left me unhappy and drained.

Zak saw through that, believed in me, and guided me to see that I am more than those patterns. He helped me rebuild trust with my inner child and understand myself more deeply.

Today, I know my purpose, have restored my faith, and am no longer afraid of change. I have learned to stand up for myself, embrace vulnerability, recognize my self-worth, set clear boundaries and, most importantly, learned what unconditional love is. <3`,
    name: 'Ramella Tahmeyan',
    image: '/testimonials/home/Ramella Tahmeyan.jpg',
  },
  {
    quote: `Before working with Zak, I felt like I was surviving more than living. I carried confusion and fear, and had lost touch with who I truly was. Through our work together, I did not just learn tools, I began to understand myself.

I became aware of patterns I had never noticed, started healing parts of myself, and gradually found the courage to make decisions aligned with who I truly am. Today, I feel more grounded, freer, and more connected to myself and God.

I am truly grateful for the guidance, wisdom, and safe space Zak provided throughout this journey. It has truly been life-changing.`,
    name: 'Josette Sader',
    image: '/testimonials/home/Josette Sader.jpeg',
  },
  {
    quote: `Zak helped me make sense of things and gave me a tool to deal with difficult situations at a time when I needed it most. His guidance and support helped me maintain my sanity and move through a challenging period.`,
    name: 'Raffi Domenian',
    image: '/testimonials/home/Raffi Doumanian.JPG',
  },
  {
    quote: `Before I met Zak, I had many unanswered questions about myself. I looked for clarity through substances and external experiences, believing the answers had to come from outside of me.

A friend referred me to Zak when I was ready to question how I had been thinking. He did not simply give me answers; he challenged the assumptions behind my questions and helped me learn to sit with uncertainty rather than chase immediate certainty.

The change was not a dramatic breakthrough, but a quieter one. I became more honest with myself and began to see how much of my identity was built around achievement, attachment, and looking outside myself to feel whole. I may not have found all the answers, but I learned how to ask better questions.`,
    name: 'Joseph Khalil',
    image: '/testimonials/home/Joseph Khalil.jpeg',
  },
  {
    quote: `After feeling lost, stuck in survival mode, and unsure of my purpose, a friend recommended that I try one-on-one sessions with Zak. I was initially skeptical and nervous, but his comforting presence made it easier to open up from our first meeting.

What stood out was his ability to connect how I act, behave, and feel today with experiences from my past. He helped me trace my insecurities to their roots, which allowed me to stop seeing myself as broken and understand how past experiences had shaped me.

Over nearly two months, I have begun working through old wounds, reacting differently to triggers, and making choices based on who I want to be rather than fear or old habits. I know this is a long journey, but I am already far ahead of where I was when I first began.`,
    name: 'Raoul Saber',
    image: '/testimonials/home/Raoul Saber.jpeg',
  },
  {
    quote: `I came to Zak while I was stuck in grief, living with fear, and chasing a dream while my mindset was not aligned with reality. I chose to seek support because, regardless of what I had experienced in life, I did not want to pass it on to my daughter.

What stood out most was Zak's analytical mind and gentle approach, which helped guide me where I needed to go willingly. He helped me understand how the people in my life may have hurt me because they were hurting themselves.

I realized I did not want to continue grieving the past. My soul deserves peace, love, and to be seen. I began to challenge the inner-child beliefs that I was unworthy of love or not smart enough. Today, I believe I deserve what life has to offer and that everything is possible with the right mindset.

Thank you Zak ❤️🙏`,
    name: 'Nora Tahmeyan',
    image: '/testimonials/home/Nora Nercessian.png',
  },
  {
    quote: `I reached out to Zak at a time when I felt I was losing control of myself and needed guidance. After hearing about his work through my cousin and seeing her growth, I felt encouraged to begin my own journey.

I had seen several therapists before, but Zak was the first person who knew how to work with me and help unlock things within me. His approach felt genuine and grounded.

Through this process, I have become more self-aware of my feelings, more mature, and better able to bring my unconscious patterns into alignment with my conscious choices. I am beginning to regain my spark and take control of myself and my life. It is taking time, but I feel I am on the right track with the right guidance. My analytical thinking has also improved.`,
    name: 'Rouba El Feghaly',
    image: '/testimonials/home/Rouba El Feghali.jpeg',
  },
  {
    quote: `I was feeling stuck and overwhelmed, dealing with constant self-doubt and inconsistent focus across my work and personal goals. I needed structure, a clear and objective perspective, and support in navigating performance pressure and building mental resilience.

Zak does not waste time on fluff. He helps break down complex emotional blocks into actionable steps that can be put into practice.

Through this process, I gained greater emotional discipline and clarity. I learned not to let temporary setbacks take over my mindset and to trust my process over the long term. After three years as an employee, within one year of meeting Zak, I found the courage to become an entrepreneur and open my own business.`,
    name: 'Rodrigue Maalouf',
    image: '/testimonials/home/Rodrigue Maalouf.png',
  },
  {
    quote: `I first met Zak through two close friends, without knowing much about him or self-development. At the time, I did not feel I had major issues, but I also had little awareness of myself and the areas I could work on.

I began with Personal Leadership, a 10-month group coaching journey that became one of the most meaningful experiences I have had. It helped me become aware of things I had not recognized and discover parts of myself I did not know existed. I continued through workshops, including Interpersonal Communication Dynamics and Unlock Your Financial Frequency, before beginning one-on-one sessions where deeper personal work began.

Through this journey, I became more aware of patterns, emotions, and unconscious influences. I worked through overthinking, my need to make everything logical, and changed how I view relationships and women. What stands out most about Zak is his genuine, personalized approach. He communicates with each person according to their personality and where they are in life, rather than offering generic advice. This experience changed how I understand myself, others, and life.

I'm genuinely very thankful for everything I've learned and experienced through Zak's work.`,
    name: 'Aren Donerian',
    image: '/testimonials/home/Donerian.jpeg',
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

export default function TestimonialsSection() {
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
      aria-labelledby="testimonials-heading"
    >
      <div className={styles.container}>
        <header
          ref={registerItem('header')}
          className={`${styles.header} ${isVisible('header') ? styles.itemVisible : ''}`}
        >
          <div className={styles.headingBlock}>
            <h2 id="testimonials-heading" className={styles.title}>
              <span className={styles.titleLine}>What changes when the work becomes real</span>
            </h2>
            <p className={styles.intro}>
              Transformation is not about fixing yourself. It is about starting from <strong>Okayness</strong>, unlearning what once helped you survive, and choosing more authentic ways of living and relating.
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
