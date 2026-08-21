'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaClipboardCheck,
  FaDownload,
  FaExclamationTriangle,
  FaEye,
  FaFilePdf,
  FaHistory,
  FaRedo,
  FaSearch,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'
import { getAssessmentResult } from '@/assessments/result-presentation'

const RANGE_OPTIONS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['all', 'All time']]
const KIND_OPTIONS = [['all', 'All result types'], ['scored', 'Scored assessments'], ['worksheet', 'Worksheet PDFs']]
const SORT_OPTIONS = [['activity', 'Latest activity'], ['name', 'Name'], ['attempts', 'Most attempts'], ['score', 'Highest normalized result']]
const DETAIL_SORT_OPTIONS = [['activity', 'Latest activity'], ['name', 'Learner name'], ['attempts', 'Most attempts'], ['score', 'Highest normalized result']]
const initialFilters = { course: 'all', kind: 'all', range: '30', sort: 'activity', pageSize: '25' }

function number(value) { return Number(value || 0) }

function formatDate(value, withTime = false) {
  if (!value) return 'No activity yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function learnerName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim()
    || row?.email?.split('@')[0]
    || 'Unnamed account'
}

function initials(row) {
  return learnerName(row).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function Select({ label, name, value, options, onChange }) {
  return <label className={styles.enrollmentSelectLabel}>
    <span>{label}</span>
    <span className={styles.enrollmentSelectShell}>
      <select name={name} value={value} onChange={onChange}>
        {options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
      </select>
      <FaChevronDown aria-hidden="true" />
    </span>
  </label>
}

function Score({ value, compact = false }) {
  if (value === null || value === undefined) return <span className={styles.assessmentNoScore}>No numeric score</span>
  const safe = Math.max(0, Math.min(100, number(value)))
  return <span className={`${styles.assessmentScore} ${compact ? styles.assessmentScoreCompact : ''}`}>
    <span><i style={{ width: `${safe}%` }} /></span>
    <strong>{safe}%</strong>
  </span>
}

function ResultBreakdown({ items = [] }) {
  if (!items.length) return null
  return <div className={styles.assessmentActualBreakdown}>
    {items.map((item) => <div key={item.key || item.label}>
      <span><strong>{item.label || item.key}</strong>{item.meaning && <small>{item.meaning}</small>}</span>
      <b>{number(item.score)} <small>/ {number(item.max)}</small></b>
    </div>)}
  </div>
}

function RoleSummary({ label, items }) {
  return <article>
    <small>{label}</small>
    <div>{items?.length
      ? items.map((item) => <span key={item.key}><strong>{item.label}</strong><b>{number(item.score)} <small>/ {number(item.max)}</small></b></span>)
      : <span><strong>No role in this range</strong></span>}
    </div>
  </article>
}

function AssessmentConclusion({ conclusion }) {
  if (!conclusion?.value) return null
  return <section className={styles.assessmentConclusion}>
    <span>{conclusion.label}</span>
    <strong>{conclusion.value}</strong>
    {conclusion.description && <p>{conclusion.description}</p>}
  </section>
}

function AssessmentActualResult({ attempt, assessmentKey, historical = false }) {
  if (!attempt) return <div className={styles.assessmentActualEmpty}>Result details are unavailable.</div>
  const result = getAssessmentResult(attempt, assessmentKey)

  return <div className={styles.assessmentActualResult}>
    <header>
      <span>Actual assessment result</span>
      <h5>{result.title}</h5>
      {result.subtitle && <p>{result.subtitle}</p>}
    </header>
    <ResultBreakdown items={result.breakdown} />
    <AssessmentConclusion conclusion={result.conclusion} />
    {result.notes?.length > 0 && <ul className={styles.assessmentActualNotes}>
      {result.notes.map((note) => <li key={note}>{note}</li>)}
    </ul>}
    {result.mode === 'roles' && <div className={styles.assessmentRoleSummary}>
      <RoleSummary label="My prominent role" items={result.primary} />
      <RoleSummary label="My secondary role" items={result.secondary} />
    </div>}
    {result.mode === 'ranked' && <div className={styles.assessmentRoleSummary}>
      <RoleSummary label="Top 3 highest totals" items={result.highest} />
      <RoleSummary label="Top 3 lowest totals" items={result.lowest} />
    </div>}
    {historical && <small className={styles.assessmentHistoricalNote}>This older record contains only the score preserved before detailed attempt history was introduced.</small>}
  </div>
}

function AttemptHistory({ history = [], assessmentKey }) {
  if (!history.length) return null
  return <div className={styles.assessmentAttemptHistory}>
    {history.map((attempt) => {
      return <article key={attempt.id || `${attempt.attempt_number}-${attempt.completed_at}`}>
        <header>
          <span>Attempt {attempt.attempt_number}</span>
          <time>{formatDate(attempt.completed_at, true)}</time>
        </header>
        <AssessmentActualResult attempt={attempt} assessmentKey={assessmentKey} historical={Boolean(attempt?.score_details?.historical)} />
      </article>
    })}
  </div>
}

function ResultCard({ result }) {
  const latest = result.history?.[0]
  const isWorksheet = result.kind === 'worksheet'
  return <article className={styles.assessmentResultCard}>
    <header>
      <span className={isWorksheet ? styles.assessmentKindWorksheet : styles.assessmentKindScored}>
        {isWorksheet ? <FaFilePdf /> : <FaClipboardCheck />}
      </span>
      <div>
        <small>{result.course_title} · {result.module_title}</small>
        <h4>{result.lesson_title}</h4>
      </div>
      <span className={styles.enrollmentPill}>{isWorksheet ? 'Worksheet' : 'Scored'}</span>
    </header>
    {isWorksheet ? <div className={styles.assessmentWorksheetSummary}>
      <div><strong>Submitted</strong><span>{formatDate(result.last_activity_at, true)}</span></div>
      {result.has_file
        ? <a href={`/api/admin/users/assessment-results/worksheet/${result.submission_id}`} target="_blank" rel="noreferrer"><FaEye /> View PDF</a>
        : <span className={styles.assessmentFileMissing}>PDF unavailable</span>}
    </div> : <>
      <AssessmentActualResult attempt={latest} assessmentKey={result.assessment_key} historical={Boolean(latest?.score_details?.historical)} />
      <div className={styles.assessmentResultSummary}>
        <span><small>Attempts</small><strong>{number(result.attempt_count)}</strong></span>
        <span><small>Retakes</small><strong>{Math.max(0, number(result.attempt_count) - 1)}</strong></span>
        <span><small>Last activity</small><strong>{formatDate(result.last_activity_at)}</strong></span>
      </div>
      <details className={styles.assessmentHistoryDisclosure}>
        <summary><FaHistory /> View full score history <FaChevronDown /></summary>
        <AttemptHistory history={result.history} assessmentKey={result.assessment_key} />
      </details>
    </>}
  </article>
}

function DrawerLoading() {
  return <div className={styles.assessmentDrawerLoading} role="status"><span /><span /><span /><strong>Loading assessment history</strong></div>
}

function AssessmentDetailDrawer({ selection, range, onClose }) {
  const closeButton = useRef(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('activity')
  const [page, setPage] = useState(1)

  useEffect(() => {
    closeButton.current?.focus()
    const onKeyDown = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) { setSearch(next); setPage(1) }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search, searchInput])

  const query = useMemo(() => new URLSearchParams({ range, search, sort, page: String(page), pageSize: '25' }).toString(), [page, range, search, sort])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    const url = selection.type === 'learner'
      ? `/api/admin/users/assessment-results/learner/${selection.id}?range=${range}`
      : `/api/admin/users/assessment-results/assessment/${selection.id}?${query}`
    fetch(url, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load details.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query, range, selection])

  const title = selection.type === 'learner' ? learnerName(data?.learner || selection.row) : data?.assessment?.lesson_title || selection.row.lesson_title
  const subtitle = selection.type === 'learner' ? data?.learner?.email || selection.row.email : `${data?.assessment?.course_title || selection.row.course_title} · ${data?.assessment?.module_title || selection.row.module_title}`
  const summary = data?.summary || {}
  const start = data?.totalCount ? (page - 1) * 25 + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.rows?.length || 0) - 1)

  return <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className={`${styles.userDrawer} ${styles.assessmentDrawer}`} role="dialog" aria-modal="true" aria-labelledby="assessment-detail-title">
      <header className={styles.assessmentDrawerHeader}>
        <div>
          <span>{selection.type === 'learner' ? 'Learner assessment record' : 'Assessment learner record'}</span>
          <h3 id="assessment-detail-title">{title}</h3>
          <small>{subtitle}</small>
        </div>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Close assessment details"><FaTimes /></button>
      </header>

      {loading && !data ? <DrawerLoading /> : <div className={styles.assessmentDrawerBody} aria-busy={loading}>
        {loading && data && <AdminDashboardUpdate label="Updating details" />}
        {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Details unavailable</strong><span>{error}</span></div></div>}
        {data && <>
          <div className={styles.assessmentDrawerMetrics}>
            <article><small>{selection.type === 'learner' ? 'Assessments' : 'Learners'}</small><strong>{number(summary.assessments ?? summary.learners)}</strong></article>
            <article><small>Scored attempts</small><strong>{number(summary.scored_attempts)}</strong></article>
            <article><small>Worksheets</small><strong>{number(summary.worksheets ?? summary.worksheet_submissions)}</strong></article>
            <article><small>Normalized average</small><strong>{summary.average_latest_score === null || summary.average_latest_score === undefined ? 'N/A' : `${number(summary.average_latest_score)}%`}</strong></article>
          </div>

          {selection.type === 'learner' ? <section className={styles.assessmentResultList}>
            <div className={styles.enrollmentSectionHeading}><div><span>Complete record</span><h3>Assessments and score history</h3></div><p>Every retake is preserved as a separate attempt.</p></div>
            {(data.results || []).map((result) => <ResultCard result={result} key={`${result.kind}-${result.lesson_id}-${result.submission_id || ''}`} />)}
            {!data.results?.length && <div className={styles.directoryEmpty}><FaClipboardCheck /><strong>No results in this period</strong><span>Choose a broader reporting window to include earlier activity.</span></div>}
          </section> : <section className={styles.assessmentLearnerDetail}>
            <div className={styles.assessmentDetailToolbar}>
              <label className={styles.directorySearch}><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search learner" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
              <Select label="Sort" name="sort" value={sort} options={DETAIL_SORT_OPTIONS} onChange={(event) => { setPage(1); setSort(event.target.value) }} />
            </div>
            <div className={styles.assessmentLearnerCards}>
              {(data.rows || []).map((row) => <article key={`${row.user_id}-${row.submission_id || 'score'}`}>
                <header><span className={styles.userAvatar}>{initials(row)}</span><div><strong>{learnerName(row)}</strong><small>{row.email}</small></div><span className={styles.enrollmentPill}>{row.kind === 'worksheet' ? 'Worksheet' : `${number(row.attempt_count)} ${number(row.attempt_count) === 1 ? 'attempt' : 'attempts'}`}</span></header>
                {row.kind === 'worksheet' ? <div className={styles.assessmentWorksheetSummary}><div><strong>Submitted</strong><span>{formatDate(row.last_activity_at, true)}</span></div>{row.has_file ? <a href={`/api/admin/users/assessment-results/worksheet/${row.submission_id}`} target="_blank" rel="noreferrer"><FaDownload /> Open PDF</a> : <span className={styles.assessmentFileMissing}>PDF unavailable</span>}</div> : <>
                  <AssessmentActualResult attempt={row.history?.[0]} assessmentKey={data.assessment?.assessment_key} historical={Boolean(row.history?.[0]?.score_details?.historical)} />
                  <div className={styles.assessmentLearnerScore}><small>{number(row.attempt_count)} {number(row.attempt_count) === 1 ? 'attempt' : 'attempts'} · Last completed {formatDate(row.last_activity_at, true)}</small></div>
                  <details className={styles.assessmentHistoryDisclosure}><summary><FaHistory /> Score history <FaChevronDown /></summary><AttemptHistory history={row.history} assessmentKey={data.assessment?.assessment_key} /></details>
                </>}
              </article>)}
            </div>
            {!loading && !data.rows?.length && <div className={styles.directoryEmpty}><FaUsers /><strong>No matching learners</strong><span>Clear the search or choose a broader reporting window.</span></div>}
            <div className={styles.directoryPagination}>
              <span>{start}-{end} of {number(data.totalCount)}</span>
              <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div>
            </div>
          </section>}
        </>}
      </div>}
    </aside>
  </div>
}

