'use client'

import { useMemo, useState } from 'react'
import {
  FaBookOpen,
  FaCertificate,
  FaCheckCircle,
  FaChevronDown,
  FaDownload,
  FaExclamationTriangle,
  FaSearch,
  FaSpinner,
  FaTimes,
  FaUsers,
} from 'react-icons/fa'
import { generateAdminCertificate } from './admin-certificate.actions'
import styles from './admin-certificates.module.css'

const SORT_OPTIONS = [
  ['newest', 'Newest completion'],
  ['oldest', 'Oldest completion'],
  ['name', 'Account name'],
  ['course', 'Course name'],
]

function accountName(record) {
  return [record.first_name, record.last_name].filter(Boolean).join(' ').trim()
    || record.email?.split('@')[0]
    || 'Unnamed account'
}

function initials(record) {
  return accountName(record).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date)
}

function downloadPdf(base64, fileName) {
  const binary = window.atob(base64)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
}

function CertificateCard({ record, busyId, onDownload }) {
  const isBusy = busyId === record.enrollment_id

  return (
    <article className={styles.certificateCard}>
      <div className={styles.accountRow}>
        <span className={styles.avatar}>{initials(record)}</span>
        <div className={styles.accountIdentity}>
          <strong>{accountName(record)}</strong>
          <span>{record.email}</span>
        </div>
      </div>

      <div className={styles.courseRow}>
        <span className={styles.courseArtwork}>
          {record.logo_url ? (
            // Course artwork is stored remotely and may not match Next image host rules.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={record.logo_url} alt="" loading="lazy" />
          ) : <FaCertificate aria-hidden="true" />}
        </span>
        <div>
          <span>Certificate course</span>
          <strong>{record.course_title}</strong>
        </div>
      </div>

      <div className={styles.certificateMeta}>
        <span><FaCheckCircle aria-hidden="true" /> Course completed</span>
        <strong>{formatDate(record.completed_at)}</strong>
      </div>

      <button
        type="button"
        className={styles.downloadButton}
        onClick={() => onDownload(record)}
        disabled={Boolean(busyId)}
        aria-busy={isBusy}
      >
        {isBusy ? <><FaSpinner className={styles.spinner} /> Preparing certificate...</> : <><FaDownload /> Download Certificate</>}
      </button>
    </article>
  )
}

export default function AdminCertificatesDashboard({ initialRecords = [], error = '' }) {
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState('all')
  const [sort, setSort] = useState('newest')
  const [busyId, setBusyId] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const courses = useMemo(() => Array.from(new Map(
    initialRecords.map((record) => [record.course_id, record.course_title])
  )).map(([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title)), [initialRecords])

  const records = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    return initialRecords
      .filter((record) => course === 'all' || record.course_id === course)
      .filter((record) => !needle || [
        accountName(record),
        record.email,
        record.course_title,
      ].some((value) => String(value || '').toLocaleLowerCase().includes(needle)))
      .sort((left, right) => {
        if (sort === 'oldest') return new Date(left.completed_at) - new Date(right.completed_at)
        if (sort === 'name') return accountName(left).localeCompare(accountName(right))
        if (sort === 'course') return left.course_title.localeCompare(right.course_title)
        return new Date(right.completed_at) - new Date(left.completed_at)
      })
  }, [course, initialRecords, search, sort])

  const accountCount = new Set(initialRecords.map((record) => record.user_id)).size
  const recentCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000)
  const recentCount = initialRecords.filter((record) => new Date(record.completed_at).getTime() >= recentCutoff).length
  const hasFilters = Boolean(search || course !== 'all' || sort !== 'newest')

  const handleDownload = async (record) => {
    setBusyId(record.enrollment_id)
    setDownloadError('')
    try {
      const result = await generateAdminCertificate(record.enrollment_id)
      if (!result.success || !result.pdf) throw new Error(result.error || 'Certificate unavailable.')
      downloadPdf(result.pdf, result.fileName)
    } catch (requestError) {
      setDownloadError(requestError.message || 'The certificate could not be downloaded.')
    } finally {
      setBusyId('')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setCourse('all')
    setSort('newest')
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.metricGrid}>
        <article><span><FaCertificate /></span><div><strong>{initialRecords.length}</strong><small>Certificates ready</small></div></article>
        <article><span><FaUsers /></span><div><strong>{accountCount}</strong><small>Accounts certified</small></div></article>
        <article><span><FaBookOpen /></span><div><strong>{courses.length}</strong><small>Courses represented</small></div></article>
        <article><span><FaCheckCircle /></span><div><strong>{recentCount}</strong><small>Completed in 30 days</small></div></article>
      </div>

      <section className={styles.recordsSection}>
        <div className={styles.sectionHeading}>
          <div><span>Completion records</span><h3>Ready certificates</h3></div>
          <strong>{records.length} shown</strong>
        </div>

        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <span className="sr-only">Search certificates</span>
            <FaSearch aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search account, email, or course" />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><FaTimes /></button>}
          </label>

          <label className={styles.selectField}>
            <span>Course</span>
            <span><select value={course} onChange={(event) => setCourse(event.target.value)}><option value="all">All courses</option>{courses.map((item) => <option value={item.id} key={item.id}>{item.title}</option>)}</select><FaChevronDown /></span>
          </label>
          <label className={styles.selectField}>
            <span>Sort</span>
            <span><select value={sort} onChange={(event) => setSort(event.target.value)}>{SORT_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><FaChevronDown /></span>
          </label>
        </div>

        {hasFilters && <div className={styles.filterSummary}><span>{records.length} matching certificate{records.length === 1 ? '' : 's'}</span><button type="button" onClick={clearFilters}>Reset filters</button></div>}

        {(error || downloadError) && <div className={styles.error} role="alert"><FaExclamationTriangle /><span>{downloadError || error}</span></div>}

        {records.length ? (
          <div className={styles.cardsGrid}>
            {records.map((record) => <CertificateCard key={record.enrollment_id} record={record} busyId={busyId} onDownload={handleDownload} />)}
          </div>
        ) : !error ? (
          <div className={styles.empty}>
            <span><FaUsers /></span>
            <strong>{hasFilters ? 'No matching certificates' : 'No certificates ready'}</strong>
            <p>{hasFilters ? 'Try a broader search or reset the filters.' : 'Completed eligible courses will appear here.'}</p>
          </div>
        ) : null}
      </section>
    </div>
  )
}
