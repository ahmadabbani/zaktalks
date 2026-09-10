'use client'

import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react'
import toast from 'react-hot-toast'
import { FaCheck, FaChevronDown, FaCopy, FaLink, FaTrash } from 'react-icons/fa'
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

function AssessmentSelect({ assessments, value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const selected = assessments.find((assessment) => assessment.id === value)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const moveSelection = (direction) => {
    if (!assessments.length) return
    const currentIndex = assessments.findIndex((assessment) => assessment.id === value)
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + assessments.length) % assessments.length
    onChange(assessments[nextIndex].id)
  }

  const handleKeyDown = (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    moveSelection(event.key === 'ArrowDown' ? 1 : -1)
    setOpen(true)
  }

  return (
    <div className={styles.externalAssessmentSelect} ref={rootRef} onKeyDown={handleKeyDown}>
      <input type="hidden" name="assessment_key" value={value} />
      <button
        id="external-assessment-select"
        type="button"
        className={`${styles.externalAssessmentSelectTrigger} ${open ? styles.externalAssessmentSelectTriggerOpen : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.title || 'Select an assessment'}</span>
        <FaChevronDown aria-hidden="true" />
      </button>

      {open && (
        <div id={menuId} className={styles.externalAssessmentSelectMenu} role="listbox" aria-label="Assessment">
          {assessments.map((assessment) => (
            <button
              key={assessment.id}
              type="button"
              role="option"
              aria-selected={assessment.id === value}
              className={assessment.id === value ? styles.externalAssessmentSelectOptionSelected : ''}
              onClick={() => {
                onChange(assessment.id)
                setOpen(false)
              }}
            >
              <span>{assessment.title}</span>
              {assessment.id === value && <FaCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ExternalAssessmentLinks({ assessments, initialLinks, showHeading = true }) {
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
      {showHeading && <div className={styles.externalLinksHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            <FaLink /> External Assessment Links
          </h2>
          <p>Generate public 24-hour links that work outside courses and do not save submissions.</p>
        </div>
      </div>}

      <form className={styles.externalLinkForm} onSubmit={handleGenerate}>
        <label htmlFor="external-assessment-select">Assessment</label>
        <div className={styles.externalLinkFormRow}>
          <AssessmentSelect
            assessments={assessments}
            value={selectedAssessment}
            onChange={setSelectedAssessment}
            disabled={isPending}
          />
          <button className={styles.externalLinkGenerateButton} type="submit" disabled={isPending || !selectedAssessment}>
            <FaLink aria-hidden="true" />
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
                    <FaCopy aria-hidden="true" /> Copy
                  </button>
                  <button
                    type="button"
                    className={styles.externalLinkRevokeBtn}
                    onClick={() => handleRevoke(link.id)}
                    disabled={isPending}
                    aria-label={`Delete ${assessmentMap[link.assessment_key]?.title || link.assessment_key} link`}
                  >
                    <FaTrash aria-hidden="true" /> Delete
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