function activityDate(value, bucket) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en', bucket === 'month'
    ? { month: 'short', year: 'numeric' }
    : { month: 'short', day: 'numeric' }).format(date)
}

function AssessmentActivity({ rows = [], summary = {}, bucket = 'week' }) {
  const series = [
    ['first_attempts', 'First attempts', 'first', FaCheckCircle],
    ['retakes', 'Retakes', 'retake', FaRedo],
    ['unique_learners', 'Unique learners', 'learner', FaUsers],
    ['worksheet_submissions', 'Worksheets', 'worksheet', FaFilePdf],
  ]
  const maximum = Math.max(1, ...rows.flatMap((row) => series.map(([key]) => number(row[key]))))
  const totalActivity = number(summary.first_attempts) + number(summary.retakes) + number(summary.worksheet_submissions)

  return <section className={styles.assessmentActivityCard}>
    <div className={styles.enrollmentCardHeader}>
      <div><span>Participation</span><h3>Assessment activity</h3></div>
      <span>{totalActivity} completed {totalActivity === 1 ? 'activity' : 'activities'}</span>
    </div>
    <p className={styles.assessmentActivityIntro}>A simple view of when learners completed their first attempts, returned for retakes, or submitted worksheets.</p>
    <div className={styles.assessmentActivityLegend}>
      {series.map(([key, label, tone, Icon]) => <article key={key}>
        <i className={styles[`assessmentActivityTone${tone}`]}><Icon /></i>
        <span><small>{label}</small><strong>{number(summary[key])}</strong></span>
      </article>)}
    </div>
    {totalActivity ? <div className={styles.assessmentActivityScroll}>
      <div className={styles.assessmentActivityChart} role="img" aria-label="Assessment activity over the selected reporting period">
        {rows.map((row) => <div className={styles.assessmentActivityBucket} key={row.bucket_start}>
          <div className={styles.assessmentActivityBars}>
            {series.map(([key, label, tone]) => {
              const value = number(row[key])
              return <span key={key} title={`${activityDate(row.bucket_start, bucket)} · ${label}: ${value}`}>
                <strong>{value}</strong>
                <i className={styles[`assessmentActivityTone${tone}`]} style={{ height: value ? `${Math.max(9, value / maximum * 100)}%` : 0 }} />
              </span>
            })}
          </div>
          <time dateTime={row.bucket_start}>{activityDate(row.bucket_start, bucket)}</time>
        </div>)}
      </div>
    </div> : <div className={styles.enrollmentEmptyCompact}><FaChartLine /><span>No assessment activity in this reporting window.</span></div>}
  </section>
}

