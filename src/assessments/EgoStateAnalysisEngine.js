'use client'

import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance'
import styles from './assessment.module.css'

const BEST_SCORE = 2
const NEXT_SCORE = 1
const MAX_SCORE = 20

function calculateTotals(definition, answers) {
  const totals = Object.fromEntries(definition.egoStates.map((state) => [state.id, 0]))

  for (const question of definition.questions) {
    const answer = answers[question.id]
    if (!answer) continue

    const bestState = question.scoreMap[answer.best]
    const nextState = question.scoreMap[answer.next]

    if (bestState) totals[bestState] += BEST_SCORE
    if (nextState) totals[nextState] += NEXT_SCORE
  }

  return totals
}

export default function EgoStateAnalysisEngine({
  definition,
  onComplete,
  enableResultScreenshot = false,
  resultCaptureId = 'assessment-result-capture'
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const answersRef = useRef({})
  const [showResult, setShowResult] = useState(false)
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance()

  const currentQuestion = definition.questions[currentIndex]
  const totalQuestions = definition.questions.length
  const progress = ((currentIndex + 1) / totalQuestions) * 100
  const currentAnswer = answers[currentQuestion.id] || {}

  const updateChoice = (optionId, rank) => {
    if (isAdvancing) return

    const previous = answersRef.current[currentQuestion.id] || {}
    const nextAnswer = { ...previous }

    if (rank === 'best') {
      nextAnswer.best = optionId
      if (nextAnswer.next === optionId) nextAnswer.next = undefined
    } else {
      nextAnswer.next = optionId
      if (nextAnswer.best === optionId) nextAnswer.best = undefined
    }

    const nextAnswers = {
      ...answersRef.current,
      [currentQuestion.id]: nextAnswer
    }
    answersRef.current = nextAnswers
    setAnswers(nextAnswers)

    if (definition.externalOnly && nextAnswer.best && nextAnswer.next) {
      advanceAfterFeedback(() => advanceOrFinish(nextAnswers))
    }
  }

  const advanceOrFinish = (submittedAnswers) => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((index) => index + 1)
      return
    }

    const totals = calculateTotals(definition, submittedAnswers)
    const score = Math.max(...Object.values(totals))

    setShowResult(true)
    if (onComplete) {
      onComplete({ score, answers: submittedAnswers })
    }
  }

  const handleNext = () => {
    const answer = answersRef.current[currentQuestion.id]
    if (!answer?.best || !answer?.next) {
      toast.error('Please choose one BEST choice and one NEXT BEST choice.')
      return
    }

    advanceOrFinish(answersRef.current)
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
    const totals = calculateTotals(definition, answers)
    const highestScore = Math.max(...Object.values(totals))

    return (
      <div
        className={styles.egoResultContainer}
        id={enableResultScreenshot ? resultCaptureId : undefined}
      >
        <header className={styles.egoAnalysisResultHero}>
          <h2>My Ego Gram</h2>
          <p>This profile shows the relative strength of the seven ego states reflected in your choices.</p>
        </header>

        <section className={styles.egoAnalysisChartSection}>
          <h3>Your ego-state profile</h3>
          <p>Each filled bar represents your total score for that ego state.</p>
          <div className={styles.egoChart}>
            {definition.egoStates.map((state) => {
              const score = totals[state.id] || 0
              const height = Math.max(0, Math.min(100, (score / MAX_SCORE) * 100))
              const isStrongest = score === highestScore

              return (
                <div key={state.id} className={styles.egoChartColumn}>
                  <div className={styles.egoBarFrame}>
                    <div
                      className={`${styles.egoBarFill} ${isStrongest ? styles.egoBarFillStrongest : ''}`}
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <strong>{score}<small>/{MAX_SCORE}</small></strong>
                  <span>{state.id}</span>
                </div>
              )
            })}
          </div>
        </section>

        <div className={styles.egoTotalsGrid}>
          {definition.egoStates.map((state) => {
            const score = totals[state.id] || 0
            const isStrongest = score === highestScore
            return (
              <div key={state.id} className={`${styles.egoTotalCard} ${isStrongest ? styles.egoTotalCardStrongest : ''}`}>
                <span>{state.id}</span>
                <strong>{score}<small>/{MAX_SCORE}</small></strong>
              </div>
            )
          })}
        </div>

        <div className={styles.egoStateDetails}>
          {definition.egoStates.map((state) => (
            <details key={state.id} className={styles.egoStateDetail}>
              <summary>
                <span>{state.id}</span>
                {state.label}
              </summary>
              <p>{state.label}</p>
            </details>
          ))}
        </div>

        {enableResultScreenshot && (
          <ResultScreenshotButton targetId={resultCaptureId} fileName={definition.title} />
        )}

        <button className={styles.retakeBtn} onClick={handleRetake} data-screenshot-exclude="true">
          <FaRedo style={{ marginRight: '8px' }} />
          Retake Assessment
        </button>
      </div>
    )
  }

  return (
    <div className={`${styles.container} ${definition.externalOnly ? styles.externalQuestionContainer : ''}`}>
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

      <div className={styles.egoChoiceLegend}>
        <span>BEST choice = 2</span>
        <span>NEXT BEST choice = 1</span>
      </div>

      <div key={`answers-${currentQuestion.id}`} className={`${styles.egoOptions} ${styles.questionTransition} ${styles.answerTransition}`}>
        {currentQuestion.options.map((option) => (
          <div key={option.id} className={styles.egoOptionCard}>
            <p>
              <strong>{option.id}.</strong> {option.text}
            </p>
            <div className={styles.egoOptionActions}>
              <button
                type="button"
                onClick={() => updateChoice(option.id, 'best')}
                disabled={isAdvancing}
                className={currentAnswer.best === option.id ? styles.egoRankBtnSelected : styles.egoRankBtn}
              >
                BEST
              </button>
              <button
                type="button"
                onClick={() => updateChoice(option.id, 'next')}
                disabled={isAdvancing}
                className={currentAnswer.next === option.id ? styles.egoRankBtnSelected : styles.egoRankBtn}
              >
                NEXT BEST
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.navigation}>
        <button
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={handlePrev}
          disabled={currentIndex === 0 || isAdvancing}
        >
          <FaChevronLeft /> Previous
        </button>
        {!definition.externalOnly && (
          <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext}>
            {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'} <FaChevronRight />
          </button>
        )}
      </div>
    </div>
  )
}
