'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import styles from './assessment.module.css'

function findResult(thresholds, score) {
  return thresholds.find((threshold) => score >= threshold.min && score <= threshold.max)
}

export default function BinaryScoredEngine({
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

  const handleSelect = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value })
  }

  const calculateScore = () => {
    return definition.questions.reduce((total, question) => {
      return total + (answers[question.id] === question.scoreWhen ? 1 : 0)
    }, 0)
  }

  const handleNext = () => {
    if (answers[currentQuestion.id] === undefined) {
      toast.error('Please select an answer before continuing.')
      return
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
      return
    }

    const score = calculateScore()
    const result = findResult(definition.scoring.thresholds, score)

    setShowResult(true)
    if (onComplete) {
      onComplete({ score, label: result?.label, answers })
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
    const score = calculateScore()
    const result = findResult(definition.scoring.thresholds, score)

    return (
      <div
        className={styles.binaryResultContainer}
        id={enableResultScreenshot ? resultCaptureId : undefined}
      >
        <p className={styles.binaryResultEyebrow}>Your Result</p>
        <h2 className={styles.binaryResultTitle}>{result?.label}</h2>

        <div className={styles.binaryScoreCard}>
          <span>{score}</span>
          <small>/ {totalQuestions}</small>
        </div>

        <div className={styles.binaryResultRange}>{result?.rangeLabel}</div>

        {result?.category && (
          <h3 className={styles.binaryResultCategory}>{result.category}</h3>
        )}

        {Array.isArray(result?.points) && (
          <ul className={styles.binaryResultList}>
            {result.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        )}

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

      <div className={styles.binaryOptions}>
        {definition.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`${styles.binaryOptionBtn} ${answers[currentQuestion.id] === option.value ? styles.binaryOptionBtnSelected : ''}`}
          >
            {option.label}
          </button>
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
