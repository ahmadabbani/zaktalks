'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaCalendarAlt,
  FaCheck,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaEnvelope,
  FaExclamationTriangle,
  FaEye,
  FaLayerGroup,
  FaSearch,
  FaShieldAlt,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const STATUS_OPTIONS = [
  ['all', 'All access states'],
  ['completed', 'Active access'],
  ['pending', 'Pending access'],
  ['failed', 'Failed access'],
  ['refunded', 'Revoked / refunded'],
]

const SOURCE_OPTIONS = [
  ['all', 'All access sources'],
  ['guest', 'Guest checkout'],
  ['account', 'Account checkout'],
  ['direct', 'Direct / legacy'],
]

const RANGE_OPTIONS = [
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['365', 'Last 12 months'],
  ['all', 'All time'],
]

const SORT_OPTIONS = [
  ['newest', 'Newest access'],
  ['oldest', 'Oldest access'],
  ['name', 'Learner name'],
  ['course', 'Course name'],
  ['status', 'Access state'],
]

const initialFilters = {
  status: 'all',
  course: 'all',
  source: 'all',
  range: '90',
  sort: 'newest',
  pageSize: '25',
}

const statusDetails = {
  completed: { label: 'Active access', tone: 'success', description: 'Course access is available.' },
  pending: { label: 'Pending access', tone: 'yellow', description: 'The enrollment has not become active.' },
  failed: { label: 'Failed access', tone: 'danger', description: 'No active course access was granted.' },
  refunded: { label: 'Revoked / refunded', tone: 'neutral', description: 'Course access is no longer active.' },
}

const sourceLabels = {
  guest: 'Guest checkout',
  account: 'Account checkout',
  direct: 'Direct / legacy access',
}

function formatDate(value, withTime = false) {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function formatTrendDate(value, range) {
  const date = new Date(value)
  if (range === 'all') return String(date.getFullYear())
  if (range === '365') return date.toLocaleDateString('en', { month: 'short' })
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

function learnerName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
    || row?.email?.split('@')[0]
    || 'Unnamed account'
}

function initials(row) {
  return learnerName(row).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function AnimatedNumber({ value, suffix = '' }) {
  const numericValue = Number(value) || 0
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let frame
    const startedAt = performance.now()
    const duration = 620
    const update = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(numericValue * eased))
      if (progress < 1) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [numericValue])

  return <>{displayValue.toLocaleString()}{suffix}</>
}

function EnrollmentSelect({ label, name, value, options, onChange }) {
  return (
    <label className={styles.enrollmentSelectLabel}>
      <span>{label}</span>
      <span className={styles.enrollmentSelectShell}>
        <select name={name} value={value} onChange={onChange}>
          {options.map(([optionValue, optionLabel]) => (
            <option value={optionValue} key={optionValue}>{optionLabel}</option>
          ))}
        </select>
        <FaChevronDown aria-hidden="true" />
      </span>
    </label>
  )
}

function AccessPill({ status }) {
  const detail = statusDetails[status] || statusDetails.pending
  return <span className={`${styles.enrollmentPill} ${styles[`enrollmentPill${detail.tone}`]}`}>{detail.label}</span>
}

