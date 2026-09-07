'use client'

import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance'
import styles from './assessment.module.css'

function calculateTotals(sections, answers) {
  return sections.map((section) => ({
    ...section,
    total: section.questionIds.reduce((sum, questionId) => sum + (answers[questionId] ?? 0), 0)
  }))
}

function formatScore(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace('.5', '½')
}

const workingStyleGuide = [
  {
    driver: 'Hurry Up',
    strengths: 'Gets a lot done quickly; copes with tight deadlines; can multitask.',
    overused: 'May rush, make mistakes, miss details, or appear impatient.',
    practice: 'Plan work in stages. Let others finish speaking. Build in pauses.'
  },
  {
    driver: 'Be Perfect',
    strengths: 'Organised, plans ahead, coordinates well, monitors progress.',
    overused: 'May over-detail, over-criticize, focus on appearance, or struggle to delegate.',
    practice: 'Set realistic standards. Ask what the real consequence of an imperfection is.'
  },
  {
    driver: 'Please',
    strengths: 'Supports teamwork, encourages harmony, shows genuine interest in others.',
    overused: 'May avoid conflict, take criticism personally, or guess instead of asking.',
    practice: 'Ask clearly for what you need. Check rather than assume. Practice respectful disagreement.'
  },
  {
    driver: 'Try Hard',
    strengths: 'Enthusiastic, willing to volunteer, thorough, curious.',
    overused: 'May lose focus, take on too much, or leave tasks unfinished.',
    practice: 'Set clear boundaries for the task. Make a plan and see it through.'
  },
  {
    driver: 'Be Strong',
    strengths: 'Calm under pressure, reliable, able to handle difficult decisions.',
    overused: 'May overload yourself, hide feelings, avoid help, or be hard to know.',
    practice: 'Monitor workload. Ask for help earlier. Make room for rest and enjoyment.'
  }
]

