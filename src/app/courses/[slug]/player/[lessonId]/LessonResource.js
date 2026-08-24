'use client'

import { useEffect, useState } from 'react'
import { FaDownload, FaExternalLinkAlt, FaFileAlt, FaFilePdf, FaLink } from 'react-icons/fa'
import {
  getCompletedLessonResource,
  getCompletedLessonResourceDownloadUrl
} from '@/app/courses/resource.actions'
import { useCourseProgress } from '../CourseProgressContext'
import styles from './lesson-player.module.css'

const RESOURCE_DETAILS = {
  text: { label: 'Lesson note', icon: FaFileAlt },
  pdf: { label: 'Lesson PDF', icon: FaFilePdf },
  link: { label: 'Lesson link', icon: FaLink }
}

export default function LessonResource({ lessonId, initialResource = null, initiallyCompleted = false }) {
  const { completedMap } = useCourseProgress()
  const isCompleted = Boolean(completedMap[lessonId])
  const [resource, setResource] = useState(initialResource)
  const [hasChecked, setHasChecked] = useState(initiallyCompleted)
  const [loadError, setLoadError] = useState('')
  const [downloadError, setDownloadError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!isCompleted || hasChecked) return

    let cancelled = false

    async function loadResource() {
      try {
        const nextResource = await getCompletedLessonResource(lessonId)
        if (!cancelled) setResource(nextResource)
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'The lesson resource could not be loaded.')
      } finally {
        if (!cancelled) setHasChecked(true)
      }
    }

    loadResource()
    return () => { cancelled = true }
  }, [hasChecked, isCompleted, lessonId])

  if (!isCompleted || (!resource && !loadError)) return null

  if (loadError) {
    return (
      <section className={`${styles.lessonResource} ${styles.lessonResourceError}`} aria-live="polite">
        <p>{loadError}</p>
      </section>
    )
  }

  const details = RESOURCE_DETAILS[resource.resource_type]
  if (!details) return null
  const ResourceIcon = details.icon

  const downloadPdf = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    setDownloadError('')

    try {
      const download = await getCompletedLessonResourceDownloadUrl(lessonId)
      const anchor = document.createElement('a')
      anchor.href = download.url
      anchor.download = download.fileName
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setDownloadError(error.message || 'The PDF could not be downloaded.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <section className={styles.lessonResource} aria-labelledby={`lesson-resource-${lessonId}`}>
      <div className={styles.lessonResourceHeader}>
        <span className={styles.lessonResourceIcon}><ResourceIcon /></span>
        <div>
          <span className={styles.lessonResourceEyebrow}>Additional resource</span>
          <h2 id={`lesson-resource-${lessonId}`}>{details.label}</h2>
        </div>
      </div>

      {resource.resource_type === 'text' && (
        <p className={styles.lessonResourceText}>{resource.text_content}</p>
      )}

      {resource.resource_type === 'pdf' && (
        <div className={styles.lessonResourceActionRow}>
          <p>{resource.original_file_name || 'Supporting lesson PDF'}</p>
          <button type="button" className={styles.lessonResourceButton} onClick={downloadPdf} disabled={isDownloading}>
            <FaDownload /> {isDownloading ? 'Preparing...' : 'Download PDF'}
          </button>
          {downloadError && <span className={styles.lessonResourceActionError} role="alert">{downloadError}</span>}
        </div>
      )}

      {resource.resource_type === 'link' && (
        <div className={styles.lessonResourceActionRow}>
          <p>Continue with the supporting resource for this lesson.</p>
          <a className={styles.lessonResourceButton} href={resource.external_url} target="_blank" rel="noopener noreferrer">
            Visit resource <FaExternalLinkAlt />
          </a>
        </div>
      )}
    </section>
  )
}
