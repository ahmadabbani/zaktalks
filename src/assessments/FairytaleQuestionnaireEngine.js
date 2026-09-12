'use client'

import { useRef, useState } from 'react'
import { FaArrowLeft, FaArrowRight, FaCheck } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import styles from './fairytale-questionnaire.module.css'

function fieldsFor(question) {
  return question.fields || [{ id: 'answer', label: 'Your answer' }]
}

export default function FairytaleQuestionnaireEngine({ definition, resultCaptureId }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [isFinished, setIsFinished] = useState(false)
  const [error, setError] = useState('')
  const topRef = useRef(null)
  const question = definition.questions[currentIndex]
  const total = definition.questions.length

  const moveTo = (index) => {
    setError('')
    setCurrentIndex(index)
    window.requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const updateAnswer = (fieldId, value) => {
    setAnswers((current) => ({
      ...current,
      [question.id]: { ...current[question.id], [fieldId]: value }
    }))
    if (error) setError('')
  }

  const handleNext = (event) => {
    event.preventDefault()
    const missingField = fieldsFor(question).find((field) => !answers[question.id]?.[field.id]?.trim())

    if (missingField) {
      setError(question.fields
        ? `Please complete ${missingField.label.replace(/:$/, '')} before continuing.`
        : 'Please write your answer before continuing.')
      return
    }

    if (currentIndex < total - 1) {
      moveTo(currentIndex + 1)
      return
    }

    setError('')
    setIsFinished(true)
    window.requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  if (isFinished) {
    return (
      <div className={styles.root} ref={topRef}>
        <div id={resultCaptureId} className={styles.result}>
          <header className={styles.resultHero}>
            <span className={styles.resultEyebrow}>Fairytale Questionnaire</span>
            <h2>{definition.resultTitle}</h2>
            <p>{definition.resultDescription}</p>
          </header>

          <div className={styles.resultList}>
            {definition.questions.map((item, index) => (
              <section key={item.id} className={styles.resultItem}>
                <div className={styles.resultQuestion}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{item.text}</h3>
                </div>
                <div className={styles.resultAnswers}>
                  {fieldsFor(item).map((field) => (
                    <div key={field.id}>
                      {item.fields && <h4>{field.label}</h4>}
                      <p>{answers[item.id][field.id].trim()}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className={styles.downloadActions}>
          <p>Download your answers before leaving this page. They are not saved to an account.</p>
          <ResultScreenshotButton
            targetId={resultCaptureId}
            fileName={definition.title}
            label="Download your answers (PDF)"
            format="pdf"
            className={styles.downloadButton}
          />
        </div>
      </div>
    )
  }

  return (
    <form className={styles.root} onSubmit={handleNext} noValidate ref={topRef}>
      <div className={styles.progressHeader}>
        <span>Question {currentIndex + 1} of {total}</span>
        <span>{currentIndex + 1}/{total}</span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Question progress"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={currentIndex + 1}
      >
        <div style={{ width: `${((currentIndex + 1) / total) * 100}%` }} />
      </div>

      <section className={styles.questionPanel} key={question.id}>
        <span className={styles.questionEyebrow}>Your story</span>
        <h2>{question.text}</h2>
        <p className={styles.example}>{question.example}</p>

        <div className={styles.answerFields}>
          {fieldsFor(question).map((field) => (
            <label key={field.id}>
              <span>{field.label}</span>
              <textarea
                value={answers[question.id]?.[field.id] || ''}
                onChange={(event) => updateAnswer(field.id, event.target.value)}
                rows={question.fields ? 5 : 7}
                placeholder="Write in your own words..."
                aria-invalid={Boolean(error && !answers[question.id]?.[field.id]?.trim())}
                aria-describedby={error ? 'fairytale-answer-error' : undefined}
              />
            </label>
          ))}
        </div>
        {error && <p id="fairytale-answer-error" className={styles.error} role="alert">{error}</p>}
      </section>

      <div className={styles.actions}>
        {currentIndex > 0 && (
          <button type="button" className={styles.backButton} onClick={() => moveTo(currentIndex - 1)}>
            <FaArrowLeft aria-hidden="true" /> Back
          </button>
        )}
        <button type="submit" className={styles.nextButton}>
          {currentIndex === total - 1 ? <><FaCheck aria-hidden="true" /> See my answers</> : <>Next question <FaArrowRight aria-hidden="true" /></>}
        </button>
      </div>
    </form>
  )
}