export default function DriverQuestionnaireEngine({
  definition,
  onComplete,
  embeddedInCoursePlayer = false,
  enableResultScreenshot = false,
  resultCaptureId = 'assessment-result-capture',
  resultDownloadFormat = 'png'
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const answersRef = useRef({})
  const [showResult, setShowResult] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance()

  const currentQuestion = definition.questions[currentIndex]
  const totalQuestions = definition.questions.length
  const progress = ((currentIndex + 1) / totalQuestions) * 100

  const handleSelect = (value) => {
    if (isSubmitting || isAdvancing) return

    const nextAnswers = { ...answersRef.current, [currentQuestion.id]: value }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)

    if (!embeddedInCoursePlayer) return

    advanceAfterFeedback(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((index) => index + 1)
        return
      }

      calculateResult(nextAnswers)
    })
  }

  const calculateResult = async (submittedAnswers = answersRef.current) => {
    const totals = calculateTotals(definition.sections, submittedAnswers)
    const score = totals.reduce((highest, section) => Math.max(highest, section.total), 0)

    setIsSubmitting(true)
    try {
      if (onComplete) {
        await onComplete({ score, answers: submittedAnswers })
      }
      setShowResult(true)
    } catch {
      toast.error('Your result could not be saved. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (answersRef.current[currentQuestion.id] === undefined) {
      toast.error('Please select an answer before continuing.')
      return
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
      return
    }

    calculateResult(answersRef.current)
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const handleRetake = () => {
    window.sessionStorage.setItem('assessment_retake_scroll_top', '1')
    window.location.reload()
  }

  if (showResult) {
    const totals = calculateTotals(definition.sections, answers)
    const driverTendencies = totals.filter((section) => section.total >= definition.scoring.tendencyThreshold)
    const predominant = totals.reduce((highest, section) => (
      section.total > highest.total ? section : highest
    ), totals[0])
    const otherActivePatterns = driverTendencies.filter((section) => section.id !== predominant.id)
    const getDriverDescription = (sectionId) => definition.characteristics.find((item) => (
      item.id === sectionId || (sectionId === 'please' && item.id === 'please_others')
    ))?.description || ''

    return (
      <div
        className={`${styles.driverResultContainer} ${embeddedInCoursePlayer ? styles.embeddedAssessmentResult : ''}`}
        id={enableResultScreenshot ? resultCaptureId : undefined}
      >
        <div className={styles.driverResultHeader}>
          <h2>Your Driver Profile</h2>
          <p>These totals show the internal drivers that may become more active for you under pressure. A score of 3 or more suggests a tendency toward that driver.</p>
        </div>

        <div className={styles.driverTotalsGrid}>
          {totals.map((section) => (
            <div
              key={section.id}
              className={`${styles.driverTotalCard} ${section.total >= definition.scoring.tendencyThreshold ? styles.driverTotalCardStrong : ''}`}
            >
              <h3>{section.label}</h3>
              <strong>{formatScore(section.total)}/5</strong>
              <div className={styles.driverScoreBar} aria-hidden="true">
                <span style={{ width: `${Math.min(100, Math.max(0, (section.total / 5) * 100))}%` }} />
              </div>
              {section.id === predominant.id && (
                <div className={styles.driverPredominantBadge}>Predominant</div>
              )}
            </div>
          ))}
        </div>

        <section className={styles.driverTendenciesSection}>
          <div className={styles.driverTendencyDetails}>
            <div className={styles.driverTendencyGroup}>
              <h3>Your predominant style</h3>
              <article className={styles.driverTendencyDetailCard}>
                <h4>{predominant.label}</h4>
                <p>{getDriverDescription(predominant.id)}</p>
              </article>
            </div>

            <div className={styles.driverTendencyGroup}>
              <h3>Other active patterns</h3>
              <article className={styles.driverTendencyDetailCard}>
                {otherActivePatterns.length > 0 ? (
                  <div className={styles.driverOtherPatterns}>
                    {otherActivePatterns.map((section) => (
                      <div key={section.id}>
                        <h4>{section.label}</h4>
                        <p>{getDriverDescription(section.id)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No other driver reached the active tendency threshold.</p>
                )}
              </article>
            </div>
          </div>
        </section>

        <section className={styles.driverGuideSection}>
          <h3>Working-style guide</h3>
          <p>Use this as a practical reflection guide. Every driver has useful strengths. The aim is not to remove a pattern, but to use it with more choice.</p>
          <div className={styles.driverGuideTableWrap}>
            <table className={styles.driverGuideTable}>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Strengths</th>
                  <th>When overused</th>
                  <th>Try this</th>
                </tr>
              </thead>
              <tbody>
                {workingStyleGuide.map((item) => (
                  <tr key={item.driver}>
                    <th scope="row">{item.driver}</th>
                    <td>{item.strengths}</td>
                    <td>{item.overused}</td>
                    <td>{item.practice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {enableResultScreenshot && (
          <ResultScreenshotButton targetId={resultCaptureId} fileName={definition.title} format={resultDownloadFormat} />
        )}

        <button className={styles.retakeBtn} onClick={handleRetake} data-screenshot-exclude="true">
          <FaRedo style={{ marginRight: '8px' }} />
          Retake Assessment
        </button>
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${embeddedInCoursePlayer ? styles.embeddedAssessmentContainer : ''} ${definition.externalOnly ? styles.externalQuestionContainer : ''}`}>
      <div className={styles.header}>
        <div className={styles.progressInfo}>
          <span className={styles.progressPercentage}>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%`, backgroundColor: 'var(--color-dark-blue)' }}
          ></div>
        </div>
      </div>

      <div key={`question-${currentQuestion.id}`} className={`${styles.questionSection} ${styles.questionTransition}`}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div key={`answers-${currentQuestion.id}`} className={`${styles.driverOptions} ${styles.questionTransition} ${styles.answerTransition}`}>
        {definition.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isSubmitting || isAdvancing}
          className={`${styles.driverOptionBtn} ${answers[currentQuestion.id] === option.value ? styles.driverOptionBtnSelected : ''}`}
          >
            <strong>{option.label}</strong>
            <span>{option.pointsLabel}</span>
          </button>
        ))}
      </div>

      <div className={styles.navigation}>
        <button
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={handlePrev}
          disabled={currentIndex === 0 || isSubmitting || isAdvancing}
        >
          <FaChevronLeft /> Previous
        </button>
        {!embeddedInCoursePlayer && (
          <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext} disabled={isSubmitting}>
            {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'} <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  )
}