function EnrollmentDrawer({ enrollment, onClose }) {
  const closeButton = useRef(null)

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const detail = statusDetails[enrollment.access_status] || statusDetails.pending

  return (
    <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={`${styles.userDrawer} ${styles.enrollmentDrawer}`} role="dialog" aria-modal="true" aria-labelledby="enrollment-drawer-title">
        <div className={styles.drawerHeader}>
          <div className={styles.drawerIdentity}>
            <span className={styles.directoryAvatar}>{initials(enrollment)}</span>
            <div>
              <span>Enrollment record</span>
              <h3 id="enrollment-drawer-title">{learnerName(enrollment)}</h3>
              <a href={`mailto:${enrollment.email}`}>{enrollment.email}</a>
            </div>
          </div>
          <button ref={closeButton} type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close enrollment details"><FaTimes /></button>
        </div>

        <div className={styles.drawerContent}>
          <div className={styles.drawerStatusRow}>
            <AccessPill status={enrollment.access_status} />
            <span className={`${styles.enrollmentPill} ${styles.enrollmentPillblue}`}>{sourceLabels[enrollment.access_source] || 'Access record'}</span>
            <span className={`${styles.enrollmentPill} ${enrollment.course_published ? styles.enrollmentPillsuccess : styles.enrollmentPillneutral}`}>
              {enrollment.course_published ? 'Course published' : 'Course unpublished'}
            </span>
          </div>

          <section className={styles.enrollmentStateCard}>
            <span className={styles.enrollmentStateIcon}><FaShieldAlt /></span>
            <div><span>Current access state</span><strong>{detail.label}</strong><p>{detail.description}</p></div>
          </section>

          <section className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}><FaBookOpen /><h4>Course access</h4></div>
            <dl className={styles.detailGrid}>
              <div><dt>Course</dt><dd>{enrollment.course_title}</dd></div>
              <div><dt>Course path</dt><dd>/{enrollment.course_slug}</dd></div>
              <div><dt>Access created</dt><dd>{formatDate(enrollment.created_at, true)}</dd></div>
              <div><dt>Last record update</dt><dd>{formatDate(enrollment.updated_at || enrollment.created_at, true)}</dd></div>
              <div><dt>Access source</dt><dd>{sourceLabels[enrollment.access_source] || 'Access record'}</dd></div>
              <div><dt>Enrollment ID</dt><dd title={enrollment.id}>{enrollment.id}</dd></div>
            </dl>
          </section>

          <section className={styles.drawerSection}>
            <div className={styles.drawerSectionTitle}><FaUserGraduate /><h4>Learner readiness</h4></div>
            <div className={styles.enrollmentReadinessRows}>
              <div><span><FaEnvelope /> Email verification</span><strong>{enrollment.email_verified ? 'Verified' : 'Pending'}</strong></div>
              <div><span><FaCheck /> Password access</span><strong>{enrollment.password_set ? 'Ready' : 'Pending'}</strong></div>
            </div>
          </section>

          <p className={styles.enrollmentScopeNote}>
            Payment operations, lesson activity, assessments, and certificates are available in their dedicated workspace areas.
          </p>
        </div>
      </aside>
    </div>
  )
}

