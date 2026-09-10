'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance'
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
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance()

  const currentQuestion = definition.questions[currentIndex]
  const totalQuestions = definition.questions.length
  const progress = ((currentIndex + 1) / totalQuestions) * 100

  const handleSelect = (value) => {
    if (isAdvancing) return

    const nextAnswers = { ...answers, [currentQuestion.id]: value }
    setAnswers(nextAnswers)

    if (definition.externalOnly) {
      advanceAfterFeedback(() => advanceOrFinish(nextAnswers))
    }
  }

  const calculateScore = (submittedAnswers = answers) => {
    return definition.questions.reduce((total, question) => {
      return total + (submittedAnswers[question.id] === question.scoreWhen ? 1 : 0)
    }, 0)
  }

  const advanceOrFinish = (submittedAnswers) => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((index) => index + 1)
      return
    }

    const score = calculateScore(submittedAnswers)
    const result = findResult(definition.scoring.thresholds, score)

    setShowResult(true)
    if (onComplete) {
      onComplete({ score, label: result?.label, answers: submittedAnswers })
    }
  }

  const handleNext = () => {
    if (answers[currentQuestion.id] === undefined) {
      toast.error('Please select an answer before continuing.')
      return
    }

    advanceOrFinish(answers)
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
        <header className={styles.binaryResultHero}>
          <h2>Your Codependency Awareness Profile</h2>
          <p>Your score reflects patterns related to boundaries, self-care, emotional honesty, and how responsibility is shared in relationships. It is a reflection tool, not a diagnosis. Use it to notice where more support, choice, or balance may be helpful.</p>
        </header>

        <section className={styles.binaryResultOverview}>
          <div className={styles.binaryResultScorePanel}>
            <span className={styles.binaryResultScoreLabel}>Your score</span>
            <strong>{score}<small>/{totalQuestions}</small></strong>
            <div
              className={styles.binaryResultScoreTrack}
              role="img"
              aria-label={`Score: ${score} out of ${totalQuestions}`}
            >
              <span style={{ width: `${(score / totalQuestions) * 100}%` }} />
            </div>
            <div className={styles.binaryResultRange}>{result?.rangeLabel}</div>
          </div>

          <div className={styles.binaryResultMeaning}>
            <span>Your result</span>
            {result?.category && <h3>{result.category}</h3>}
            <p>{result?.label}</p>
          </div>
        </section>

        {Array.isArray(result?.points) && (
          <section className={styles.binaryResultInsights}>
            <h3>What your result may be showing</h3>
            <ul className={styles.binaryResultList}>
              {result.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </section>
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

      <div key={`answers-${currentQuestion.id}`} className={`${styles.binaryOptions} ${styles.questionTransition} ${styles.answerTransition}`}>
        {definition.options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleSelect(option.value)}
            disabled={isAdvancing}
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