export default function AssessmentResultsDashboard() {
  const [lens, setLens] = useState('learner')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) { setSearch(next); setPage(1) }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [search, searchInput])

  const query = useMemo(() => new URLSearchParams({ lens, search, ...filters, page: String(page) }).toString(), [filters, lens, page, search])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    fetch(`/api/admin/users/assessment-results?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load assessment results.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query])

  if (loading && !data) return <AdminDashboardLoading label="Loading assessment results" />

  const summary = data?.summary || {}
  const activitySummary = data?.activitySummary || {}
  const rangeLabel = RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1] || 'Selected period'
  const courseOptions = [['all', 'All courses'], ...(data?.courses || []).map((course) => [course.course_id, course.course_title])]
  const start = data?.totalCount ? (page - 1) * number(filters.pageSize) + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.rows?.length || 0) - 1)
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])
  const updateFilter = (event) => { setPage(1); setFilters((current) => ({ ...current, [event.target.name]: event.target.value })) }
  const metrics = [
    ['Learners', summary.learners, 'With assessment activity', FaUserGraduate],
    ['Assessments', summary.assessments, 'With results in view', FaClipboardCheck],
    ['Scored attempts', summary.scored_attempts, 'Every attempt preserved', FaCheckCircle],
    ['Worksheet PDFs', summary.worksheet_submissions, 'Scoreless submissions', FaFilePdf],
    ['Retakes', summary.retakes, 'Attempts after the first', FaRedo],
    ['First attempts', activitySummary.first_attempts, 'A learner’s first completion', FaChartLine],
  ]

  return <div className={styles.assessmentDashboard} aria-busy={loading}>
    {loading && data && <AdminDashboardUpdate label="Updating assessment results" />}
    <div className={styles.enrollmentRangeBar}>
      <div><span>Reporting window</span><p>Filters attempts and worksheet submissions by completion date. Historical attempts remain available under All time.</p></div>
      <div className={styles.enrollmentRangeOptions}>{RANGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={filters.range === value ? styles.enrollmentRangeActive : styles.enrollmentRangeOption} onClick={() => { setPage(1); setFilters((current) => ({ ...current, range: value })) }}>{label}</button>)}</div>
    </div>

    <div className={styles.assessmentMetricGrid}>{metrics.map(([label, value, detail, Icon], index) => <article key={label} style={{ '--assessment-delay': `${index * 45}ms` }}><span><Icon /></span><div><small>{label}</small><strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong><p>{detail}</p></div></article>)}</div>

    <AssessmentActivity rows={data?.activityTimeline || []} summary={activitySummary} bucket={data?.activityBucket || 'week'} />

    <section className={styles.assessmentDirectorySection}>
      <div className={styles.enrollmentSectionHeading}><div><span>Result directory</span><h3>{lens === 'learner' ? 'Learner assessment records' : 'Assessment performance records'}</h3></div><p>{lens === 'learner' ? 'Open a learner to review every assessment and retake.' : 'Open an assessment to compare learners and their full attempt histories.'}</p></div>
      <div className={styles.assessmentLensSwitch} role="group" aria-label="Assessment result view">
        <button type="button" className={lens === 'learner' ? styles.assessmentLensActive : ''} onClick={() => { setLens('learner'); setPage(1); setSearchInput(''); setSearch('') }}><FaUsers /> By learner</button>
        <button type="button" className={lens === 'assessment' ? styles.assessmentLensActive : ''} onClick={() => { setLens('assessment'); setPage(1); setSearchInput(''); setSearch('') }}><FaClipboardCheck /> By assessment</button>
      </div>
      <div className={styles.assessmentToolbar}>
        <label className={styles.directorySearch}><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={lens === 'learner' ? 'Search learner or email' : 'Search assessment, module, or course'} />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
        <div><Select label="Course" name="course" value={filters.course} options={courseOptions} onChange={updateFilter} /><Select label="Result type" name="kind" value={filters.kind} options={KIND_OPTIONS} onChange={updateFilter} /><Select label="Sort" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} /></div>
        <span>{loading ? 'Updating records...' : `${number(data?.totalCount)} matching ${lens === 'learner' ? 'learners' : 'assessments'}`}{hasFilters && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); setFilters(initialFilters) }}>Reset filters</button>}</span>
      </div>

      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Assessment results unavailable</strong><span>{error}</span></div></div>}
      {!loading && !error && !data?.rows?.length && <div className={styles.directoryEmpty}><FaClipboardCheck /><strong>No matching assessment activity</strong><span>Try All time, another course, or reset the filters.</span></div>}

      <div className={`${styles.assessmentTable} ${loading ? styles.assessmentTableUpdating : ''}`}>
        <div className={lens === 'learner' ? styles.assessmentLearnerHeader : styles.assessmentRecordHeader}>
          {lens === 'learner' ? <><span>Learner</span><span>Assessments</span><span>Attempts</span><span>Worksheets</span><span>Normalized average</span><span>Last activity</span><span>Open</span></> : <><span>Assessment</span><span>Type</span><span>Learners</span><span>Attempts</span><span>Normalized average</span><span>Last activity</span><span>Open</span></>}
        </div>
        {(data?.rows || []).map((row, index) => lens === 'learner' ? <article className={styles.assessmentLearnerRow} style={{ '--assessment-delay': `${index * 28}ms` }} key={row.user_id}>
          <span className={styles.assessmentIdentity}><i className={styles.userAvatar}>{initials(row)}</i><span><strong>{learnerName(row)}</strong><small>{row.email}</small></span></span>
          <span className={styles.assessmentNumeric}><strong>{number(row.assessment_count)}</strong><small>unique</small></span>
          <span className={styles.assessmentNumeric}><strong>{number(row.scored_attempts)}</strong><small>{number(row.retakes)} retakes</small></span>
          <span className={styles.assessmentNumeric}><strong>{number(row.worksheet_submissions)}</strong><small>PDF records</small></span>
          <Score value={row.average_latest_score} compact />
          <span className={styles.assessmentDate}><strong>{formatDate(row.last_activity_at, true)}</strong><small>{row.email_verified ? 'Verified account' : 'Verification pending'}</small></span>
          <button type="button" className={styles.videoOpenButton} onClick={() => setSelection({ type: 'learner', id: row.user_id, row })} aria-label={`Open assessment history for ${learnerName(row)}`}><FaEye /></button>
        </article> : <article className={styles.assessmentRecordRow} style={{ '--assessment-delay': `${index * 28}ms` }} key={`${row.kind}-${row.lesson_id || row.assessment_key || 'assessment'}-${index}`}>
          <span className={styles.assessmentIdentity}><i className={row.kind === 'worksheet' ? styles.assessmentKindWorksheet : styles.assessmentKindScored}>{row.kind === 'worksheet' ? <FaFilePdf /> : <FaClipboardCheck />}</i><span><strong>{row.lesson_title}</strong><small>{row.course_title} · {row.module_title}</small></span></span>
          <span><span className={styles.enrollmentPill}>{row.kind === 'worksheet' ? 'Worksheet' : 'Scored'}</span></span>
          <span className={styles.assessmentNumeric}><strong>{number(row.learner_count)}</strong><small>learners</small></span>
          <span className={styles.assessmentNumeric}><strong>{number(row.scored_attempts || row.worksheet_submissions)}</strong><small>{number(row.retakes)} retakes</small></span>
          <Score value={row.average_latest_score} compact />
          <span className={styles.assessmentDate}><strong>{formatDate(row.last_activity_at, true)}</strong><small>{row.kind === 'worksheet' ? 'Latest submission' : `${number(row.lowest_latest_score)}–${number(row.highest_latest_score)}% normalized range`}</small></span>
          <button type="button" className={styles.videoOpenButton} onClick={() => setSelection({ type: 'assessment', id: row.lesson_id, row })} aria-label={`Open learner results for ${row.lesson_title}`}><FaEye /></button>
        </article>)}
      </div>

      <div className={styles.directoryPagination}>
        <label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label>
        <span>{start}-{end} of {number(data?.totalCount).toLocaleString()}</span>
        <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data?.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div>
      </div>
    </section>

    <div className={styles.assessmentMethodNote}><FaBookOpen /><p><strong>How scores are reported:</strong> numeric assessments are normalized to a percentage so different scoring models can be compared. Full attempt history keeps the original points and result label. Worksheet answers stay private; only the generated PDF is opened when an admin requests it.</p></div>
    {selection && <AssessmentDetailDrawer selection={selection} range={filters.range} onClose={() => setSelection(null)} />}
  </div>
}
