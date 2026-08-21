'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  FaArrowRight,
  FaBookOpen,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaClock,
  FaGraduationCap,
  FaLock,
  FaPlay,
  FaPlayCircle,
} from 'react-icons/fa'
import { buildLessonAccessMap, getFirstAvailableLesson } from '@/lib/course-progression'
import styles from './dashboard.module.css'

function formatDate(value, includeTime = false) {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(date)
}

function percentage(completed, total) {
  return total > 0 ? Math.round((completed / total) * 100) : 0
}

function flattenModules(modules = []) {
  return modules.flatMap((module) => module.lessons || [])
}

function getCourseMetrics(course) {
  const lessons = flattenModules(course.modules)
  const completed = lessons.filter((lesson) => lesson.progress?.is_completed).length
  const started = lessons.some((lesson) => lesson.progress)
  const completedMap = Object.fromEntries(
    lessons.map((lesson) => [lesson.id, Boolean(lesson.progress?.is_completed)])
  )
  const nextLesson = getFirstAvailableLesson(course.modules, completedMap)

  return {
    lessons,
    completed,
    total: lessons.length,
    percent: percentage(completed, lessons.length),
    started,
    nextLesson,
  }
}

function CourseCard({ course }) {
  const metrics = getCourseMetrics(course)
  const actionLabel = metrics.percent === 100
    ? 'Review lessons'
    : metrics.started
      ? 'Continue learning'
      : 'Start course'
  const lastActivity = formatDate(course.last_activity_at)

  return (
    <article className={styles.learnerCourseCard}>
      <div className={styles.learnerCourseSelect}>
        <div className={styles.learnerCourseVisual}>
          {course.logo_url ? (
            // Course artwork is stored as a managed remote URL and may not match Next image host rules.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.logo_url} alt="" loading="lazy" />
          ) : (
            <span><FaGraduationCap /></span>
          )}
          <div className={styles.learnerCourseStatus}>
            {metrics.percent === 100 ? <><FaCheckCircle /> Completed</> : metrics.started ? 'In progress' : 'Ready to start'}
          </div>
        </div>

        <div className={styles.learnerCourseCardBody}>
          <div className={styles.learnerCourseCardHeading}>
            <span>My course</span>
            <h2>{course.title}</h2>
          </div>

          <div className={styles.learnerCourseProgressHeading}>
            <span>{metrics.completed} of {metrics.total} lessons</span>
            <strong>{metrics.percent}%</strong>
          </div>
          <div
            className={styles.learnerCourseProgressTrack}
            role="progressbar"
            aria-label={`${course.title} progress`}
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={metrics.percent}
          >
            <span style={{ width: `${metrics.percent}%` }} />
          </div>

          <div className={styles.learnerCourseCardMeta}>
            <span><FaBookOpen /> {course.modules.length} module{course.modules.length === 1 ? '' : 's'}</span>
            <span><FaClock /> {lastActivity ? `Last opened ${lastActivity}` : `Enrolled ${formatDate(course.enrolled_at)}`}</span>
          </div>
        </div>
      </div>

      {metrics.nextLesson ? (
        <Link className={styles.learnerCourseAction} href={`/courses/${course.slug}/player/${metrics.nextLesson.id}`}>
          <FaPlay /> {actionLabel}
        </Link>
      ) : (
        <Link className={styles.learnerCourseAction} href={`/courses/${course.slug}`}>
          <FaPlay /> View course
        </Link>
      )}
    </article>
  )
}

