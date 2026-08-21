'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowRight,
  FaBookOpen,
  FaCheck,
  FaChevronDown,
  FaClipboardCheck,
  FaClock,
  FaFilePdf,
  FaHistory,
  FaLock,
  FaRedo,
  FaTimes,
} from 'react-icons/fa'
import { getAssessmentById } from '@/assessments/registry'
import { getAssessmentResult } from '@/assessments/result-presentation'
import { buildLessonAccessMap } from '@/lib/course-progression'
import styles from './dashboard.module.css'

function number(value) {
  return Number(value || 0)
}

function formatDate(value, withTime = false) {
  if (!value) return 'Not completed yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function CoursePicker({ courses, value, onChange }) {
  const [open, setOpen] = useState(false)
  const picker = useRef(null)
  const selected = courses.find((course) => course.id === value) || courses[0]

  useEffect(() => {
    const close = (event) => {
      if (!picker.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
    }
  }, [])

  if (!selected) return null

  return <div className={styles.learnerAssessmentPicker} ref={picker}>
    <span>Choose a course</span>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
      <span><FaBookOpen /><strong>{selected.title}</strong></span>
      <FaChevronDown />
    </button>
    {open && <div className={styles.learnerAssessmentPickerMenu} role="listbox" aria-label="Courses">
      {courses.map((course) => <button
        type="button"
        role="option"
        aria-selected={course.id === selected.id}
        key={course.id}
        onClick={() => {
          onChange(course.id)
          setOpen(false)
        }}
      >
        <span><strong>{course.title}</strong><small>{course.completedCount} completed assessment{course.completedCount === 1 ? '' : 's'}</small></span>
        {course.id === selected.id && <FaCheck />}
      </button>)}
    </div>}
  </div>
}

function ResultBreakdown({ items = [] }) {
  if (!items.length) return null
  return <div className={styles.learnerResultBreakdown}>
    {items.map((item) => <div key={item.key || item.label}>
      <span>
        <strong>{item.label || item.key}</strong>
        {item.meaning && <small>{item.meaning}</small>}
      </span>
      <b>{number(item.score)} <small>/ {number(item.max)}</small></b>
    </div>)}
  </div>
}

function ResultGroup({ label, items = [], emphasis = false }) {
  return <article className={emphasis ? styles.learnerResultGroupPrimary : ''}>
    <small>{label}</small>
    <div>{items.length
      ? items.map((item) => <span key={item.key || item.label}>
        <strong>{item.label}</strong>
        <b>{number(item.score)} <small>/ {number(item.max)}</small></b>
      </span>)
      : <span><strong>No result in this range</strong></span>}
    </div>
  </article>
}

function AttemptResult({ attempt, assessmentKey }) {
  const result = getAssessmentResult(attempt, assessmentKey, { audience: 'learner' })

  return <div className={styles.learnerAttemptResult}>
    <header>
      <span>Your assessment result</span>
      <h3>{result.title}</h3>
      {result.subtitle && <p>{result.subtitle}</p>}
    </header>

    <ResultBreakdown items={result.breakdown} />

    {result.conclusion?.value && <section className={styles.learnerResultConclusion}>
      <span>{result.conclusion.label}</span>
      <strong>{result.conclusion.value}</strong>
      {result.conclusion.description && <p>{result.conclusion.description}</p>}
    </section>}

    {result.mode === 'points' && result.incorrectAnswers?.length > 0 && <details className={styles.learnerWrongAnswerReview}>
      <summary>
        <span><FaTimes /> Review wrong answers</span>
        <small>{result.incorrectAnswers.length} answer{result.incorrectAnswers.length === 1 ? '' : 's'} to revisit</small>
        <FaChevronDown />
      </summary>
      <div>
        {result.incorrectAnswers.map((item, index) => <article key={item.question_id || `${item.question}-${index}`}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <div>
            <p>{item.question}</p>
            <div>
              <span className={styles.learnerWrongAnswer}><FaTimes /> Your answer: <strong>{item.selected_answer}</strong></span>
              <span className={styles.learnerCorrectAnswer}><FaCheck /> Correct answer: <strong>{item.correct_answer}</strong></span>
            </div>
          </div>
        </article>)}
      </div>
    </details>}

    {result.mode === 'points' && result.reviewAvailable === false && <p className={styles.learnerReviewUnavailable}>
      The wrong-answer review was not saved for this earlier attempt. It will be available after your next retake.
    </p>}

    {result.notes?.length > 0 && <ul className={styles.learnerResultNotes}>
      {result.notes.map((note) => <li key={note}>{note}</li>)}
    </ul>}

    {result.mode === 'roles' && <section className={styles.learnerMeaningSection}>
      <header><span>What stands out</span><h4>Your role pattern</h4></header>
      <div className={styles.learnerResultGroups}>
        <ResultGroup label="My prominent role" items={result.primary} emphasis />
        <ResultGroup label="My secondary role" items={result.secondary} />
      </div>
    </section>}

    {result.mode === 'ranked' && <section className={styles.learnerMeaningSection}>
      <header><span>Your pattern</span><h4>How your needs compare</h4></header>
      <div className={styles.learnerResultGroups}>
        <ResultGroup label="My 3 highest totals" items={result.highest} emphasis />
        <ResultGroup label="My 3 lowest totals" items={result.lowest} />
      </div>
    </section>}

    {attempt?.score_details?.historical && <small className={styles.learnerHistoricalNote}>
      This result was completed before detailed breakdowns were saved, so only the original recorded result is available.
    </small>}
  </div>
}

function ScoredResult({ assessment }) {
  const [activeAttemptId, setActiveAttemptId] = useState(assessment.attempts[0]?.id)
  const activeAttempt = assessment.attempts.find((attempt) => attempt.id === activeAttemptId) || assessment.attempts[0]

  return <section className={styles.learnerAssessmentDetail}>
    <div className={styles.learnerAssessmentDetailHeader}>
      <div>
        <span>{assessment.moduleTitle}</span>
        <h2>{assessment.title}</h2>
        <p>Each attempt stays here, so you can revisit your result and notice what changes over time.</p>
      </div>
      <div className={styles.learnerAssessmentAttemptCount}>
        <FaRedo />
        <span><strong>{assessment.attempts.length}</strong><small>attempt{assessment.attempts.length === 1 ? '' : 's'}</small></span>
      </div>
    </div>

    <div className={styles.learnerAttemptHistory}>
      <div className={styles.learnerAttemptRail} aria-label="Result history">
        <span><FaHistory /> Result history</span>
        <div>
          {assessment.attempts.map((attempt, index) => <button
            type="button"
            key={attempt.id}
            className={attempt.id === activeAttempt?.id ? styles.learnerAttemptActive : ''}
            onClick={() => setActiveAttemptId(attempt.id)}
          >
            <span>Attempt {attempt.attempt_number}</span>
            <small>{formatDate(attempt.completed_at, true)}</small>
            {index === 0 && <b>Latest</b>}
          </button>)}
        </div>
      </div>
      <AttemptResult attempt={activeAttempt} assessmentKey={assessment.assessmentKey} />
    </div>
  </section>
}

function WorksheetResult({ assessment }) {
  return <section className={`${styles.learnerAssessmentDetail} ${styles.learnerWorksheetDetail}`}>
    <div className={styles.learnerAssessmentDetailHeader}>
      <div>
        <span>{assessment.moduleTitle}</span>
        <h2>{assessment.title}</h2>
        <p>This is a personal reflection worksheet, so it does not have a numeric score.</p>
      </div>
      <span className={styles.learnerWorksheetIcon}><FaFilePdf /></span>
    </div>
    <div className={styles.learnerWorksheetResult}>
      <span><FaCheck /></span>
      <div><small>Submitted</small><strong>{formatDate(assessment.submission.submitted_at, true)}</strong></div>
      {assessment.submission.generated_file_path
        ? <a href={`/api/dashboard/assessment-results/worksheet/${assessment.submission.id}`} target="_blank" rel="noreferrer">
          View my worksheet <FaArrowRight />
        </a>
        : <p>Your submission is saved, but its generated file is unavailable.</p>}
    </div>
  </section>
}

function AssessmentListCard({ assessment, selected, courseSlug, onSelect }) {
  const completed = assessment.attempts.length > 0 || Boolean(assessment.submission)
  const latest = assessment.attempts[0]
  const preview = latest ? getAssessmentResult(latest, assessment.assessmentKey, { audience: 'learner' }) : null
  const previewValue = preview?.conclusion?.value || preview?.title

  return <article className={`${styles.learnerAssessmentCard} ${selected ? styles.learnerAssessmentCardSelected : ''}`}>
    <div className={styles.learnerAssessmentCardIcon}>
      {assessment.isWorksheet ? <FaFilePdf /> : <FaClipboardCheck />}
    </div>
    <div className={styles.learnerAssessmentCardCopy}>
      <span>{assessment.moduleTitle}</span>
      <h3>{assessment.title}</h3>
      {completed
        ? <p>{previewValue || (assessment.isWorksheet ? 'Personal worksheet submitted' : 'Result saved')}</p>
        : <p>Your result will appear here after you complete this assessment.</p>}
      <small>
        {assessment.isUnlocked ? <FaClock /> : <FaLock />}
        {completed
          ? formatDate(latest?.completed_at || assessment.submission?.submitted_at)
          : assessment.isUnlocked
            ? 'Ready when you are'
            : 'Complete the previous lesson to unlock'}
      </small>
    </div>
    {completed
      ? <button type="button" onClick={onSelect} aria-pressed={selected}>
        {selected ? 'Viewing result' : 'View result'} <FaArrowRight />
      </button>
      : assessment.isUnlocked
        ? <Link href={`/courses/${courseSlug}/player/${assessment.lessonId}`}>
          Open in course <FaArrowRight />
        </Link>
        : <span className={styles.learnerAssessmentLockedAction} aria-label="Assessment locked">
          Locked <FaLock />
        </span>}
  </article>
}

export default function AssessmentResultsDashboard({ courses = [], attempts = [], worksheetSubmissions = [] }) {
  const courseResults = useMemo(() => {
    const attemptsByLesson = new Map()
    for (const attempt of attempts) {
      const current = attemptsByLesson.get(attempt.lesson_id) || []
      current.push(attempt)
      attemptsByLesson.set(attempt.lesson_id, current)
    }
    for (const history of attemptsByLesson.values()) {
      history.sort((left, right) => number(right.attempt_number) - number(left.attempt_number))
    }

    const submissionByLesson = new Map(worksheetSubmissions.map((submission) => [submission.lesson_id, submission]))

    return courses.map((course) => {
      const completedMap = Object.fromEntries(course.modules.flatMap((module) =>
        module.lessons.map((lesson) => [lesson.id, Boolean(lesson.progress?.is_completed)])))
      const accessMap = buildLessonAccessMap(course.modules, completedMap)
      const assessments = course.modules.flatMap((module) => module.lessons
        .filter((lesson) => lesson.type === 'assessment' || lesson.assessment_key)
        .map((lesson) => {
          const definition = getAssessmentById(lesson.assessment_key)
          const history = attemptsByLesson.get(lesson.id) || []
          const submission = submissionByLesson.get(lesson.id) || null
          return {
            lessonId: lesson.id,
            title: lesson.title,
            moduleTitle: module.title,
            moduleOrder: module.display_order,
            lessonOrder: lesson.display_order,
            assessmentKey: lesson.assessment_key || history[0]?.assessment_key || submission?.assessment_key,
            isWorksheet: definition?.type === 'fillable-worksheet' || Boolean(submission),
            isUnlocked: Boolean(accessMap[lesson.id]),
            attempts: history,
            submission,
          }
        }))
        .sort((left, right) => left.moduleOrder - right.moduleOrder || left.lessonOrder - right.lessonOrder)

      return {
        ...course,
        assessments,
        completedCount: assessments.filter((assessment) => assessment.attempts.length || assessment.submission).length,
        attemptCount: assessments.reduce((sum, assessment) => sum + assessment.attempts.length, 0),
      }
    }).filter((course) => course.assessments.length > 0)
  }, [attempts, courses, worksheetSubmissions])

  const firstCourse = courseResults.find((course) => course.completedCount > 0) || courseResults[0]
  const [selectedCourseId, setSelectedCourseId] = useState(firstCourse?.id || '')
  const selectedCourse = courseResults.find((course) => course.id === selectedCourseId) || firstCourse
  const firstCompletedAssessment = selectedCourse?.assessments.find((assessment) => assessment.attempts.length || assessment.submission)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(firstCompletedAssessment?.lessonId || '')
  const selectedAssessment = selectedCourse?.assessments.find((assessment) => assessment.lessonId === selectedAssessmentId)
    || firstCompletedAssessment

  function selectCourse(courseId) {
    const nextCourse = courseResults.find((course) => course.id === courseId)
    const nextAssessment = nextCourse?.assessments.find((assessment) => assessment.attempts.length || assessment.submission)
    setSelectedCourseId(courseId)
    setSelectedAssessmentId(nextAssessment?.lessonId || '')
  }

  const completedTotal = courseResults.reduce((sum, course) => sum + course.completedCount, 0)
  const attemptTotal = courseResults.reduce((sum, course) => sum + course.attemptCount, 0)

  if (!courseResults.length) {
    return <section className={styles.learnerAssessmentsDashboard}>
      <header className={styles.learnerAssessmentsIntro}>
        <div>
          <span>Assessment results</span>
          <h1>Your results will live here</h1>
          <p>When you complete an assessment inside a course, its full result and every future retake will be saved here for you.</p>
        </div>
      </header>
      <div className={styles.learnerAssessmentsEmpty}><FaClipboardCheck /><h2>No course assessments yet</h2><p>Your enrolled courses do not include an assessment at the moment.</p></div>
    </section>
  }

  return <section className={styles.learnerAssessmentsDashboard}>
    <header className={styles.learnerAssessmentsIntro}>
      <div>
        <span>Assessment results</span>
        <h1>A clearer view of what you discovered</h1>
        <p>Explore your results by course, revisit the complete meaning behind each score, and compare every retake in one place.</p>
      </div>
      <div className={styles.learnerAssessmentSummary}>
        <span><strong>{completedTotal}</strong><small>completed</small></span>
        <i />
        <span><strong>{attemptTotal}</strong><small>scored attempts</small></span>
      </div>
    </header>

    <CoursePicker courses={courseResults} value={selectedCourse?.id} onChange={selectCourse} />

    <div className={styles.learnerAssessmentCourseHeader}>
      <div><span>Inside this course</span><h2>{selectedCourse.title}</h2></div>
      <p>{selectedCourse.completedCount} of {selectedCourse.assessments.length} assessment{selectedCourse.assessments.length === 1 ? '' : 's'} completed</p>
    </div>

    <div className={styles.learnerAssessmentCards}>
      {selectedCourse.assessments.map((assessment) => <AssessmentListCard
        key={assessment.lessonId}
        assessment={assessment}
        courseSlug={selectedCourse.slug}
        selected={assessment.lessonId === selectedAssessment?.lessonId}
        onSelect={() => setSelectedAssessmentId(assessment.lessonId)}
      />)}
    </div>

    {selectedAssessment && (selectedAssessment.isWorksheet
      ? <WorksheetResult key={selectedAssessment.lessonId} assessment={selectedAssessment} />
      : <ScoredResult key={selectedAssessment.lessonId} assessment={selectedAssessment} />)}

    {!selectedAssessment && <div className={styles.learnerAssessmentsEmpty}>
      <FaClipboardCheck />
      <h2>No results in this course yet</h2>
      <p>Complete an assessment in the course and its full result will appear here.</p>
    </div>}
  </section>
}
