'use client'

import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { FaCheck, FaRedo } from 'react-icons/fa'
import ResultScreenshotButton from '@/components/ResultScreenshotButton'
import styles from './assessment.module.css'

function getFields(lines = []) {
  return lines.flatMap(line => (line.parts || []).filter(part => typeof part === 'object' && part.id))
}

function buildInitialAnswers(definition) {
  const answers = {}

  for (const section of definition.sections || []) {
    answers[section.id] = { oldStory: {}, newStory: {} }

    for (const field of getFields(section.oldStory)) {
      answers[section.id].oldStory[field.id] = ''
    }

    for (const field of getFields(section.newStory)) {
      answers[section.id].newStory[field.id] = ''
    }
  }

  return answers
}

function isComplete(definition, answers) {
  return (definition.sections || []).every(section => {
    const oldComplete = getFields(section.oldStory).every(field =>
      answers?.[section.id]?.oldStory?.[field.id]?.trim()
    )
    const newComplete = getFields(section.newStory).every(field =>
      answers?.[section.id]?.newStory?.[field.id]?.trim()
    )

    return oldComplete && newComplete
  })
}

export default function ExternalFillableWorksheetEngine({
  definition,
  enableResultScreenshot = false,
  resultCaptureId = 'assessment-result-capture'
}) {
  const [answers, setAnswers] = useState(() => buildInitialAnswers(definition))
  const [isFinished, setIsFinished] = useState(false)

  const completedFields = useMemo(() => {
    let complete = 0
    let total = 0

    for (const section of definition.sections || []) {
      for (const [group, lines] of [['oldStory', section.oldStory], ['newStory', section.newStory]]) {
        for (const field of getFields(lines)) {
          total += 1
          if (answers?.[section.id]?.[group]?.[field.id]?.trim()) complete += 1
        }
      }
    }

    return { complete, total, percentage: total ? Math.round((complete / total) * 100) : 0 }
  }, [answers, definition])

  const updateAnswer = (sectionId, group, fieldId, value) => {
    setAnswers(current => ({
      ...current,
      [sectionId]: {
        ...current[sectionId],
        [group]: {
          ...current[sectionId][group],
          [fieldId]: value
        }
      }
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!isComplete(definition, answers)) {
      toast.error('Please complete every field before continuing.')
      return
    }

    setIsFinished(true)
    window.requestAnimationFrame(() => {
      document.getElementById(resultCaptureId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleRetake = () => {
    setAnswers(buildInitialAnswers(definition))
    setIsFinished(false)
  }

  const renderLine = (section, group, line) => {
    if (line.text) {
      return <p className={styles.worksheetProvidedText}>{line.text}</p>
    }

    return (
      <div className={styles.worksheetLine}>
        {(line.parts || []).map((part, index) => {
          if (typeof part === 'string') {
            return <span key={`${part}-${index}`}>{part}</span>
          }

          const value = answers[section.id][group][part.id]

          if (isFinished) {
            return (
              <span key={part.id} className={styles.worksheetAnswerText}>
                {value}
              </span>
            )
          }

          return (
            <input
              key={part.id}
              value={value}
              onChange={(event) => updateAnswer(section.id, group, part.id, event.target.value)}
              required
            />
          )
        })}
      </div>
    )
  }

  return (
    <form
      className={`${styles.worksheetShell} ${styles.externalWorksheetShell}`}
      onSubmit={handleSubmit}
      id={isFinished && enableResultScreenshot ? resultCaptureId : undefined}
    >
      <div className={styles.worksheetHeader}>
        <p className={styles.worksheetEyebrow}>Worksheet</p>
        <h2 className={styles.worksheetTitle}>{definition.title}</h2>
        <p className={styles.worksheetIntro}>{definition.intro}</p>

        <div className={styles.worksheetToolbar}>
          <div className={styles.worksheetProgress}>
            <span>{completedFields.percentage}% complete</span>
            <div className={styles.worksheetProgressTrack}>
              <div
                className={styles.worksheetProgressFill}
                style={{ width: `${completedFields.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={styles.worksheetSections}>
        {(definition.sections || []).map(section => (
          <section key={section.id} className={styles.worksheetSection}>
            <div className={styles.worksheetSectionHeader}>
              <h3>{section.title}</h3>
            </div>

            <div className={styles.worksheetStoryGrid}>
              <div className={styles.worksheetStoryBlock}>
                <h4>Old Story</h4>
                {(section.oldStory || []).map((line, index) => (
                  <div key={index} className={styles.worksheetField}>
                    {renderLine(section, 'oldStory', line)}
                  </div>
                ))}
              </div>

              <div className={`${styles.worksheetStoryBlock} ${styles.worksheetNewStoryBlock}`}>
                <h4>New Story</h4>
                {(section.newStory || []).map((line, index) => (
                  <div key={index} className={styles.worksheetField}>
                    {renderLine(section, 'newStory', line)}
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className={styles.worksheetActions} data-screenshot-exclude="true">
        {isFinished ? (
          <>
            {enableResultScreenshot && (
              <ResultScreenshotButton
                targetId={resultCaptureId}
                fileName={definition.title}
                label="Download Worksheet Screenshot"
              />
            )}
            <button type="button" className={styles.worksheetEditBtn} onClick={handleRetake}>
              <FaRedo /> Retake Worksheet
            </button>
          </>
        ) : (
          <button type="submit" className={styles.worksheetSubmitBtn}>
            <FaCheck /> Finish Worksheet
          </button>
        )}
      </div>
    </form>
  )
}
