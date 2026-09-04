'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaBullseye,
  FaCertificate,
  FaCheck,
  FaChevronDown,
  FaClipboardCheck,
  FaClipboardList,
  FaExpand,
  FaGlobe,
  FaHeadset,
  FaImages,
  FaLightbulb,
  FaPlay,
  FaQuestionCircle,
  FaRegClock,
  FaTimes,
  FaUserTie,
  FaVideo
} from 'react-icons/fa'
import EnrollButton from '@/components/EnrollButton'
import { legacyDetailsToBlocks, normalizeContentBlocks } from '@/lib/course-content'
import styles from './CourseDetails.module.css'

const COURSE_TAGS = ['PERSONAL DEVELOPMENT', 'SELF-PACED']

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
}

function hasDistinctText(value, comparedWith) {
  const normalizedValue = String(value || '').trim()
  const normalizedComparison = String(comparedWith || '').trim()
  return Boolean(normalizedValue && normalizedValue !== normalizedComparison)
}

function formatDuration(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value <= 0) return null
  return `${Math.max(1, Math.round(value / 60))} min`
}

function getYouTubeId(value) {
  const match = String(value || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|live\/|watch\?(?:.*&)?v=))([a-zA-Z0-9_-]{11})/)
  return match?.[1] || null
}

