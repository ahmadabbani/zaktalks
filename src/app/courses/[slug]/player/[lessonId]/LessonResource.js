'use client'

import { useEffect, useState } from 'react'
import { FaDownload, FaExternalLinkAlt, FaFileAlt, FaFilePdf, FaLink } from 'react-icons/fa'
import {
  getCompletedLessonResources,
  getCompletedLessonResourceDownloadUrl
} from '@/app/courses/resource.actions'
import RichText from '@/components/RichText'
import { useCourseProgress } from '../CourseProgressContext'
import styles from './lesson-player.module.css'

const RESOURCE_DETAILS = {
  text: { label: 'Lesson note', icon: FaFileAlt },
  pdf: { label: 'Lesson PDF', icon: FaFilePdf },
  link: { label: 'Lesson link', icon: FaLink }
}

export default function LessonResource({ lessonId, initialResources = [], initiallyCompleted = false }) {
  const { completedMap } = useCourseProgress()
  const isCompleted = Boolean(completedMap[lessonId])
  const [resources, setResources] = useState(initialResources)
  const [hasChecked, setHasChecked] = useState(initiallyCompleted)
  const [loadError, setLoadError] = useState('')
  const [downloadErrors, setDownloadErrors] = useState({})
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => {
    if (!isCompleted || hasChecked) return

    let cancelled = false

    async function loadResource() {
      try {
        const nextResources = await getCompletedLessonResources(lessonId)
        if (!cancelled) setResources(nextResources)
      } catch (error) {
        if (!cancelled) setLoadError(error.message || 'The lesson resource could not be loaded.')
      } finally {
        if (!cancelled) setHasChecked(true)
      }
    }

    loadResource()
    return () => { cancelled = true }
  }, [hasChecked, isCompleted, lessonId])

  if (!isCompleted || (!resources.length && !loadError)) return null

  if (loadError) {
    return (
      <section className={`${styles.lessonResource} ${styles.lessonResourceError}`} aria-live="polite">
        <p>{loadError}</p>
      </section>
    )
  }

  const downloadPdf = async (resource) => {
    if (downloadingId) return
    setDownloadingId(resource.id)
    setDownloadErrors((current) => ({ ...current, [resource.id]: '' }))

    try {
      const download = await getCompletedLessonResourceDownloadUrl(lessonId, resource.id)
      const anchor = document.createElement('a')
      anchor.href = download.url
      anchor.download = download.fileName
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } catch (error) {
      setDownloadErrors((current) => ({
        ...current,
        [resource.id]: error.message || 'The PDF could not be downloaded.',
      }))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className={styles.lessonResourceList} aria-label="Additional lesson resources">
      {resources.map((resource, index) => {
        const details = RESOURCE_DETAILS[resource.resource_type]
        if (!details) return null
        const ResourceIcon = details.icon
        const headingId = `lesson-resource-${lessonId}-${resource.id}`
        const isDownloading = downloadingId === resource.id
        const downloadError = downloadErrors[resource.id]

        return (
          <section className={styles.lessonResource} aria-labelledby={headingId} key={resource.id}>
            <div className={styles.lessonResourceHeader}>
              <span className={styles.lessonResourceIcon}><ResourceIcon /></span>
              <div>
                <span className={styles.lessonResourceEyebrow}>
                  Additional resource{resources.length > 1 ? ` ${index + 1}` : ''}
                </span>
                <h2 id={headingId}>{details.label}</h2>
              </div>
            </div>

            {resource.resource_type === 'text' && (
              <p className={styles.lessonResourceText}>
                <RichText value={resource.rich_content?.description} fallback={resource.text_content} maxLength={20000} />
              </p>
            )}

            {resource.resource_type === 'pdf' && (
              <div className={styles.lessonResourceActionRow}>
                <p>{resource.original_file_name || 'Supporting lesson PDF'}</p>
                <button type="button" className={styles.lessonResourceButton} onClick={() => downloadPdf(resource)} disabled={Boolean(downloadingId)}>
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
      })}
    </div>
  )
}
