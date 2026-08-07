'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './about.module.css'

const stats = [
  {
    value: 19000,
    suffix: '+',
    label: 'logged hours of work',
    ariaLabel: '19,000 plus logged hours of work',
  },
  {
    value: 4500,
    suffix: '+',
    label: 'hours delivering workshops & trainings in organizations',
    ariaLabel: '4,500 plus hours delivering workshops and trainings in organizations',
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
    title: 'Transformation Lab',
    date: '2015',
    tone: 'slate',
  },
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
    copyPlacement: 'bottomRight',
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
    copyPlacement: 'bottomLeft',
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
  {
    year: '2027',
    title: 'The Room',
    date: 'Coming soon',
    badge: 'Next',
    tone: 'blue',
  },
]

const milestoneOrbitPoints = [
  { x: 70.5, y: 14.5, side: 'right' },
  { x: 82.1, y: 24.4, side: 'right' },
  { x: 89.2, y: 37.9, side: 'right' },
  { x: 90.9, y: 53.1, side: 'right' },
  { x: 86.9, y: 67.8, side: 'right' },
  { x: 77.9, y: 80, side: 'right' },
  { x: 65, y: 88.2, side: 'right' },
  { x: 50, y: 91, side: 'bottom' },
  { x: 35, y: 88.2, side: 'left' },
  { x: 22.1, y: 80, side: 'left' },
  { x: 13.1, y: 67.8, side: 'left' },
  { x: 9.1, y: 53.1, side: 'left' },
  { x: 10.8, y: 37.9, side: 'left' },
  { x: 17.9, y: 24.4, side: 'left' },
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
                    {stat.suffix && (
                      <span className={stat.suffix === '+' ? styles.statStandalonePlus : undefined}>
                        {stat.suffix}
                      </span>
                    )}
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
                {/* Mirrored twin of the arrow below: same artwork rotated 180deg,
                    so it leaves the word on the left and leads back up. */}
                <svg
                  className={`${styles.storyArrow} ${styles.storyArrowBack} ${styles.storyArrowDefault}`}
                  viewBox="0 0 1000 1000"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <mask
                      id="about-brush-arrow-reveal-back"
                      className={styles.storyArrowGrowthMask}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="1000"
                      height="1000"
                    >
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthCurve}`}
                        pathLength="1"
                        d="M65 92C250 245 410 250 566 145C720 48 862 158 900 374C936 578 889 733 792 850"
                      />
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthHead}`}
                        pathLength="1"
                        d="M744 679L790 881L929 696"
                      />
                    </mask>
                  </defs>
                  <image
                    href="/about-brush-arrow-v2.png"
                    width="1000"
                    height="1000"
                    preserveAspectRatio="none"
                    mask="url(#about-brush-arrow-reveal-back)"
                  />
                </svg>
                <svg
                  className={`${styles.storyArrow} ${styles.storyArrowBack} ${styles.storyArrowLong}`}
                  viewBox="0 0 1024 1536"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <mask
                      id="about-brush-arrow-reveal-long-back"
                      className={styles.storyArrowGrowthMask}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="1024"
                      height="1536"
                    >
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthCurve}`}
                        pathLength="1"
                        d="M92 164C286 326 472 270 622 198C812 108 919 346 894 694C875 929 821 1082 764 1186"
                      />
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthHead}`}
                        pathLength="1"
                        d="M708 1004L755 1292L910 1060"
                      />
                    </mask>
                  </defs>
                  <image
                    href="/about-brush-arrow-medium.png"
                    width="1024"
                    height="1536"
                    preserveAspectRatio="none"
                    mask="url(#about-brush-arrow-reveal-long-back)"
                  />
                </svg>
                <span className={styles.storyIntroName}>I’M ZAK!</span>
                <svg
                  className={`${styles.storyArrow} ${styles.storyArrowDefault}`}
                  viewBox="0 0 1000 1000"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <mask
                      id="about-brush-arrow-reveal"
                      className={styles.storyArrowGrowthMask}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="1000"
                      height="1000"
                    >
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthCurve}`}
                        pathLength="1"
                        d="M65 92C250 245 410 250 566 145C720 48 862 158 900 374C936 578 889 733 792 850"
                      />
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthHead}`}
                        pathLength="1"
                        d="M744 679L790 881L929 696"
                      />
                    </mask>
                  </defs>
                  <image
                    href="/about-brush-arrow-v2.png"
                    width="1000"
                    height="1000"
                    preserveAspectRatio="none"
                    mask="url(#about-brush-arrow-reveal)"
                  />
                </svg>
                <svg
                  className={`${styles.storyArrow} ${styles.storyArrowLong}`}
                  viewBox="0 0 1024 1536"
                  fill="none"
                  aria-hidden="true"
                >
                  <defs>
                    <mask
                      id="about-brush-arrow-reveal-long"
                      className={styles.storyArrowGrowthMask}
                      maskUnits="userSpaceOnUse"
                      x="0"
                      y="0"
                      width="1024"
                      height="1536"
                    >
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthCurve}`}
                        pathLength="1"
                        d="M92 164C286 326 472 270 622 198C812 108 919 346 894 694C875 929 821 1082 764 1186"
                      />
                      <path
                        className={`${styles.storyArrowGrowthPath} ${styles.storyArrowGrowthHead}`}
                        pathLength="1"
                        d="M708 1004L755 1292L910 1060"
                      />
                    </mask>
                  </defs>
                  <image
                    href="/about-brush-arrow-medium.png"
                    width="1024"
                    height="1536"
                    preserveAspectRatio="none"
                    mask="url(#about-brush-arrow-reveal-long)"
                  />
                </svg>
              </span>
            </h2>
            <p className={styles.storyIntroCopy}>
              I don&apos;t see myself as the expert on your life. I bring my experience, my curiosity, and my okayness; you bring yours. Together, we make meaning.
            </p>
          </div>
        </div>

        <div className={styles.storyNarrativeBand}>
          <div
            ref={narrativeRef}
            className={`${styles.contentWidth} ${styles.storyNarrative} ${narrativeVisible ? styles.storyNarrativeVisible : ''}`}
          >
          <div className={styles.storyImageWrap}>
            <Image
              src="/meetzak.jpg"
              alt="Zak Dakkash"
              fill
              sizes="(max-width: 1024px) calc(100vw - (2 * var(--featured-section-gutter))), 50vw"
              unoptimized
              className={`${styles.storyImage} ${styles.storyDesktopImage}`}
            />
            <Image
              src="/aboutmobile.png"
              alt="Zak Dakkash facilitating a group session"
              fill
              sizes="(max-width: 1024px) 100vw, 1px"
              unoptimized
              className={`${styles.storyImage} ${styles.storyMobileImage}`}
            />
          </div>

          <div className={styles.storyNarrativeBody}>
            <h3 className={`${styles.storySpecialTitle} ${styles.storyNarrativeTitle}`}>
              ABOUT.
            </h3>

            <div className={styles.storyNarrativeCopy}>
              <p>
                For more than 20 years, I worked across artistic disciplines including Graphic Design, Interior Design, Digital Art, Product Design, and Photography. Long before I entered the world of coaching, I was already studying and exploring how <strong>REALITY</strong> is built, how people perceive it, and how small details shape the way we experience the world.
              </p>
              <p>
                In Digital Art, nothing appears on its own. You build everything from scratch: form, texture, shadow, light, and depth. You learn that what looks natural is often the result of structure, order, and precision. That way of thinking stayed with me. It trained me to observe carefully, think systemically, and look beneath what is obvious.
              </p>
              <p>
                Later, that same lens began to shape how I understood people and life. I started to see that human experience also has structure. Our patterns, reactions, the way we relate to self and others, and inner conflicts are not random. What we struggle with on the surface often reflects patterns developed to survive. Until those patterns are recognized, they continue to organize how we live and relate.
              </p>
              <p className={styles.storyBlueItalic}>
                That is one of the ideas at the heart of my work.
              </p>
              <p>
                People often come with stress, conflict, fear, disconnection, or feeling stuck. While these experiences are real, they are often expressions of deeper survival patterns rather than the whole story.
              </p>
              <p>
                Together, we <strong>explore</strong> those patterns, <strong>unlearn</strong> what no longer serves, and <strong>create</strong> greater awareness, choice, Okayness, and autonomy.
              </p>
              <p>
                My shift into <strong>Personal Development</strong> and Mental Health came from a simple but life-changing realization:{' '}
                <em className={styles.storyBlueItalic}>If we can design almost anything externally, why do we not learn how to consciously design a life from within?</em>{' '}
                That question changed my direction and became the foundation of <em className={styles.storyBlueItalic}>Okayness</em>.
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
        </div>

        <div className={`${styles.storyNarrativeBand} ${styles.storyPhilosophyBand}`}>
          <div
            ref={philosophyRef}
            className={`${styles.contentWidth} ${styles.storyNarrative} ${styles.storyPhilosophy} ${philosophyVisible ? styles.storyPhilosophyVisible : ''}`}
          >
          <div className={`${styles.storyNarrativeBody} ${styles.storyPhilosophyBody}`}>
            <h3 className={`${styles.storySpecialTitle} ${styles.storyCompactTitle} ${styles.storyPhilosophyTitle}`}>
              MISSION &amp; PHILOSOPHY.
            </h3>

            <div className={styles.storyNarrativeCopy}>
              <p>
                I see coaching as a relational practice.
              </p>
              <p>
                It begins with the belief that people are fundamentally <strong>Okay</strong>. We are not problems to be fixed; we are people who have adapted to survive. Many of those adaptations were once necessary. Some continue to support us; others quietly limit our awareness, relationships, and choices.
              </p>
              <p>
                My role is not to provide answers. It is to think with people, create the conditions for honest exploration, and support the unlearning of survival patterns that no longer serve them.
              </p>
              <p>
                My work is grounded in <strong>Co-Creative Transactional Analysis</strong>. Every coaching journey begins with a clear contract and develops through an Adult-to-Adult relationship. Together, we cultivate awareness, challenge outdated beliefs, make new decisions, and expand autonomy.
              </p>
              <p>
                I believe <strong>Personal Leadership</strong> grows from <em className={styles.storyPhilosophyAccent}>awareness</em>. The way we think, relate, communicate, and choose shapes the lives we create. When we reconnect with our <em className={styles.storyPhilosophyAccent}>Okayness</em>, we become more present-centered, creating space for greater awareness, choice, and autonomy.
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
              <h2 id="milestones-heading">Growth becomes lasting when it is integrated.</h2>
              <small>Since 2015</small>
            </div>

            <div className={styles.orbitItems} role="list">
              {milestones.map((milestone, index) => {
                const side = milestoneOrbitPoints[index].side

                return (
                  <article
                    key={`${milestone.title}-${milestone.date}`}
                    ref={(element) => { milestoneItemRefs.current[index] = element }}
                    data-milestone-index={index}
                    className={`${styles.orbitItem} ${styles[`orbitItem${side[0].toUpperCase()}${side.slice(1)}`]} ${milestone.copyPlacement ? styles[`orbitCopy${milestone.copyPlacement[0].toUpperCase()}${milestone.copyPlacement.slice(1)}`] : ''} ${visibleMilestones.has(index) ? styles.orbitItemVisible : ''}`}
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
                <span>Faith</span>
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
                Three values guide everything I do: <strong>vulnerability, curiosity, and faith.</strong>{' '}
                Vulnerability creates authentic contact. Curiosity opens the door to awareness. Faith is the quiet trust that people are fundamentally <em className={styles.valuesBlueItalic}>Okay</em> and capable of growth, even when they cannot yet see it for themselves.
              </p>
              <p>
                Outside the coaching space, I&apos;m still a creator at heart. I paint, draw, design, build furniture, work with visual media, dive, and play the cello. These are not separate from my work; they continue to shape how I notice patterns, embrace uncertainty, and meet people with presence, curiosity, and respect.
              </p>
              <Link
                href="https://asitis3d.xyz/"
                target="_blank"
                rel="noreferrer"
                className={`${styles.storyCta} ${styles.valuesCta}`}
              >
                <span>Check Asitis 3D</span>
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
                This may be a sign you are ready for a different kind of conversation: honest work that helps you understand what is really going on, reconnect with yourself, and move forward with more clarity.
              </p>

              <div className={styles.finalCtaActions}>
                <Link href="/coaching" className={`${styles.storyCta} ${styles.finalCtaPrimary}`}>
                  <span>Work With Zak</span>
                  <FiArrowUpRight aria-hidden="true" />
                </Link>
                <Link href="/coaching" className={`${styles.storyCta} ${styles.finalCtaPrimary}`}>
                  <span>Explore Becoming Again</span>
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
