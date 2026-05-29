'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
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

export default function DriverQuestionnaireEngine({
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

  const handleNext = () => {
    if (answers[currentQuestion.id] === undefined) {
      toast.error('Please select an answer before continuing.')
      return
    }

    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1)
      return
    }

    const totals = calculateTotals(definition.sections, answers)
    const score = totals.reduce((highest, section) => Math.max(highest, section.total), 0)

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
    const totals = calculateTotals(definition.sections, answers)
    const driverTendencies = totals.filter((section) => section.total >= definition.scoring.tendencyThreshold)

    return (
      <div
        className={styles.driverResultContainer}
        id={enableResultScreenshot ? resultCaptureId : undefined}
      >
        <h2 className={styles.driverResultTitle}>{definition.title}</h2>

        <div className={styles.driverScoringNote}>{definition.scoring.instructions}</div>

        <div className={styles.driverTendenciesCard}>
          <h3>Your driver tendencies</h3>
          {driverTendencies.length > 0 ? (
            <ul>
              {driverTendencies.map((section) => (
                <li key={section.id}>
                  <span>{section.label}</span>
                  <strong>{formatScore(section.total)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No section reached a score of 3 or more.</p>
          )}
        </div>

        <div className={styles.driverTotalsGrid}>
          {totals.map((section) => (
            <div
              key={section.id}
              className={`${styles.driverTotalCard} ${section.total >= definition.scoring.tendencyThreshold ? styles.driverTotalCardStrong : ''}`}
            >
              <span>{section.rangeLabel}</span>
              <h3>{section.label}</h3>
              <strong>{formatScore(section.total)}</strong>
            </div>
          ))}
        </div>

        <div className={styles.driverExerciseCard}>
          <h3>Working styles exercise</h3>
          <p>Using the list below:</p>
          <ul>
            <li>Which is your predominant working style?</li>
            <li>Is there more than one?</li>
          </ul>
        </div>

        <h3 className={styles.driverCharacteristicsTitle}>Driver Characteristics</h3>
        <div className={styles.driverCharacteristicsList}>
          {definition.characteristics.map((item) => (
            <details key={item.id} className={styles.driverCharacteristic}>
              <summary>{item.title}</summary>
              <p>{item.description}</p>
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

      <div className={styles.driverOptions}>
        {definition.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`${styles.driverOptionBtn} ${answers[currentQuestion.id] === option.value ? styles.driverOptionBtnSelected : ''}`}
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