function CourseSwitcher({ courses, selectedCourseId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || courses[0]

  useEffect(() => {
    const closeFromOutside = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeFromKeyboard = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [])

  return (
    <div className={styles.learnerCourseDropdown} ref={menuRef}>
      <button
        type="button"
        className={styles.learnerCourseDropdownTrigger}
        onClick={() => setIsOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>
          <small>Viewing course</small>
          <strong>{selectedCourse.title}</strong>
        </span>
        <FaChevronDown className={isOpen ? styles.learnerCourseDropdownChevronOpen : ''} />
      </button>

      {isOpen && (
        <div className={styles.learnerCourseDropdownMenu} role="listbox" aria-label="Available course journeys">
          {courses.map((course) => {
            const metrics = getCourseMetrics(course)
            const isSelected = course.id === selectedCourse.id

            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                key={course.id}
                onClick={() => {
                  onSelect(course.id)
                  setIsOpen(false)
                }}
              >
                <span className={styles.learnerCourseDropdownIcon}>
                  {isSelected ? <FaCheck /> : <FaBookOpen />}
                </span>
                <span>
                  <strong>{course.title}</strong>
                  <small>{metrics.completed} of {metrics.total} lessons completed</small>
                </span>
                <b>{metrics.percent}%</b>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LessonRow({ lesson, number, isUnlocked }) {
  const progress = lesson.progress
  const isCompleted = Boolean(progress?.is_completed)
  const isStarted = Boolean(progress)
  const watched = isCompleted ? 100 : Number(progress?.watched_percent || 0)
  const startedAt = formatDate(progress?.started_at)
  const lastAccessed = formatDate(progress?.last_accessed_at, true)
  const completedAt = formatDate(progress?.completed_at)

  let statusLabel = 'Ready'
  let statusClass = styles.learnerLessonReady
  let dateLabel = 'Ready when you are'

  if (!isUnlocked) {
    statusLabel = 'Locked'
    statusClass = styles.learnerLessonLocked
    dateLabel = 'Complete the previous lesson to unlock'
  } else if (isCompleted) {
    statusLabel = 'Completed'
    statusClass = styles.learnerLessonCompleted
    dateLabel = completedAt ? `Completed ${completedAt}` : 'Completed'
  } else if (isStarted) {
    statusLabel = 'In progress'
    statusClass = styles.learnerLessonInProgress
    dateLabel = lastAccessed
      ? `Last opened ${lastAccessed}`
      : startedAt
        ? `Started ${startedAt}`
        : 'In progress'
  }

  const rowContent = (
    <>
      <span className={`${styles.learnerLessonNumber} ${statusClass}`}>
        {isCompleted ? <FaCheck /> : !isUnlocked ? <FaLock /> : number}
      </span>
      <span className={styles.learnerLessonIdentity}>
        <strong>{lesson.title}</strong>
        <small>
          {lesson.type === 'video' ? <FaPlayCircle /> : <FaClipboardList />}
          {lesson.type === 'video' ? 'Video lesson' : 'Assessment'}
        </small>
      </span>
      <span className={styles.learnerLessonActivity}>
        <strong className={statusClass}>{statusLabel}</strong>
        <small>{dateLabel}</small>
      </span>
      {lesson.type === 'video' && isStarted && !isCompleted ? (
        <span className={styles.learnerLessonWatchProgress}>
          <span><i style={{ width: `${watched}%` }} /></span>
          <strong>{watched}% watched</strong>
        </span>
      ) : (
        <span className={styles.learnerLessonOpen} aria-hidden="true">
          {isUnlocked ? <FaArrowRight /> : <FaLock />}
        </span>
      )}
    </>
  )

  if (!isUnlocked) {
    return <div className={`${styles.learnerLessonRow} ${styles.learnerLessonRowLocked}`}>{rowContent}</div>
  }

  return (
    <Link className={styles.learnerLessonRow} href={`/courses/${lesson.course_slug}/player/${lesson.id}`}>
      {rowContent}
    </Link>
  )
}

function CourseDetails({ course }) {
  const [openModuleId, setOpenModuleId] = useState(course.modules[0]?.id || null)
  const lessons = flattenModules(course.modules)
  const completedMap = useMemo(() => Object.fromEntries(
    lessons.map((lesson) => [lesson.id, Boolean(lesson.progress?.is_completed)])
  ), [lessons])
  const accessMap = useMemo(
    () => buildLessonAccessMap(course.modules, completedMap),
    [course.modules, completedMap]
  )

  const metrics = getCourseMetrics(course)

  return (
    <section className={styles.learnerCourseDetails}>
      <header className={styles.learnerCourseDetailsHeader}>
        <div>
          <span>Course journey</span>
          <h2>{course.title}</h2>
          <p>Open a module to review its lessons, status, and your latest progress.</p>
        </div>
        <div className={styles.learnerCourseDetailsProgress}>
          <strong>{metrics.percent}%</strong>
          <span>Course complete</span>
        </div>
      </header>

      <div className={styles.learnerModuleList}>
        {course.modules.map((module, moduleIndex) => {
          const moduleCompleted = module.lessons.filter((lesson) => lesson.progress?.is_completed).length
          const modulePercent = percentage(moduleCompleted, module.lessons.length)
          const isOpen = openModuleId === module.id
          const isModuleLocked = module.lessons.length > 0 && !accessMap[module.lessons[0].id]
          const panelId = `learner-module-${module.id}`
          const moduleStartNumber = course.modules
            .slice(0, moduleIndex)
            .reduce((total, item) => total + item.lessons.length, 0)

          return (
            <article className={styles.learnerModule} key={module.id}>
              <button
                type="button"
                className={styles.learnerModuleHeader}
                onClick={() => setOpenModuleId(isOpen ? null : module.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className={styles.learnerModuleIndex}>{String(moduleIndex + 1).padStart(2, '0')}</span>
                <span className={styles.learnerModuleHeading}>
                  <small>{isModuleLocked ? 'Locked module' : `Module ${moduleIndex + 1}`}</small>
                  <strong>{module.title}</strong>
                  {module.description && <p>{module.description}</p>}
                </span>
                <span className={styles.learnerModuleProgress}>
                  <span><i style={{ width: `${modulePercent}%` }} /></span>
                  <strong>{modulePercent}%</strong>
                  <small>{moduleCompleted}/{module.lessons.length} lessons</small>
                </span>
                <FaChevronDown className={`${styles.learnerModuleChevron} ${isOpen ? styles.learnerModuleChevronOpen : ''}`} />
              </button>

              <div id={panelId} className={`${styles.learnerModulePanel} ${isOpen ? styles.learnerModulePanelOpen : ''}`} aria-hidden={!isOpen}>
                <div className={styles.learnerModulePanelInner}>
                  <div className={styles.learnerLessonList}>
                    {module.lessons.map((lesson, lessonIndex) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={{ ...lesson, course_slug: course.slug }}
                        number={moduleStartNumber + lessonIndex + 1}
                        isUnlocked={Boolean(accessMap[lesson.id])}
                      />
                    ))}
                    {module.lessons.length === 0 && (
                      <p className={styles.learnerModuleEmpty}>Lessons will appear here when this module is ready.</p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function MyCoursesDashboard({ courses }) {
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || null)
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || courses[0] || null

  if (!courses.length) {
    return (
      <section className={styles.learnerCoursesEmpty}>
        <span><FaGraduationCap /></span>
        <h1>Your learning space is ready</h1>
        <p>When you enroll in a course, it will appear here with your lessons and progress.</p>
        <Link href="/courses">Discover courses <FaArrowRight /></Link>
      </section>
    )
  }

  return (
    <div className={styles.learnerCoursesDashboard}>
      <header className={styles.learnerCoursesIntro}>
        <div>
          <span>My learning</span>
          <h1>My Courses</h1>
          <p>Continue your work, revisit completed lessons, or see what comes next.</p>
        </div>
        <div className={styles.learnerCoursesSummary}>
          <strong>{courses.length}</strong>
          <span>enrolled course{courses.length === 1 ? '' : 's'}</span>
        </div>
      </header>

      <div className={styles.learnerCoursesGrid}>
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>

      {selectedCourse && (
        <div className={styles.learnerJourneyArea}>
          <div className={styles.learnerCourseSwitcher}>
            <div>
              <span>Course details</span>
              <strong>Choose a course journey</strong>
            </div>
            <CourseSwitcher
              courses={courses}
              selectedCourseId={selectedCourse.id}
              onSelect={setSelectedCourseId}
            />
          </div>
          <CourseDetails key={selectedCourse.id} course={selectedCourse} />
        </div>
      )}
    </div>
  )
}
