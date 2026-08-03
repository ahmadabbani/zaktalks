'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './about.module.css'

const stats = [
  {
    value: 19000,
    suffix: '',
    label: 'logged hours of work',
    ariaLabel: '19,000 logged hours of work',
  },
  {
    value: 4500,
    suffix: '',
    label: 'hours delivering workshops & trainings in organizations',
    ariaLabel: '4,500 hours delivering workshops and trainings in organizations',
  },
  {
    value: 11,
    suffix: 'K+',
    label: 'YouTube followers / subscribers',
    ariaLabel: '11K plus YouTube followers and subscribers',
  },
  {
    value: 5,
    suffix: 'K+',
    label: 'Instagram followers',
    ariaLabel: '5K plus Instagram followers',
  },
]

const milestones = [
  {
    year: '2015',
    title: 'Personal Leadership',
    date: 'March 21, 2015',
    tone: 'blue',
  },
  {
    year: '2015',
    title: 'Inner Child Healing',
    date: 'October 5, 2015',
    tone: 'yellow',
  },
  {
    year: '2016',
    title: 'Personal Productivity',
    date: 'September 2016',
    tone: 'slate',
  },
  {
    year: '2017',
    title: 'Selling Strategy',
    date: 'September 14, 2017',
    tone: 'blue',
  },
  {
    year: '2018',
    title: 'Facilitator of the Year',
    date: 'Leadership Management International · 2018',
    badge: 'Award',
    tone: 'yellow',
  },
  {
    year: '2018',
    title: 'Sales Olympics',
    date: 'Leadership Management International · 2018',
    badge: 'Award',
    tone: 'yellow',
  },
  {
    year: '2020',
    title: 'Transactional Analysis',
    date: '22 May 2020',
    tone: 'slate',
  },
  {
    year: '2020',
    title: 'Relationship Psychology',
    date: 'October 2020',
    tone: 'blue',
  },
  {
    year: '2021',
    title: 'Redecision Therapy Marathon',
    date: '24 July 2021',
    tone: 'slate',
  },
  {
    year: '2021',
    title: 'Counseling',
    date: 'September 2021',
    tone: 'blue',
  },
  {
    year: '2025',
    title: 'Zak Talks Podcast Launch',
    date: 'Premiered Apr 27, 2025',
    badge: 'Launch',
    tone: 'yellow',
  },
  {
    year: '2025',
    title: 'Co-creative Transactional Analysis',
    date: 'November 2025',
    tone: 'slate',
  },
  {
    year: '2026',
    title: 'E-learning Platform Launching',
    date: 'August 2026',
    badge: 'Next',
    tone: 'yellow',
  },
]

const milestoneOrbitPoints = [
  { x: 70.5, y: 14.5, side: 'right' },
  { x: 83.6, y: 26.5, side: 'right' },
  { x: 90.4, y: 42.9, side: 'right' },
  { x: 89.6, y: 60.6, side: 'right' },
  { x: 81.4, y: 76.4, side: 'right' },
  { x: 67.3, y: 87.2, side: 'right' },
  { x: 50, y: 91, side: 'bottom' },
  { x: 32.7, y: 87.2, side: 'left' },
  { x: 18.6, y: 76.4, side: 'left' },
  { x: 10.4, y: 60.6, side: 'left' },
  { x: 9.6, y: 42.9, side: 'left' },
  { x: 16.4, y: 26.5, side: 'left' },
  { x: 29.5, y: 14.5, side: 'left' },
]

const getMilestoneOrbitPosition = (index) => ({
  '--orbit-x': `${milestoneOrbitPoints[index].x}%`,
  '--orbit-y': `${milestoneOrbitPoints[index].y}%`,
  '--milestone-delay': `${(index % 4) * 55}ms`,
})

const numberFormatter = new Intl.NumberFormat('en-US')

