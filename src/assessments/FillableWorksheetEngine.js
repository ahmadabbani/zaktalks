'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { FaDownload, FaFilePdf, FaSave } from 'react-icons/fa'
import {
  getSpecificAssessmentSubmission,
  submitSpecificAssessment
} from '@/app/courses/specific-assessment.actions'
import styles from './assessment.module.css'

function buildInitialAnswers(definition, savedAnswers = null) {
  const answers = {}

  for (const section of definition.sections || []) {
    answers[section.id] = { oldStory: {}, newStory: {} }

    for (const field of getFields(section.oldStory)) {
      answers[section.id].oldStory[field.id] =
        savedAnswers?.[section.id]?.oldStory?.[field.id] || ''
    }

    for (const field of getFields(section.newStory)) {
      answers[section.id].newStory[field.id] =
        savedAnswers?.[section.id]?.newStory?.[field.id] || ''
    }
  }

  return answers
}

function getFields(lines = []) {
  return lines.flatMap(line => (line.parts || []).filter(part => typeof part === 'object' && part.id))
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

export default function FillableWorksheetEngine({ definition, lessonId }) {
  const [answers, setAnswers] = useState(() => buildInitialAnswers(definition))
  const [submission, setSubmission] = useState(null)
  const [isEditing, setIsEditing] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

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

  useEffect(() => {
    let mounted = true

    async function loadSavedSubmission() {
      const result = await getSpecificAssessmentSubmission({
        lessonId,
        assessmentKey: definition.id
      })

      if (!mounted) return

      if (result.success && result.submission) {
        setSubmission(result.submission)
        setAnswers(buildInitialAnswers(definition, result.submission.answers))
        setIsEditing(false)
      } else if (!result.success) {
        toast.error(result.error || 'Could not load saved worksheet.')
      }

      setIsLoading(false)
    }

    loadSavedSubmission()

    return () => {
      mounted = false
    }
  }, [definition, lessonId])

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

          return (
            <input
              key={part.id}
              value={answers[section.id][group][part.id]}
              onChange={(event) => updateAnswer(section.id, group, part.id, event.target.value)}
              disabled={!isEditing || isPending}
              required
            />
          )
        })}
      </div>
    )
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!isComplete(definition, answers)) {
      toast.error('Please complete every field before submitting.')
      return
    }

    startTransition(async () => {
      const result = await submitSpecificAssessment({
        lessonId,
        assessmentKey: definition.id,
        answers
      })

      if (result.success) {
        setSubmission(result.submission)
        setAnswers(buildInitialAnswers(definition, result.submission.answers))
        setIsEditing(false)
        toast.success('Worksheet saved. Your PDF is ready.')
      } else {
        toast.error(result.error || 'Could not save worksheet.')
      }
    })
  }

  const handleRetake = () => {
    setAnswers(buildInitialAnswers(definition))
    setSubmission(null)
    setIsEditing(true)
  }

  if (isLoading) {
    return (
      <div className={styles.worksheetShell}>
        <div className={styles.worksheetHeader}>
          <p className={styles.worksheetEyebrow}>Loading worksheet</p>
          <h2 className={styles.worksheetTitle}>{definition.title}</h2>
        </div>
      </div>
    )
  }

  return (
    <form className={styles.worksheetShell} onSubmit={handleSubmit}>
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

          {submission?.downloadUrl && !isEditing && (
            <a
              className={styles.worksheetDownloadBtn}
              href={submission.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <FaDownload /> Download Worksheet
            </a>
          )}
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

      <div className={styles.worksheetActions}>
        {isEditing ? (
          <button
            type="submit"
            className={styles.worksheetSubmitBtn}
            disabled={isPending}
          >
            <FaSave /> {isPending ? 'Saving...' : 'Save Worksheet'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className={styles.worksheetEditBtn}
              onClick={handleRetake}
            >
              Retake Worksheet
            </button>
            {submission?.downloadUrl && (
              <a
                className={styles.worksheetSubmitBtn}
                href={submission.downloadUrl}
                target="_blank"
                rel="noreferrer"
              >
                <FaFilePdf /> Download Worksheet
              </a>
            )}
          </>
        )}
      </div>
    </form>
  )
}