function useScrollReveal() {
  const nodes = useRef(new Map())
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(() => new Set())

  const register = useCallback((id) => (node) => {
    if (node) nodes.current.set(id, node)
    else nodes.current.delete(id)
  }, [])

  useEffect(() => {
    const readyFrame = window.requestAnimationFrame(() => setReady(true))
    const observer = new IntersectionObserver((entries) => {
      const revealed = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target.dataset.courseReveal)

      if (!revealed.length) return

      setVisible((current) => {
        const next = new Set(current)
        revealed.forEach((id) => next.add(id))
        return next
      })
      entries.forEach((entry) => {
        if (entry.isIntersecting) observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })

    nodes.current.forEach((node) => observer.observe(node))
    return () => {
      window.cancelAnimationFrame(readyFrame)
      observer.disconnect()
    }
  }, [])

  return useCallback((id) => ({
    ref: register(id),
    'data-course-reveal': id,
    className: `${styles.revealSection} ${ready ? styles.revealPrepared : ''} ${visible.has(id) ? styles.revealed : ''}`
  }), [ready, register, visible])
}

function CourseIntroPlayer({ url, title }) {
  const videoId = getYouTubeId(url)
  const shellRef = useRef(null)
  const [started, setStarted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [posterUrl, setPosterUrl] = useState(() => `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === shellRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])

  if (!videoId) return null

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await shellRef.current?.requestFullscreen()
    } catch (error) {
      console.error('Unable to change introduction video fullscreen state:', error)
    }
  }

  return (
    <div className={styles.videoShell} ref={shellRef}>
      {started ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&rel=0&modestbranding=1&playsinline=1`}
          title={`${title} introduction video`}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className={styles.videoIframe}
        />
      ) : (
        <button type="button" className={styles.videoPoster} onClick={() => setStarted(true)} aria-label={`Play ${title} introduction`}>
          <Image
            src={posterUrl}
            alt=""
            aria-hidden="true"
            fill
            sizes="(max-width: 1024px) 100vw, 65vw"
            quality={86}
            onError={() => setPosterUrl(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
          />
          <span className={styles.posterShade} />
          <span className={styles.playButton}><FaPlay /></span>
          <span className={styles.playLabel}>Watch the introduction</span>
        </button>
      )}
      <button type="button" className={styles.fullscreenButton} onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Open fullscreen'}>
        <FaExpand />
      </button>
    </div>
  )
}

function CourseGallery({ images, courseTitle }) {
  const [activeIndex, setActiveIndex] = useState(null)

  useEffect(() => {
    if (activeIndex === null) return undefined

    const originalOverflow = document.body.style.overflow
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveIndex(null)
      if (event.key === 'ArrowRight') setActiveIndex((current) => (current + 1) % images.length)
      if (event.key === 'ArrowLeft') setActiveIndex((current) => (current - 1 + images.length) % images.length)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, images.length])

  if (!images.length) return null

  return (
    <>
      <div className={`${styles.galleryGrid} ${images.length === 1 ? styles.singleGallery : ''} ${styles[`galleryCount${Math.min(images.length, 6)}`] || ''}`}>
        {images.map((image, index) => (
          <button
            type="button"
            key={image.id || image.image_url}
            className={`${styles.galleryTile} ${styles[`galleryTile${(index % 6) + 1}`] || ''}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Open ${image.alt_text || `${courseTitle} gallery image ${index + 1}`}`}
          >
            <Image
              src={image.image_url}
              alt={image.alt_text || `${courseTitle} gallery image ${index + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 48vw"
              quality={86}
              unoptimized
            />
            <span><FaExpand /> View</span>
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Course gallery viewer"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setActiveIndex(null) }}
        >
          <button type="button" className={styles.lightboxClose} onClick={() => setActiveIndex(null)} aria-label="Close gallery"><FaTimes /></button>
          {images.length > 1 && <button type="button" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={() => setActiveIndex((activeIndex - 1 + images.length) % images.length)} aria-label="Previous image"><FaArrowLeft /></button>}
          <div className={styles.lightboxStage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[activeIndex].image_url} alt={images[activeIndex].alt_text || `${courseTitle} gallery image ${activeIndex + 1}`} />
          </div>
          {images.length > 1 && <button type="button" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={() => setActiveIndex((activeIndex + 1) % images.length)} aria-label="Next image"><FaArrowRight /></button>}
          <span className={styles.lightboxCount}>{activeIndex + 1} / {images.length}</span>
        </div>
      )}
    </>
  )
}

function StructuredContentBlocks({ items }) {
  return (
    <div className={styles.structuredContentGrid}>
      {items.map((item, index) => (
        <article className={styles.structuredContentCard} key={`${item.title}-${index}`}>
          {item.title && <h3>{item.title}</h3>}
          {item.content_type === 'list'
            ? (
              <ul>
                {item.items.map((entry, itemIndex) => (
                  <li key={`${entry}-${itemIndex}`}><FaCheck /><span>{entry}</span></li>
                ))}
              </ul>
            )
            : item.text && <p>{item.text}</p>}
        </article>
      ))}
    </div>
  )
}

function CourseFaqs({ faqs }) {
  const [openId, setOpenId] = useState(faqs[0]?.id || null)
  if (!faqs.length) return null

  return (
    <div className={styles.faqList}>
      {faqs.map((faq, index) => {
        const id = faq.id || `faq-${index}`
        const isOpen = openId === id
        return (
          <article className={`${styles.faqItem} ${isOpen ? styles.faqOpen : ''}`} key={id}>
            <button type="button" onClick={() => setOpenId(isOpen ? null : id)} aria-expanded={isOpen}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{faq.question}</strong>
              <i><FaChevronDown /></i>
            </button>
            <div className={styles.faqAnswer}><div><p>{faq.answer}</p></div></div>
          </article>
        )
      })}
    </div>
  )
}

export default function CourseDetailsExperience({ course, curriculumModules, galleryImages, faqs, exploreMoreItems, isLoggedIn, isEnrolled }) {
  const [openModule, setOpenModule] = useState(curriculumModules[0]?.id || null)
  const revealProps = useScrollReveal()
  const learningOutcomes = useMemo(() => toList(course.what_youll_learn), [course.what_youll_learn])
  const skills = useMemo(() => toList(course.skills_youll_gain), [course.skills_youll_gain])
  const targetAudience = useMemo(() => toList(course.target_audience), [course.target_audience])
  const notForAudience = useMemo(() => toList(course.who_this_is_not_for), [course.who_this_is_not_for])
  const detailItems = useMemo(() => legacyDetailsToBlocks(course.details_to_know_items, course.details_to_know), [course.details_to_know_items, course.details_to_know])
  const exploreItems = useMemo(() => normalizeContentBlocks(course.what_youll_explore), [course.what_youll_explore])
  const lessonCount = curriculumModules.reduce((total, module) => total + module.lessons.length, 0)
  const assessmentCount = curriculumModules.reduce((total, module) => total + module.lessons.filter((lesson) => lesson.type === 'assessment').length, 0)
  const moduleCount = curriculumModules.length
  const formattedPrice = `$${(Number(course.price_cents || 0) / 100).toFixed(2)}`
  const hasIntroductionVideo = Boolean(getYouTubeId(course.introduction_video_url))
  const descriptionCopy = hasDistinctText(course.description, course.promise) ? course.description : ''
  const subheadlineCopy = hasDistinctText(course.subheadline, course.short_introduction) ? course.subheadline : ''
  const hasCourseSubheadline = Boolean(String(course.bold_introduction || '').trim() || subheadlineCopy)
  const hasDescriptionSection = Boolean(descriptionCopy || hasIntroductionVideo || galleryImages.length)
  const descriptionSectionTitle = descriptionCopy
    ? 'Course description'
    : hasIntroductionVideo
      ? 'Course introduction'
      : 'Inside the experience'
  const courseInfoItems = [
    { label: 'Modules', value: course.course_info_modules, Icon: FaBookOpen },
    { label: 'Course level', value: course.course_level, Icon: FaBullseye },
    { label: 'Language', value: course.course_language, Icon: FaGlobe },
    { label: 'Flexible schedule', value: course.flexible_schedule, Icon: FaRegClock },
    { label: 'Support', value: course.course_support, Icon: FaHeadset },
  ].filter((item) => String(item.value || '').trim())

  const purchaseAction = isEnrolled ? (
    <Link href="/dashboard" className={styles.continueButton}>Continue learning <FaArrowRight /></Link>
  ) : (
    <EnrollButton
      courseId={course.id}
      courseName={course.title}
      price={course.price_cents}
      isLoggedIn={isLoggedIn}
      text={course.primary_cta_text || 'Enroll Now'}
    />
  )

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <div className={styles.tagRow}>{COURSE_TAGS.map((tag) => <span key={tag}>{tag}</span>)}</div>
              <h1>{course.title}</h1>
              {course.promise && <p className={styles.heroDescription}>{course.promise}</p>}
              {course.short_introduction && <p className={styles.heroSubheadline}>{course.short_introduction}</p>}
              <div className={styles.instructorLine}><span><FaUserTie /></span><p><small>Instructor</small><strong>{course.tutor_name || 'Zak Dakkash'}</strong></p></div>
              <div className={styles.heroActions} id="course-action">
                <div className={styles.heroEnroll}>{purchaseAction}</div>
                <a href="#curriculum" className={styles.curriculumButton}>View curriculum <FaArrowRight /></a>
              </div>
            </div>

            <aside className={styles.heroOverview} aria-label="Course overview">
              <span className={styles.overviewLabel}>Course at a glance</span>
              <div className={styles.overviewMetrics}>
                <div><FaBookOpen /><strong>{moduleCount}</strong><span>{moduleCount === 1 ? 'Module' : 'Modules'}</span></div>
                <div><FaVideo /><strong>{lessonCount}</strong><span>Lessons</span></div>
                <div><FaClipboardCheck /><strong>{assessmentCount}</strong><span>Assessments</span></div>
              </div>
              <div className={styles.certificateNote}>
                <span><FaCertificate /></span>
                <p><strong>Certificate included</strong><small>Complete the course requirements to earn your certificate.</small></p>
              </div>
            </aside>
          </div>

          {courseInfoItems.length > 0 && (
            <div className={styles.quickFacts}>
              {courseInfoItems.map(({ label, value, Icon }) => (
                <div key={label}><Icon /><span><strong>{value}</strong><small>{label}</small></span></div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className={`container ${styles.contentGrid}`}>
          <div className={styles.primaryContent}>
            {hasDescriptionSection && (
              <section {...revealProps('description')}>
                <div className={styles.sectionLabel}><FaBookOpen /> About the course</div>
                <h2 className={styles.sectionTitle}>{descriptionSectionTitle}</h2>
                {descriptionCopy && <p className={styles.courseDescription}>{descriptionCopy}</p>}
                {hasIntroductionVideo && (
                  <div className={styles.descriptionMediaBlock}>
                    {descriptionCopy && <h3>Course introduction</h3>}
                    <CourseIntroPlayer url={course.introduction_video_url} title={course.title} />
                  </div>
                )}
                {galleryImages.length > 0 && (
                  <div className={styles.descriptionMediaBlock}>
                    {(descriptionCopy || hasIntroductionVideo) && <h3><FaImages /> Inside the experience</h3>}
                    <CourseGallery images={galleryImages} courseTitle={course.title} />
                  </div>
                )}
              </section>
            )}

            {learningOutcomes.length > 0 && (
              <section {...revealProps('learning')}>
                <div className={styles.sectionLabel}><FaCheck /> Course outcomes</div>
                <h2 className={styles.sectionTitle}>What you&apos;ll learn</h2>
                <div className={styles.learningGrid}>
                  {learningOutcomes.map((outcome, index) => <article key={`${outcome}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{outcome}</p></article>)}
                </div>
              </section>
            )}

            {skills.length > 0 && (
              <section {...revealProps('skills')}>
                <div className={styles.sectionLabel}><FaLightbulb /> Practical growth</div>
                <h2 className={styles.sectionTitle}>Skills you&apos;ll gain</h2>
                <div className={styles.skillsList}>{skills.map((skill, index) => <span key={`${skill}-${index}`}><FaCheck /> {skill}</span>)}</div>
              </section>
            )}

            {detailItems.length > 0 && (
              <section {...revealProps('details')}>
                <div className={styles.sectionLabel}><FaRegClock /> Before you begin</div>
                <h2 className={styles.sectionTitle}>Details to know</h2>
                <StructuredContentBlocks items={detailItems} />
                {course.details_cta_text && <a href="#course-action" className={styles.detailsCta}>{course.details_cta_text}<FaArrowRight /></a>}
              </section>
            )}

            {(targetAudience.length > 0 || notForAudience.length > 0) && (
              <section {...revealProps('audience')}>
                <div className={styles.audienceGrid}>
                  {targetAudience.length > 0 && <article className={styles.audienceCard}><span className={styles.audienceIcon}><FaBullseye /></span><h2>{course.target_audience_title || 'Who this is for'}</h2><ul>{targetAudience.map((item, index) => <li key={`${item}-${index}`}><FaCheck /> <span>{item}</span></li>)}</ul></article>}
                  {notForAudience.length > 0 && <article className={`${styles.audienceCard} ${styles.notForCard}`}><span className={styles.audienceIcon}><FaTimes /></span><h2>{course.who_this_is_not_for_title || 'Who this is not for'}</h2><ul>{notForAudience.map((item, index) => <li key={`${item}-${index}`}><FaTimes /> <span>{item}</span></li>)}</ul></article>}
                </div>
                {course.audience_supporting_text && <p className={styles.audienceSupportingText}>{course.audience_supporting_text}</p>}
              </section>
            )}

            {hasCourseSubheadline && (
              <section {...revealProps('course-subheadline')}>
                <div className={styles.sectionLabel}><FaLightbulb /> Course perspective</div>
                <div className={styles.subheadlineFeature}>
                  <h2>{course.bold_introduction || 'A closer look'}</h2>
                  {subheadlineCopy && <p>{subheadlineCopy}</p>}
                </div>
              </section>
            )}

            {exploreItems.length > 0 && (
              <section {...revealProps('what-youll-explore')}>
                <div className={styles.sectionLabel}><FaBullseye /> Inside the learning journey</div>
                <h2 className={styles.sectionTitle}>What you&apos;ll explore</h2>
                <StructuredContentBlocks items={exploreItems} />
              </section>
            )}

            <section id="curriculum" {...revealProps('curriculum')}>
              <div className={styles.sectionLabel}><FaClipboardList /> Course structure</div>
              <div className={styles.sectionTitleRow}>
                <h2 className={styles.sectionTitle}>Course curriculum</h2>
                <span>{moduleCount} {moduleCount === 1 ? 'module' : 'modules'} · {lessonCount} lessons</span>
              </div>
              <div className={styles.curriculumList}>
                {curriculumModules.map((module, moduleIndex) => {
                  const isOpen = openModule === module.id
                  const moduleAssessments = module.lessons.filter((lesson) => lesson.type === 'assessment').length
                  return (
                    <article className={`${styles.moduleCard} ${isOpen ? styles.moduleOpen : ''}`} key={module.id}>
                      <button type="button" className={styles.moduleHeader} onClick={() => setOpenModule(isOpen ? null : module.id)} aria-expanded={isOpen}>
                        <span className={styles.moduleNumber}>{String(moduleIndex + 1).padStart(2, '0')}</span>
                        <span className={styles.moduleIdentity}><small>Module {String(moduleIndex + 1).padStart(2, '0')}</small><strong>{module.title}</strong></span>
                        <span className={styles.moduleMeta}>{module.lessons.length} lessons{moduleAssessments ? ` · ${moduleAssessments} assessments` : ''}</span>
                        <i><FaChevronDown /></i>
                      </button>
                      <div className={styles.moduleBody}><div>
                        {module.description && <p className={styles.moduleObjective}><strong>Module objective</strong>{module.description}</p>}
                        <div className={styles.lessonList}>
                          {module.lessons.map((lesson) => {
                            const duration = formatDuration(lesson.duration_seconds)
                            const isAssessment = lesson.type === 'assessment'
                            return (
                              <div className={styles.lessonRow} key={lesson.id}>
                                <span className={styles.lessonIcon}>{isAssessment ? <FaClipboardCheck /> : <FaPlay />}</span>
                                <span className={styles.lessonCopy}><small>Lesson {String(lesson.curriculumPosition).padStart(2, '0')}</small><strong>{lesson.title}</strong>{lesson.description && <p>{lesson.description}</p>}</span>
                                <span className={styles.lessonType}>{isAssessment ? 'Assessment' : duration || 'Duration unavailable'}</span>
                              </div>
                            )
                          })}
                          {!module.lessons.length && <p className={styles.emptyCurriculum}>Lessons will be added soon.</p>}
                        </div>
                      </div></div>
                    </article>
                  )
                })}
                {!curriculumModules.length && <p className={styles.emptyCurriculum}>The curriculum will be available soon.</p>}
              </div>
            </section>

            {course.meet_the_tutor && (
              <section {...revealProps('tutor')}>
                <div className={styles.tutorSection}>
                  <span className={styles.tutorMark}><FaUserTie /></span>
                  <div><div className={styles.sectionLabel}>Your instructor</div><h2>Meet {course.tutor_name || 'Zak Dakkash'}</h2><p>{course.meet_the_tutor}</p></div>
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section {...revealProps('faqs')}>
                <div className={styles.sectionLabel}><FaQuestionCircle /> Course questions</div>
                <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
                <CourseFaqs faqs={faqs} />
              </section>
            )}

            {exploreMoreItems.length > 0 && (
              <section {...revealProps('related')}>
                <div className={styles.sectionLabel}><FaBookOpen /> Continue exploring</div>
                <h2 className={styles.sectionTitle}>Explore more</h2>
                <div className={styles.relatedGrid}>
                  {exploreMoreItems.map((item) => (
                    <article className={`${styles.relatedCard} ${item.target_type === 'page' ? styles.relatedPageCard : ''}`} key={item.id}>
                      <Link href={item.target_path} className={styles.relatedImage}>
                        {item.image_url
                          ? <Image src={item.image_url} alt={item.title} fill sizes="(max-width: 520px) 7.5rem, 16vw" quality={86} unoptimized />
                          : <span>{item.target_type === 'page' ? <FaGlobe /> : <FaBookOpen />}</span>}
                      </Link>
                      <div>
                        <h3>{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                        <Link href={item.target_path} className={styles.relatedCta}>{item.cta_text || (item.target_type === 'page' ? 'Visit page' : 'View course')} <FaArrowRight /></Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className={styles.purchaseColumn}>
            <div className={styles.purchaseSticky}>
              <div className={styles.purchaseCard}>
                <span className={styles.purchaseEyebrow}>{isEnrolled ? 'Your learning' : 'Start this course'}</span>
                <h2>{isEnrolled ? 'Continue where you left off' : 'Learn at your pace'}</h2>
                <p>Your progress is counted through completed lessons and activities, not just opening a page.</p>
                {!isEnrolled && <strong className={styles.sidebarPrice}>{formattedPrice}</strong>}
                <div className={styles.purchaseAction}>{purchaseAction}</div>
                <div className={styles.completionRules}>
                  <h3>Completion rules</h3>
                  <div><span><FaVideo /></span><p><strong>Video lessons</strong><small>Watch at least 97% to complete the lesson and unlock what comes next.</small></p></div>
                  <div><span><FaClipboardCheck /></span><p><strong>Assessments</strong><small>Complete the activity to mark it finished and unlock the next lesson.</small></p></div>
                </div>
                <div className={styles.sidebarInstructor}>
                  <span><FaUserTie /></span>
                  <p><small>Instructor</small><strong>{course.tutor_name || 'Zak Dakkash'}</strong><em>Educator, Co-Creative Transactional Analyst and Coach</em></p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}