export default function EnrollmentsDashboard() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [pageNumber, setPageNumber] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEnrollment, setSelectedEnrollment] = useState(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      if (nextSearch === search) return
      setPageNumber(1)
      setSearch(nextSearch)
    }, 320)
    return () => window.clearTimeout(timeout)
  }, [searchInput, search])

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      search,
      ...filters,
      page: String(pageNumber),
    })
    return params.toString()
  }, [filters, pageNumber, search])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true)
        setError('')
      }
    })
    fetch(`/api/admin/users/enrollments?${queryString}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load enrollments.')
        setData(body)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [queryString])

  const summary = data?.summary || {}
  const total = Number(summary.total || 0)
  const active = Number(summary.active || 0)
  const learners = Number(summary.learners || 0)
  const pending = Number(summary.pending || 0)
  const failed = Number(summary.failed || 0)
  const revoked = Number(summary.revoked || 0)
  const accessRate = total ? Math.round((active / total) * 100) : 0
  const needsAttention = pending + failed
  const maxTrend = Math.max(1, ...(data?.trend || []).map((item) => Number(item.total || 0)))
  const maxCourse = Math.max(1, ...(data?.courseMix || []).map((item) => Number(item.active || 0)))
  const start = data?.totalCount ? (pageNumber - 1) * Number(filters.pageSize) + 1 : 0
  const end = Math.min(Number(data?.totalCount || 0), start + (data?.rows?.length || 0) - 1)
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])

  const updateFilter = (event) => {
    setPageNumber(1)
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setFilters(initialFilters)
    setPageNumber(1)
  }

  const courseOptions = [['all', 'All courses'], ...(data?.courses || []).map((course) => [course.id, course.title])]
  const metrics = [
    { label: 'Active access', value: active, detail: `${accessRate}% of filtered records`, icon: FaCheckCircle, tone: 'blue' },
    { label: 'Enrolled learners', value: learners, detail: 'Unique learners with access', icon: FaUsers, tone: 'slate' },
    { label: 'Needs attention', value: needsAttention, detail: `${pending} pending, ${failed} failed`, icon: FaClock, tone: 'yellow' },
    { label: 'Revoked access', value: revoked, detail: 'Refunded enrollment records', icon: FaShieldAlt, tone: 'slate' },
  ]

  if (loading && !data) return <AdminDashboardLoading label="Loading enrollment analytics" />

  return (
    <div className={styles.enrollmentsDashboard} aria-busy={loading}>
      {loading && data && <AdminDashboardUpdate label="Updating enrollment analytics" />}
      <div className={styles.enrollmentRangeBar}>
        <div>
          <span>Reporting window</span>
          <p>Metrics and records update together.</p>
        </div>
        <div className={styles.enrollmentRangeOptions}>
          {RANGE_OPTIONS.map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={filters.range === value ? styles.enrollmentRangeActive : styles.enrollmentRangeOption}
              onClick={() => {
                setPageNumber(1)
                setFilters((current) => ({ ...current, range: value }))
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div className={styles.enrollmentMetricGrid}>
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <article className={`${styles.enrollmentMetricCard} ${styles[`enrollmentMetric${metric.tone}`]}`} style={{ '--metric-delay': `${index * 70}ms` }} key={metric.label}>
              <span className={styles.enrollmentMetricIcon}><Icon /></span>
              <div><span>{metric.label}</span><strong><AnimatedNumber value={metric.value} /></strong><small>{metric.detail}</small></div>
            </article>
          )
        })}
      </div>

      <div className={styles.enrollmentInsightsGrid}>
        <section className={styles.enrollmentInsightCard}>
          <div className={styles.enrollmentCardHeader}>
            <div><span>Access timeline</span><h3>Enrollment activity</h3></div>
            <span>{RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1]}</span>
          </div>
          {(data?.trend || []).length ? (
            <div className={styles.enrollmentTrend}>
              {(data?.trend || []).map((item) => (
                <div className={styles.enrollmentTrendItem} key={item.bucket}>
                  <div><span>{item.total}</span><i style={{ height: `${Math.max(8, (Number(item.total) / maxTrend) * 100)}%` }} /></div>
                  <small>{formatTrendDate(item.bucket, filters.range)}</small>
                </div>
              ))}
            </div>
          ) : <div className={styles.enrollmentEmptyCompact}><FaCalendarAlt /><span>No enrollment activity in this view.</span></div>}
        </section>

        <section className={styles.enrollmentInsightCard}>
          <div className={styles.enrollmentCardHeader}><div><span>Distribution</span><h3>Course access mix</h3></div></div>
          {(data?.courseMix || []).length ? (
            <div className={styles.enrollmentCourseMix}>
              {(data?.courseMix || []).map((course) => (
                <div key={course.course_id}>
                  <div><strong>{course.course_title}</strong><span>{course.active} active</span></div>
                  <span><i style={{ width: `${(Number(course.active) / maxCourse) * 100}%` }} /></span>
                  <small>{course.learners} unique {Number(course.learners) === 1 ? 'learner' : 'learners'} / {course.total} records</small>
                </div>
              ))}
            </div>
          ) : <div className={styles.enrollmentEmptyCompact}><FaLayerGroup /><span>No course access in this view.</span></div>}
        </section>

        <section className={`${styles.enrollmentInsightCard} ${styles.enrollmentHealthCard}`}>
          <div className={styles.enrollmentCardHeader}><div><span>Access health</span><h3>Current states</h3></div></div>
          <div className={styles.enrollmentHealthSummary}>
            <div className={styles.enrollmentHealthRing} style={{ '--access-rate': `${accessRate}%` }}>
              <div><strong><AnimatedNumber value={accessRate} suffix="%" /></strong><span>active</span></div>
            </div>
            <div className={styles.enrollmentStateRows}>
              <div><span><i className={styles.stateActive} />Active</span><strong>{active}</strong></div>
              <div><span><i className={styles.statePending} />Pending</span><strong>{pending}</strong></div>
              <div><span><i className={styles.stateFailed} />Failed</span><strong>{failed}</strong></div>
              <div><span><i className={styles.stateRevoked} />Revoked</span><strong>{revoked}</strong></div>
            </div>
          </div>
        </section>
      </div>

      <section className={styles.enrollmentRecordsSection}>
        <div className={styles.enrollmentSectionHeading}>
          <div><span>Access records</span><h3>Enrollment directory</h3></div>
          <p>Search learners and courses, then narrow the records by access state and source.</p>
        </div>

        <div className={styles.enrollmentToolbar}>
          <label className={styles.directorySearch}>
            <span className="sr-only">Search enrollments</span>
            <FaSearch aria-hidden="true" />
            <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search learner, email, or course" />
            {searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}
          </label>
          <div className={styles.enrollmentFilterGrid}>
            <EnrollmentSelect label="Access" name="status" value={filters.status} options={STATUS_OPTIONS} onChange={updateFilter} />
            <EnrollmentSelect label="Course" name="course" value={filters.course} options={courseOptions} onChange={updateFilter} />
            <EnrollmentSelect label="Source" name="source" value={filters.source} options={SOURCE_OPTIONS} onChange={updateFilter} />
            <EnrollmentSelect label="Sort" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} />
          </div>
          <div className={styles.directoryToolbarBottom}>
            <span>{loading ? 'Updating enrollment records...' : `${Number(data?.totalCount || 0).toLocaleString()} matching records`}</span>
            {hasFilters && <button type="button" onClick={clearFilters}>Reset filters</button>}
          </div>
        </div>

        {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Enrollments unavailable</strong><span>{error}</span></div></div>}

        <div className={styles.enrollmentTableShell} aria-busy={loading}>
          <div className={styles.enrollmentTableHeader}>
            <span>Learner</span><span>Course</span><span>Access</span><span>Source</span><span>Added</span><span className="sr-only">Open</span>
          </div>
          {loading && !data ? <div className={styles.enrollmentSkeleton}>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div> : null}
          {!loading && !error && !data?.rows?.length ? (
            <div className={styles.directoryEmpty}><FaBookOpen /><strong>No matching enrollments</strong><span>Try a broader search or reset the filters.</span></div>
          ) : null}
          <div className={loading ? styles.enrollmentRowsLoading : styles.enrollmentRows}>
            {(data?.rows || []).map((row, index) => (
              <button type="button" className={styles.enrollmentRow} style={{ '--row-delay': `${index * 30}ms` }} key={row.id} onClick={() => setSelectedEnrollment(row)}>
                <span className={styles.directoryIdentity}>
                  <span className={styles.directoryAvatar}>{initials(row)}</span>
                  <span><strong>{learnerName(row)}</strong><small>{row.email}</small></span>
                </span>
                <span className={styles.enrollmentCourseCell}><strong>{row.course_title}</strong><small>/{row.course_slug}</small></span>
                <span className={styles.enrollmentStatusCell}><AccessPill status={row.access_status} /><small>{row.course_published ? 'Published course' : 'Course unpublished'}</small></span>
                <span className={styles.enrollmentSourceCell}><strong>{sourceLabels[row.access_source] || 'Access record'}</strong><small>{row.password_set ? 'Account ready' : 'Password pending'}</small></span>
                <span className={styles.directoryDate}><strong>{formatDate(row.created_at)}</strong><small>{row.email_verified ? 'Verified learner' : 'Verification pending'}</small></span>
                <span className={styles.directoryOpen}><FaEye aria-hidden="true" /></span>
              </button>
            ))}
          </div>
        </div>

        <div className={styles.directoryPagination}>
          <label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label>
          <span>{start}-{end} of {Number(data?.totalCount || 0).toLocaleString()}</span>
          <div>
            <button type="button" onClick={() => setPageNumber((current) => Math.max(1, current - 1))} disabled={pageNumber <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button>
            <span>Page {pageNumber}</span>
            <button type="button" onClick={() => setPageNumber((current) => current + 1)} disabled={pageNumber >= Number(data?.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button>
          </div>
        </div>
      </section>

      {selectedEnrollment && <EnrollmentDrawer enrollment={selectedEnrollment} onClose={() => setSelectedEnrollment(null)} />}
    </div>
  )
}
