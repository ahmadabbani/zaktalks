'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
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
  const [showResult, setShowResult] = useState(false)

  const currentQuestion = definition.questions[currentIndex]
  const totalQuestions = definition.questions.length
  const progress = ((currentIndex + 1) / totalQuestions) * 100
  const currentAnswer = answers[currentQuestion.id] || {}

  const updateChoice = (optionId, rank) => {
    setAnswers((current) => {
      const previous = current[currentQuestion.id] || {}
      const nextAnswer = { ...previous }

      if (rank === 'best') {
        nextAnswer.best = optionId
        if (nextAnswer.next === optionId) nextAnswer.next = undefined
      } else {
        nextAnswer.next = optionId
        if (nextAnswer.best === optionId) nextAnswer.best = undefined
      }

      return {
        ...current,
        [currentQuestion.id]: nextAnswer
      }
    })
  }

  const handleNext = () => {
    const answer = answers[currentQuestion.id]
    if (!answer?.best || !answer?.next) {
      toast.error('Please choose one BEST choice and one NEXT BEST choice.')
      return
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
      return
    }

    const totals = calculateTotals(definition, answers)
    const score = Math.max(...Object.values(totals))

    setShowResult(true)
    if (onComplete) {
      onComplete({ score, answers })
    }
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

    return (
      <div
        className={styles.egoResultContainer}
        id={enableResultScreenshot ? resultCaptureId : undefined}
      >
        <h2 className={styles.egoResultTitle}>MY EGO GRAM</h2>

        <div className={styles.egoChart}>
          {definition.egoStates.map((state) => {
            const score = totals[state.id] || 0
            const height = Math.max(0, Math.min(100, (score / MAX_SCORE) * 100))

            return (
              <div key={state.id} className={styles.egoChartColumn}>
                <div className={styles.egoBarFrame}>
                  <div
                    className={styles.egoBarFill}
                    style={{
                      height: `${height}%`,
                      backgroundColor: state.color
                    }}
                  ></div>
                </div>
                <strong>{score}</strong>
                <span>{state.id}</span>
              </div>
            )
          })}
        </div>

        <div className={styles.egoTotalsGrid}>
          {definition.egoStates.map((state) => (
            <div key={state.id} className={styles.egoTotalCard}>
              <span style={{ backgroundColor: state.color }}>{state.id}</span>
              <strong>{totals[state.id] || 0}</strong>
            </div>
          ))}
        </div>

        <div className={styles.egoStateDetails}>
          {definition.egoStates.map((state) => (
            <details key={state.id} className={styles.egoStateDetail}>
              <summary>
                <span style={{ backgroundColor: state.color }}>{state.id}</span>
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
          <span className={styles.questionCount}>Question {currentIndex + 1} of {totalQuestions}</span>
          <span className={styles.progressPercentage}>{Math.round(progress)}%</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%`, backgroundColor: definition.themeColor || 'var(--color-yellow)' }}
          ></div>
        </div>
      </div>

      <div className={styles.questionSection}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div className={styles.egoChoiceLegend}>
        <span>BEST choice = 2</span>
        <span>NEXT BEST choice = 1</span>
      </div>

      <div className={styles.egoOptions}>
        {currentQuestion.options.map((option) => (
          <div key={option.id} className={styles.egoOptionCard}>
            <p>
              <strong>{option.id}.</strong> {option.text}
            </p>
            <div className={styles.egoOptionActions}>
              <button
                type="button"
                onClick={() => updateChoice(option.id, 'best')}
                className={currentAnswer.best === option.id ? styles.egoRankBtnSelected : styles.egoRankBtn}
              >
                BEST
              </button>
              <button
                type="button"
                onClick={() => updateChoice(option.id, 'next')}
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
          disabled={currentIndex === 0}
        >
          <FaChevronLeft /> Previous
        </button>
        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext}>
          {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'} <FaChevronRight />
        </button>
      </div>
    </div>
  )
}
