'use client'

import { useMemo, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { FaCopy, FaLink, FaTrash } from 'react-icons/fa'
import {
  generateExternalAssessmentLink,
  revokeExternalAssessmentLink
} from './external-assessment.actions'
import styles from './admin-dashboard.module.css'

function getStatus(link) {
  if (link.revoked_at) return { label: 'Revoked', className: styles.externalLinkStatusRevoked }
  if (new Date(link.expires_at).getTime() <= Date.now()) {
    return { label: 'Expired', className: styles.externalLinkStatusExpired }
  }
  return { label: 'Active', className: styles.externalLinkStatusActive }
}

function formatDate(value) {
  return new Date(value).toLocaleString()
}

export default function ExternalAssessmentLinks({ assessments, initialLinks }) {
  const [links, setLinks] = useState(initialLinks || [])
  const [selectedAssessment, setSelectedAssessment] = useState(assessments[0]?.id || '')
  const [isPending, startTransition] = useTransition()

  const assessmentMap = useMemo(() => {
    return Object.fromEntries((assessments || []).map((assessment) => [assessment.id, assessment]))
  }, [assessments])

  const buildFullUrl = (path) => {
    if (typeof window === 'undefined') return path
    return `${window.location.origin}${path}`
  }

  const copyLink = async (path) => {
    try {
      await navigator.clipboard.writeText(buildFullUrl(path))
      toast.success('Link copied.')
    } catch {
      toast.error('Could not copy link.')
    }
  }

  const handleGenerate = (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await generateExternalAssessmentLink(formData)

      if (!result.success) {
        toast.error(result.error || 'Could not generate link.')
        return
      }

      setLinks((current) => [result.link, ...current])
      toast.success('External assessment link generated.')
    })
  }

  const handleRevoke = (linkId) => {
    startTransition(async () => {
      const result = await revokeExternalAssessmentLink(linkId)

      if (!result.success) {
        toast.error(result.error || 'Could not delete link.')
        return
      }

      setLinks((current) => current.filter((link) => link.id !== linkId))
      toast.success('Link deleted.')
    })
  }

  return (
    <section className={styles.externalLinksSection}>
      <div className={styles.externalLinksHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            <FaLink /> External Assessment Links
          </h2>
          <p>Generate public 24-hour links that work outside courses and do not save submissions.</p>
        </div>
      </div>

      <form className={styles.externalLinkForm} onSubmit={handleGenerate}>
        <label htmlFor="external-assessment-select">Assessment</label>
        <div className={styles.externalLinkFormRow}>
          <select
            id="external-assessment-select"
            name="assessment_key"
            value={selectedAssessment}
            onChange={(event) => setSelectedAssessment(event.target.value)}
            disabled={isPending}
            required
          >
            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.title}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isPending || !selectedAssessment}>
            Generate Link
          </button>
        </div>
      </form>

      <div className={styles.externalLinksList}>
        {links.length === 0 ? (
          <div className={styles.externalLinksEmpty}>No external links generated yet.</div>
        ) : (
          links.map((link) => {
            const status = getStatus(link)
            const path = link.path || `/assessments/external/${link.token}`
            const isActive = status.label === 'Active'

            return (
              <div key={link.id} className={styles.externalLinkCard}>
                <div className={styles.externalLinkMain}>
                  <div className={styles.externalLinkTitleRow}>
                    <h3>{assessmentMap[link.assessment_key]?.title || link.assessment_key}</h3>
                    <span className={`${styles.externalLinkStatus} ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className={styles.externalLinkUrl}>{path}</p>
                  <p className={styles.externalLinkMeta}>
                    Created {formatDate(link.created_at)} · Expires {formatDate(link.expires_at)}
                  </p>
                </div>
                <div className={styles.externalLinkActions}>
                  <button type="button" onClick={() => copyLink(path)}>
                    <FaCopy /> Copy
                  </button>
                  {isActive && (
                    <button
                      type="button"
                      className={styles.externalLinkRevokeBtn}
                      onClick={() => handleRevoke(link.id)}
                      disabled={isPending}
                    >
                      <FaTrash /> Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