export default function AboutPageContent() {
  const countersRef = useRef(null)
  const introRef = useRef(null)
  const narrativeRef = useRef(null)
  const philosophyRef = useRef(null)
  const milestonesRef = useRef(null)
  const milestoneItemRefs = useRef([])
  const credibilityImageRef = useRef(null)
  const credibilityContentRef = useRef(null)
  const valuesHeaderRef = useRef(null)
  const valuesImageRef = useRef(null)
  const valuesPanelRef = useRef(null)
  const finalCtaContentRef = useRef(null)
  const finalCtaVisualRef = useRef(null)
  const [heroVisible, setHeroVisible] = useState(false)
  const [countersVisible, setCountersVisible] = useState(false)
  const [introVisible, setIntroVisible] = useState(false)
  const [narrativeVisible, setNarrativeVisible] = useState(false)
  const [philosophyVisible, setPhilosophyVisible] = useState(false)
  const [milestonesVisible, setMilestonesVisible] = useState(false)
  const [visibleMilestones, setVisibleMilestones] = useState(() => new Set())
  const [credibilityImageVisible, setCredibilityImageVisible] = useState(false)
  const [credibilityContentVisible, setCredibilityContentVisible] = useState(false)
  const [valuesHeaderVisible, setValuesHeaderVisible] = useState(false)
  const [valuesImageVisible, setValuesImageVisible] = useState(false)
  const [valuesPanelVisible, setValuesPanelVisible] = useState(false)
  const [finalCtaContentVisible, setFinalCtaContentVisible] = useState(false)
  const [finalCtaVisualVisible, setFinalCtaVisualVisible] = useState(false)
  const [counts, setCounts] = useState(() => stats.map(() => 0))

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroVisible(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const counters = countersRef.current
    if (!counters) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setCountersVisible(true)
        observer.disconnect()
      },
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(counters)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!countersVisible) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCounts(stats.map((stat) => stat.value))
      return undefined
    }

    let animationFrame
    let startTime
    const duration = 1700

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp

      const progress = Math.min((timestamp - startTime) / duration, 1)
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      setCounts(stats.map((stat) => Math.round(stat.value * easedProgress)))

      if (progress < 1) animationFrame = window.requestAnimationFrame(animate)
    }

    animationFrame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [countersVisible])

  useEffect(() => {
    const intro = introRef.current
    if (!intro) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setIntroVisible(true)
        observer.disconnect()
      },
      { threshold: 0.28, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(intro)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const narrative = narrativeRef.current
    if (!narrative) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setNarrativeVisible(true)
        observer.disconnect()
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(narrative)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const philosophy = philosophyRef.current
    if (!philosophy) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setPhilosophyVisible(true)
        observer.disconnect()
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(philosophy)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const section = milestonesRef.current
    if (!section) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setMilestonesVisible(true)
        observer.disconnect()
      },
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' }
    )

    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(Number(entry.target.dataset.milestoneIndex))
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return

        setVisibleMilestones((current) => {
          const next = new Set(current)
          revealed.forEach((index) => next.add(index))
          return next
        })
      },
      { threshold: 0.32, rootMargin: '0px 0px -7% 0px' }
    )

    milestoneItemRefs.current.forEach((item) => {
      if (item) observer.observe(item)
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const targets = [
      [credibilityImageRef.current, setCredibilityImageVisible],
      [credibilityContentRef.current, setCredibilityContentVisible],
      [valuesHeaderRef.current, setValuesHeaderVisible],
      [valuesImageRef.current, setValuesImageVisible],
      [valuesPanelRef.current, setValuesPanelVisible],
      [finalCtaContentRef.current, setFinalCtaContentVisible],
      [finalCtaVisualRef.current, setFinalCtaVisualVisible],
    ].filter(([element]) => element)

    const revealTarget = new Map(targets)
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealTarget.get(entry.target)?.(true)
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
    )

    targets.forEach(([element]) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <main className={styles.page}>
      <section className={`${styles.hero} ${heroVisible ? styles.heroVisible : ''}`} aria-labelledby="about-hero-heading">
        <div className={`${styles.contentWidth} ${styles.heroContentWidth}`}>
          <div className={styles.heroContent}>
            <h1 id="about-hero-heading" className={styles.heroTitle}>
              Since we can almost design everything, why not design a life first?
            </h1>
            <p className={styles.heroCopy}>
              Understand yourself more deeply, communicate more clearly, and live with greater awareness, responsibility, and purpose.
            </p>
            <Link
              href="https://calendly.com/zaktalks/1-1-session-with-zak"
              target="_blank"
              rel="noreferrer"
              className={styles.heroCta}
            >
              <span>BOOK YOUR CALL</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          ref={countersRef}
          className={`${styles.countersSection} ${countersVisible ? styles.countersVisible : ''}`}
          aria-label="Zak Talks experience and community"
        >
          <div className={styles.contentWidth}>
            <div className={styles.counterPanel} role="list">
              {stats.map((stat, index) => (
                <article
                  key={stat.ariaLabel}
                  className={styles.stat}
                  style={{ '--stat-delay': `${180 + (index * 90)}ms` }}
                  role="listitem"
                  aria-label={stat.ariaLabel}
                >
                  <p className={styles.statValue} aria-hidden="true">
                    {numberFormatter.format(counts[index])}
                    {stat.suffix && <span>{stat.suffix}</span>}
                  </p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

      </section>

      <section
        className={`${styles.storySection} ${introVisible ? styles.storySectionVisible : ''}`}
        aria-labelledby="about-intro-heading"
      >
        <div ref={introRef} className={`${styles.contentWidth} ${styles.storyIntroInner}`}>
          <div className={styles.storyIntroContent}>
            <h2 id="about-intro-heading" className={styles.storyIntroTitle}>
              <span className={styles.storyIntroHey}>Hey</span>
              <span className={styles.storyIntroNameRow}>
                <span className={styles.storyIntroName}>I’M ZAK!</span>
                <svg
                  className={styles.storyArrow}
                  viewBox="0 0 300 300"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    className={styles.storyArrowCurve}
                    pathLength="1"
                    d="M4 26C112 31 204 86 236 153C254 191 253 228 239 264"
                  />
                  <path
                    className={styles.storyArrowHead}
                    pathLength="1"
                    d="M210 242L239 273L288 242"
                  />
                </svg>
              </span>
            </h2>
            <p className={styles.storyIntroCopy}>
              I don’t have all the answers. I’m far from perfect. I’m nowhere near enlightened—and I’m completely okay with that.
            </p>
          </div>
        </div>

        <div
          ref={narrativeRef}
          className={`${styles.contentWidth} ${styles.storyNarrative} ${narrativeVisible ? styles.storyNarrativeVisible : ''}`}
        >
          <div className={styles.storyImageWrap}>
            <Image
              src="/about3.jpg"
              alt="Zak Dakkash delivering a workshop"
              fill
              sizes="(max-width: 1024px) calc(100vw - (2 * var(--featured-section-gutter))), 50vw"
              unoptimized
              className={styles.storyImage}
            />
          </div>

          <div className={styles.storyNarrativeBody}>
            <h3 className={`${styles.storySpecialTitle} ${styles.storyNarrativeTitle}`}>
              ABOUT.
            </h3>

            <div className={styles.storyNarrativeCopy}>
              <p>
                For more than 20 years, I worked across artistic disciplines including graphic design, interior design, 3D modeling, product design, and visual problem-solving. Long before I entered the world of coaching, I was already studying how reality is built, how people perceive it, and how small details shape the way we experience the world.
              </p>
              <p>
                In digital art, nothing appears on its own. You build everything from the ground up — form, texture, shadow, light, depth, and relationship. You learn that what looks natural is often the result of structure, awareness, and precision. That way of thinking stayed with me. It trained me to observe carefully, think systemically, and look beneath what is obvious.
              </p>
              <p>
                Later, that same lens began to shape how I understood people and life. I started to see that human experience also has structure. Our patterns, reactions, relationships, and inner conflicts are not random. There is usually a root beneath the surface, and when that root is ignored, the pain spreads into every area of life.
              </p>
              <p className={styles.storyNarrativeEmphasis}>
                That is one of the ideas at the heart of my work.
              </p>
              <p>
                A person may come in talking about stress, conflict, fear, disconnection, or feeling stuck. But often, those are not the beginning of the story. They are the visible symptoms. My work is to help people find the splinter beneath the pain — the deeper pattern, wound, survival response, or belief that has quietly been shaping everything else.
              </p>
              <p>
                My shift into personal development and mental health came from a simple but life-changing realization: if we can design almost anything externally, why do we not learn how to consciously design a life from within? That question changed my direction and became the foundation of Zak Talks.
              </p>
            </div>

            <Link
              href="https://www.linkedin.com/in/zak-dakkash-32b21382/"
              target="_blank"
              rel="noreferrer"
              className={styles.storyCta}
            >
              <span>Check My LinkedIn</span>
              <FiArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          ref={philosophyRef}
          className={`${styles.contentWidth} ${styles.storyNarrative} ${styles.storyPhilosophy} ${philosophyVisible ? styles.storyPhilosophyVisible : ''}`}
        >
          <div className={`${styles.storyNarrativeBody} ${styles.storyPhilosophyBody}`}>
            <h3 className={`${styles.storySpecialTitle} ${styles.storyCompactTitle} ${styles.storyPhilosophyTitle}`}>
              MISSION &amp; PHILOSOPHY.
            </h3>

            <div className={styles.storyNarrativeCopy}>
              <p className={styles.storyNarrativeEmphasis}>
                I see coaching as an art form.
              </p>
              <p>
                It is the art of presence, awareness, honesty, and deep observation of what is happening in the moment. It is not about fixing people, because I do not believe people are problems to be fixed. I believe people already carry intelligence, capacity, and meaning within them — but many have lost access to it under the weight of survival, conditioning, pain, or disconnection.
              </p>
              <p className={styles.storyNarrativeEmphasis}>
                My role is to help bring that access back.
              </p>
              <p>
                I work in a co-creative way, which means I do not force people through a rigid script. We build the process together based on what is true, needed, and ready to be seen. I draw from multiple psychological schools and methodologies. Still, the deeper principle is always the same: create safety, build awareness, support re-decision, integrate change, and help the person return to autonomy.
              </p>
              <p>
                I also believe personal leadership sits at the core of a meaningful life. The way we think, choose, respond, relate, and grow shapes everything around us. Life is not simply something that happens to us. It is something we can learn to meet consciously.
              </p>
            </div>
          </div>

          <div className={`${styles.storyImageWrap} ${styles.storyPhilosophyImageWrap}`}>
            <Image
              src="/about1.jpg"
              alt="Zak Dakkash speaking during a workshop"
              fill
              sizes="(max-width: 1024px) calc(100vw - (2 * var(--featured-section-gutter))), 50vw"
              unoptimized
              className={`${styles.storyImage} ${styles.storyPhilosophyImage}`}
            />
          </div>
        </div>
      </section>

      <section
        ref={milestonesRef}
        className={`${styles.milestonesSection} ${milestonesVisible ? styles.milestonesSectionVisible : ''}`}
        aria-labelledby="milestones-heading"
      >
        <div className={styles.contentWidth}>
          <p className={styles.orbitSectionLabel}>The work, in motion</p>

          <div className={styles.milestoneOrbit}>
            <svg
              className={styles.orbitRoute}
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <circle
                className={styles.orbitRouteBase}
                pathLength="1"
                cx="500"
                cy="500"
                r="410"
              />
            </svg>

            <div className={styles.orbitCore}>
              <h2 id="milestones-heading">Built one layer at a time.</h2>
              <small>2015 — 2026</small>
            </div>

            <div className={styles.orbitItems} role="list">
              {milestones.map((milestone, index) => {
                const side = milestoneOrbitPoints[index].side

                return (
                  <article
                    key={`${milestone.title}-${milestone.date}`}
                    ref={(element) => { milestoneItemRefs.current[index] = element }}
                    data-milestone-index={index}
                    className={`${styles.orbitItem} ${styles[`orbitItem${side[0].toUpperCase()}${side.slice(1)}`]} ${visibleMilestones.has(index) ? styles.orbitItemVisible : ''}`}
                    style={getMilestoneOrbitPosition(index)}
                    role="listitem"
                  >
                    <span
                      className={`${styles.orbitNode} ${styles[`orbitNode${milestone.tone[0].toUpperCase()}${milestone.tone.slice(1)}`]}`}
                      aria-hidden="true"
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{milestone.year}</strong>
                    </span>

                    <div className={styles.orbitCopy}>
                      <div className={styles.orbitMeta}>
                        {milestone.badge && <span>{milestone.badge}</span>}
                        <time>{milestone.date}</time>
                      </div>
                      <h3 className={styles.orbitName}>{milestone.title}</h3>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.credibilitySection} aria-labelledby="credibility-heading">
        <div className={styles.credibilityWidth}>
          <div ref={credibilityImageRef} className={styles.credibilityStage}>
            <div
              className={`${styles.credibilityImageWrap} ${credibilityImageVisible ? styles.credibilityImageVisible : ''}`}
            >
              <Image
                src="/credibility.jpg"
                alt="Zak Dakkash facilitating a learning session"
                fill
                sizes="(max-width: 700px) calc(100vw - (2 * var(--featured-section-gutter))), 78vw"
                unoptimized
                className={styles.credibilityImage}
              />
            </div>

            <div
              ref={credibilityContentRef}
              className={`${styles.credibilityLower} ${credibilityContentVisible ? styles.credibilityContentVisible : ''}`}
            >
              <div className={styles.credibilitySeal} aria-label="More than 20 software tools taught">
                <strong>20+</strong>
                <span>tools taught</span>
              </div>

              <article className={styles.credibilityCard}>
                <p className={styles.credibilityEyebrow}>Creative practice meets human work</p>
                <h2 id="credibility-heading" className={styles.credibilityTitle}>
                  A broader foundation.
                </h2>
                <div className={styles.credibilityCopy}>
                  <p>
                    My background is unusual by design. I come from creative disciplines, systems thinking, design, education, and hands-on technical work, and all of that informs how I coach today. I have also taught more than 20 software tools in digital art and worked across furniture fabrication, branding, interiors, programming and machine operation, photography, and visual creation.
                  </p>
                  <p>
                    My educational transactional analysis extends through coaching, workshops, speaking, online courses, and podcast content created to support deeper self-awareness, better communication, and personal transformation.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.valuesSection} aria-labelledby="values-heading">
        <div className={styles.contentWidth}>
          <div ref={valuesImageRef} className={styles.valuesCanvas}>
            <div
              ref={valuesHeaderRef}
              className={`${styles.valuesHeader} ${valuesHeaderVisible ? styles.valuesHeaderVisible : ''}`}
            >
              <p className={styles.valuesScript}>What stays true</p>
              <h2 id="values-heading" className={styles.valuesWords}>
                <span>Vulnerability</span>
                <span>Curiosity</span>
                <span>Creativity</span>
              </h2>
            </div>

            <div
              className={`${styles.valuesImageWrap} ${valuesImageVisible ? styles.valuesImageVisible : ''}`}
            >
              <Image
                src="/values.jpg.jpg"
                alt="Zak Dakkash speaking with openness and energy"
                fill
                sizes="(max-width: 1024px) 78vw, 28vw"
                unoptimized
                className={styles.valuesImage}
              />
            </div>

            <div
              ref={valuesPanelRef}
              className={`${styles.valuesReadingPanel} ${valuesPanelVisible ? styles.valuesPanelVisible : ''}`}
            >
              <p>
                <strong>The values behind my work are vulnerability, curiosity, and creativity.</strong>{' '}
                I believe every human being is unrepeatable, and I believe it is possible to go through life without ever discovering your real purpose, which is why this work matters so deeply to me.
              </p>
              <p>
                Outside the coaching space, I am still a creator at heart. I paint, draw, design, fabricate furniture, work visually, dive, and play the cello. Those parts of me are not separate from the work; they are part of how I learned to see life with depth, pattern, rhythm, and meaning.
              </p>
              <Link
                href="https://asitis3d.xyz/"
                target="_blank"
                rel="noreferrer"
                className={`${styles.storyCta} ${styles.valuesCta}`}
              >
                <span>Explore my creative work</span>
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalCtaSection} aria-labelledby="final-cta-heading">
        <div className={styles.contentWidth}>
          <div className={styles.finalCtaLayout}>
            <div
              ref={finalCtaContentRef}
              className={`${styles.finalCtaContent} ${finalCtaContentVisible ? styles.finalCtaContentVisible : ''}`}
            >
              <h2 id="final-cta-heading" className={styles.finalCtaTitle}>
                If something in this story <span>feels familiar,</span>
              </h2>
              <p className={styles.finalCtaCopy}>
                that may be a sign you are ready for a different kind of conversation: honest work that helps you understand what is really going on, reconnect with yourself, and move forward with more clarity.
              </p>

              <div className={styles.finalCtaActions}>
                <Link href="/coaching" className={`${styles.storyCta} ${styles.finalCtaPrimary}`}>
                  <span>Work With Zak</span>
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
                <Link href="/courses" className={`${styles.storyCta} ${styles.finalCtaSecondary}`}>
                  <span>Explore Courses</span>
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
              </div>
            </div>

            <div
              ref={finalCtaVisualRef}
              className={`${styles.finalCtaVisual} ${finalCtaVisualVisible ? styles.finalCtaVisualVisible : ''}`}
            >
              <div className={styles.finalCtaImageFrame}>
                <Image
                  src="/about2.jpg"
                  alt="Zak Dakkash leading a live learning session"
                  width={1152}
                  height={1728}
                  sizes="(max-width: 720px) min(72vw, 22rem), 20vw"
                  unoptimized
                  className={styles.finalCtaImage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
