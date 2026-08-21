'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaCalendarAlt,
  FaChartLine,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaExclamationTriangle,
  FaEye,
  FaLayerGroup,
  FaQuestion,
  FaSearch,
  FaSignal,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const RANGE_OPTIONS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months']]
const PUBLICATION_OPTIONS = [['all', 'All publication states'], ['published', 'Published'], ['draft', 'Draft']]
const HEALTH_OPTIONS = [['all', 'All course states'], ['healthy', 'On track'], ['early_data', 'Early insights'], ['needs_attention', 'Follow-up may help'], ['no_learners', 'No learners']]
const SORT_OPTIONS = [['learners', 'Most learners'], ['progress', 'Highest progress'], ['completion', 'Highest completion'], ['activity', 'Latest activity'], ['newest', 'Newest course'], ['name', 'Course name']]
const LEARNER_STATUS_OPTIONS = [['all', 'All journey states'], ['not_started', 'Not started'], ['in_progress', 'In progress'], ['completed', 'Completed'], ['at_risk', 'Needs re-engagement']]
const LEARNER_SORT_OPTIONS = [['activity', 'Latest activity'], ['progress_high', 'Highest progress'], ['progress_low', 'Lowest progress'], ['enrolled', 'Newest enrollment'], ['completed', 'Latest completion'], ['name', 'Learner name']]
const initialFilters = { publication: 'all', health: 'all', range: '30', sort: 'learners' }
const initialLearnerFilters = { status: 'all', sort: 'activity', pageSize: '25' }

const healthDetails = {
  healthy: {
    label: 'On track',
    tone: 'success',
    icon: FaCheckCircle,
    description: 'Learners show active progress, with no meaningful pattern of stalled or overdue journeys in the selected time window.',
  },
  early_data: {
    label: 'Early insights',
    tone: 'blue',
    icon: FaChartLine,
    description: 'The course has fewer than three enrolled learners. More learner activity is needed before assigning a reliable health status.',
  },
  needs_attention: {
    label: 'Follow-up may help',
    tone: 'yellow',
    icon: FaExclamationTriangle,
    description: 'A meaningful share of eligible learners appears stalled or overdue. Review their journeys to decide whether re-engagement is useful.',
  },
  no_learners: {
    label: 'No learners yet',
    tone: 'neutral',
    icon: FaUserGraduate,
    description: 'No learners are currently enrolled, so course health cannot be evaluated yet.',
  },
}

const journeyDetails = {
  completed: { label: 'Completed', tone: 'success' },
  in_progress: { label: 'In progress', tone: 'blue' },
  not_started: { label: 'Not started', tone: 'neutral' },
}

function number(value) { return Number(value || 0) }
function time(value) { return value ? new Date(value).getTime() : 0 }

function moduleInsight(course) {
  const signal = course?.module_signal
  if (!signal) return { label: 'Module health', title: 'Module insight unavailable', value: '—' }
  const attentionLearners = number(signal.attention_learners)
  const eligibleLearners = number(signal.eligible_learners)
  const learnerCount = (value) => `${value} ${value === 1 ? 'learner' : 'learners'}`

  if (signal.attention_status === 'needs_attention') {
    return {
      label: 'Follow-up may help',
      title: signal.module_title || 'Module activity',
      value: learnerCount(attentionLearners),
    }
  }

  if (signal.attention_status === 'early_data') {
    return {
      label: 'Early activity',
      title: signal.module_title || 'Learning has started',
      value: learnerCount(eligibleLearners),
    }
  }

  if (signal.attention_status === 'normal') {
    return {
      label: 'Module activity',
      title: 'Learners are progressing',
      value: 'On track',
    }
  }

  return {
    label: 'Module health',
    title: signal.attention_status === 'no_learners' ? 'No learner data yet' : 'Learning has not started',
    value: '—',
  }
}

function formatDate(value, withTime = false) {
  if (!value) return 'No activity yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date)
}

function formatTrendDate(value, range) {
  const date = new Date(value)
  return range === '365'
    ? date.toLocaleDateString('en', { month: 'short' })
    : date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

function learnerName(row) {
  return [row?.first_name, row?.last_name].filter(Boolean).join(' ').trim() || row?.email?.split('@')[0] || 'Unnamed account'
}

function initials(row) {
  return learnerName(row).split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'U'
}

function AnimatedNumber({ value, suffix = '' }) {
  const target = number(value)
  const [visible, setVisible] = useState(0)
  useEffect(() => {
    let frame
    const startedAt = performance.now()
    const update = (now) => {
      const progress = Math.min(1, (now - startedAt) / 620)
      setVisible(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return <>{visible.toLocaleString()}{suffix}</>
}

function Select({ label, name, value, options, onChange }) {
  return <label className={styles.enrollmentSelectLabel}><span>{label}</span><span className={styles.enrollmentSelectShell}><select name={name} value={value} onChange={onChange}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select><FaChevronDown /></span></label>
}

function Pill({ detail }) {
  const safe = detail || healthDetails.no_learners
  return <span className={`${styles.enrollmentPill} ${styles[`enrollmentPill${safe.tone}`]}`}>{safe.label}</span>
}

function CourseHealthStatus({ status }) {
  const detail = healthDetails[status] || healthDetails.no_learners
  const Icon = detail.icon
  const tooltipId = `course-health-${status}-${useId()}`

  return <div className={`${styles.courseHealthStatus} ${styles[`courseHealthStatus${detail.tone}`]}`}>
    <span className={styles.courseHealthStateIcon} aria-hidden="true"><Icon /></span>
    <strong>{detail.label}</strong>
    <button type="button" className={styles.courseHealthHelp} aria-label={`What ${detail.label} means`} aria-describedby={tooltipId}>
      <FaQuestion aria-hidden="true" />
    </button>
    <span className={styles.courseHealthTooltip} id={tooltipId} role="tooltip">
      <b>{detail.label}</b>
      <span>{detail.description}</span>
    </span>
  </div>
}

function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, number(value)))
  return <span className={styles.courseProgressTrack} aria-label={`${safe}% complete`}><i style={{ width: `${safe}%` }} /></span>
}

function TrendChart({ rows, valueKey, range, emptyText }) {
  const max = Math.max(1, ...rows.map((row) => number(row[valueKey])))
  if (!rows.length) return <div className={styles.enrollmentEmptyCompact}><FaCalendarAlt /><span>{emptyText}</span></div>
  return <div className={styles.courseTrend}>{rows.map((row) => <div className={styles.courseTrendItem} key={row.bucket}><span>{row[valueKey]}</span><div><i style={{ height: `${Math.max(7, (number(row[valueKey]) / max) * 100)}%` }} /></div><small>{formatTrendDate(row.bucket, range)}</small></div>)}</div>
}

function Heatmap({ values }) {
  const valueByDate = new Map(values.map((item) => [item.activity_date, item]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Array.from({ length: 84 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (83 - index))
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return { key, date, ...(valueByDate.get(key) || { signals: 0, learners: 0 }) }
  })
  const max = Math.max(1, ...days.map((day) => number(day.signals)))
  const level = (signals) => signals <= 0 ? 0 : Math.min(4, Math.ceil((number(signals) / max) * 4))
  return <div className={styles.courseHeatmapWrap}><div className={styles.courseHeatmap} role="img" aria-label="Recorded learning activity over the last 12 weeks">{days.map((day) => <span className={styles[`courseHeatLevel${level(day.signals)}`]} key={day.key} title={`${day.date.toLocaleDateString('en', { dateStyle: 'medium' })}: ${day.signals} activity signals from ${day.learners} learners`} />)}</div><div className={styles.courseHeatLegend}><span>12 weeks ago</span><span>Less <i /><i className={styles.courseHeatLevel2} /><i className={styles.courseHeatLevel3} /><i className={styles.courseHeatLevel4} /> More</span><span>Today</span></div></div>
}

function CourseAnalysisModal({ courseId, range, onClose }) {
  const closeButton = useRef(null)
  const [openedAt] = useState(() => Date.now())
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialLearnerFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) { setSearch(next); setPage(1) }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [searchInput, search])

  const query = useMemo(() => new URLSearchParams({ search, ...filters, range, page: String(page) }).toString(), [filters, page, range, search])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    fetch(`/api/admin/users/course-performance/${courseId}?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load course analysis.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [courseId, query])

  const summary = data?.summary || {}
  const course = data?.course || {}
  const start = data?.totalCount ? (page - 1) * number(filters.pageSize) + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.learners?.length || 0) - 1)
  const updateFilter = (event) => { setPage(1); setFilters((current) => ({ ...current, [event.target.name]: event.target.value })) }
  const hasFilters = searchInput || filters.status !== 'all' || filters.sort !== 'activity' || filters.pageSize !== '25'

  return <div className={`${styles.drawerLayer} ${styles.courseModalLayer}`} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className={`${styles.userDrawer} ${styles.courseModal}`} role="dialog" aria-modal="true" aria-labelledby="course-analysis-title">
      <header className={styles.courseModalHeader}>
        <div><span>Course performance</span><h3 id="course-analysis-title">{course.title || 'Course analysis'}</h3>{course.slug && <small>/{course.slug}</small>}</div>
        <div className={styles.courseModalHeaderActions}>{course.is_published !== undefined && <span className={`${styles.enrollmentPill} ${course.is_published ? styles.enrollmentPillsuccess : styles.enrollmentPillneutral}`}>{course.is_published ? 'Published' : 'Draft'}</span>}<button ref={closeButton} type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close course analysis"><FaTimes /></button></div>
      </header>

      {loading && data && <AdminDashboardUpdate label="Updating course analysis" />}
      {!data && loading && <div className={styles.courseModalLoading}>{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>}
      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Course analysis unavailable</strong><span>{error}</span></div></div>}
      {data && <div className={loading ? styles.courseModalContentUpdating : styles.courseModalContent}>
        <div className={styles.courseDetailMetrics}>
          <article><span><FaUsers /></span><div><strong>{summary.enrolled_learners}</strong><small>Enrolled learners</small></div></article>
          <article><span><FaChartLine /></span><div><strong>{summary.average_progress}%</strong><small>Average progress</small></div></article>
          <article><span><FaCheckCircle /></span><div><strong>{summary.completion_rate}%</strong><small>Completion rate</small></div></article>
          <article><span><FaSignal /></span><div><strong>{summary.active_learners}</strong><small>Active in {RANGE_OPTIONS.find(([value]) => value === range)?.[1]}</small></div></article>
          <article><span><FaClock /></span><div><strong>{summary.at_risk}</strong><small>Needs re-engagement</small></div></article>
        </div>

        <div className={styles.courseDetailInsights}>
          <section className={styles.courseDetailCard}><div className={styles.enrollmentCardHeader}><div><span>Engagement calendar</span><h3>Recorded learning activity</h3></div><span>Last 12 weeks</span></div><Heatmap values={data.activityCalendar || []} /><p>Each cell reflects stored lesson activity signals, not every click or playback event.</p></section>
          <section className={styles.courseDetailCard}><div className={styles.enrollmentCardHeader}><div><span>Course outcomes</span><h3>Journey completions</h3></div><span>{RANGE_OPTIONS.find(([value]) => value === range)?.[1]}</span></div><TrendChart rows={data.completionTrend || []} valueKey="completions" range={range} emptyText="No completed journeys in this window." /></section>
        </div>

        <section className={styles.courseDetailCard}>
          <div className={styles.courseDetailSectionHeading}><div><span>Curriculum health</span><h3>Module progression</h3></div><p>{data.curriculum.modules} modules · {data.curriculum.lessons} lessons</p></div>
          {data.modules.length ? <div className={styles.courseModuleTable}>
            <div className={styles.courseModuleHeader}><span>Module</span><span>Average</span><span>Reached</span><span>Completed</span></div>
            {data.modules.map((module) => <article key={module.module_id}><span className={styles.courseModuleIdentity}><i>{String(number(module.display_order)).padStart(2, '0')}</i><span><strong>{module.module_title}</strong><small>{module.total_lessons} lessons</small></span></span><span className={styles.courseModuleAverage}><ProgressBar value={module.average_progress} /><strong>{module.average_progress}%</strong></span><span><strong>{module.learners_reached}</strong><small>of {module.enrolled_learners}</small></span><span><strong>{module.learners_completed}</strong><small>learners</small></span></article>)}
          </div> : <div className={styles.enrollmentEmptyCompact}><FaLayerGroup /><span>No modules have been created.</span></div>}
        </section>

        <section className={styles.courseLearnersSection}>
          <div className={styles.courseDetailSectionHeading}><div><span>Learner journeys</span><h3>People in this course</h3></div><p>Current progress, course position, and dated learning activity.</p></div>
          <div className={styles.courseLearnerToolbar}>
            <label className={styles.directorySearch}><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search learner or email" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
            <div><Select label="Journey" name="status" value={filters.status} options={LEARNER_STATUS_OPTIONS} onChange={updateFilter} /><Select label="Sort" name="sort" value={filters.sort} options={LEARNER_SORT_OPTIONS} onChange={updateFilter} /></div>
            <span>{loading ? 'Updating learners...' : `${number(data.totalCount).toLocaleString()} matching learners`}{hasFilters && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setFilters(initialLearnerFilters); setPage(1) }}>Reset</button>}</span>
          </div>

          <div className={styles.courseLearnerTable}>
            <div className={styles.courseLearnerHeader}><span>Learner</span><span>Progress</span><span>Current position</span><span>Journey</span><span>Dates</span></div>
            {!data.learners.length && !loading ? <div className={styles.directoryEmpty}><FaUserGraduate /><strong>No matching learners</strong><span>Try a broader search or reset the filters.</span></div> : <div>{data.learners.map((learner, index) => <article style={{ '--row-delay': `${index * 28}ms` }} key={learner.enrollment_id}>
              <span className={styles.directoryIdentity}><span className={styles.directoryAvatar}>{initials(learner)}</span><span><strong>{learnerName(learner)}</strong><small>{learner.email}</small></span></span>
              <span className={styles.courseLearnerProgress}><span><ProgressBar value={learner.progress_percent} /><strong>{learner.progress_percent}%</strong></span><small>{learner.completed_lessons} of {learner.total_lessons} complete</small></span>
              <span className={styles.courseLearnerPosition}><strong>{learner.current_module_title || 'Not started'}</strong><small>{learner.started_lessons ? `${learner.started_lessons} lessons opened` : 'No learning activity'}</small></span>
              <span className={styles.courseLearnerState}><Pill detail={journeyDetails[learner.journey_status]} />{learner.journey_status === 'in_progress' && learner.last_activity_at && time(learner.last_activity_at) < openedAt - number(range) * 86400000 && <small>Re-engagement suggested</small>}</span>
              <span className={styles.directoryDate}><strong>{formatDate(learner.last_activity_at, true)}</strong><small>Enrolled {formatDate(learner.enrolled_at)}</small></span>
            </article>)}</div>}
          </div>

          <div className={styles.directoryPagination}><label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label><span>{start}-{end} of {number(data.totalCount).toLocaleString()}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div></div>
        </section>
      </div>}
    </section>
  </div>
}

export default function CoursePerformanceDashboard() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCourseId, setSelectedCourseId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) setSearch(next)
    }, 320)
    return () => window.clearTimeout(timer)
  }, [searchInput, search])

  const query = useMemo(() => new URLSearchParams({ search, ...filters }).toString(), [filters, search])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    fetch(`/api/admin/users/course-performance?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load course performance.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query])

  const summary = data?.summary || {}
  const updateFilter = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])
  const rangeLabel = RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1]
  const metrics = [
    { label: 'Courses in view', value: summary.courses, detail: `${number(summary.published)} published`, icon: FaBookOpen, tone: 'blue' },
    { label: 'Course enrollments', value: summary.enrollments, detail: 'Active learner-course access', icon: FaUsers, tone: 'slate' },
    { label: 'Portfolio progress', value: summary.average_progress, suffix: '%', detail: 'Weighted by enrolled learners', icon: FaChartLine, tone: 'blue' },
    { label: 'Needs re-engagement', value: summary.at_risk, detail: `${number(summary.active_learners)} active course journeys in ${rangeLabel}`, icon: FaClock, tone: 'yellow' },
  ]

  if (loading && !data) return <AdminDashboardLoading label="Loading course performance" />

  return <div className={styles.coursePerformanceDashboard} aria-busy={loading}>
    {loading && data && <AdminDashboardUpdate label="Updating course performance" />}
    <div className={styles.enrollmentRangeBar}><div><span>Performance window</span><p>Controls activity, re-engagement, and trend insights. Lifetime progress remains current.</p></div><div className={styles.enrollmentRangeOptions}>{RANGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={filters.range === value ? styles.enrollmentRangeActive : styles.enrollmentRangeOption} onClick={() => setFilters((current) => ({ ...current, range: value }))}>{label}</button>)}</div></div>

    <div className={styles.enrollmentMetricGrid}>{metrics.map((metric, index) => { const Icon = metric.icon; return <article className={`${styles.enrollmentMetricCard} ${styles[`enrollmentMetric${metric.tone}`]}`} style={{ '--metric-delay': `${index * 70}ms` }} key={metric.label}><span className={styles.enrollmentMetricIcon}><Icon /></span><div><span>{metric.label}</span><strong><AnimatedNumber value={metric.value} suffix={metric.suffix} /></strong><small>{metric.detail}</small></div></article> })}</div>

    <div className={styles.coursePortfolioInsights}>
      <section className={styles.enrollmentInsightCard}><div className={styles.enrollmentCardHeader}><div><span>Demand</span><h3>New course enrollments</h3></div><span>{rangeLabel}</span></div><TrendChart rows={data?.enrollmentTrend || []} valueKey="enrollments" range={filters.range} emptyText="No new enrollments in this window." /></section>
      <section className={styles.enrollmentInsightCard}><div className={styles.enrollmentCardHeader}><div><span>Engagement</span><h3>Recorded activity signals</h3></div><span>{rangeLabel}</span></div><TrendChart rows={data?.activityTrend || []} valueKey="activity_signals" range={filters.range} emptyText="No recorded learning activity in this window." /></section>
    </div>

    <section className={styles.coursePortfolioSection}>
      <div className={styles.enrollmentSectionHeading}><div><span>Course portfolio</span><h3>Performance by course</h3></div><p>Each course appears once. Open it for module health, learner journeys, and dated activity.</p></div>
      <div className={styles.coursePortfolioToolbar}>
        <label className={styles.directorySearch}><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search course, path, or tutor" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
        <div><Select label="Publication" name="publication" value={filters.publication} options={PUBLICATION_OPTIONS} onChange={updateFilter} /><Select label="Health" name="health" value={filters.health} options={HEALTH_OPTIONS} onChange={updateFilter} /><Select label="Sort" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} /></div>
        <span>{loading ? 'Updating course portfolio...' : `${number(summary.courses)} matching courses`}{hasFilters && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setFilters(initialFilters) }}>Reset filters</button>}</span>
      </div>

      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Course performance unavailable</strong><span>{error}</span></div></div>}
      {loading && !data ? <div className={styles.courseCardSkeleton}>{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div> : null}
      {!loading && !error && !data?.courses?.length ? <div className={styles.directoryEmpty}><FaBookOpen /><strong>No matching courses</strong><span>Try a broader search or reset the filters.</span></div> : null}
      <div className={loading ? styles.courseCardsUpdating : styles.courseCards}>{(data?.courses || []).map((course, index) => {
        const total = Math.max(1, number(course.enrolled_learners))
        const insight = moduleInsight(course)
        return <article className={styles.coursePerformanceCard} style={{ '--card-delay': `${index * 60}ms` }} key={course.course_id}>
          <header><div><span className={styles.courseNumber}>{String(index + 1).padStart(2, '0')}</span><span className={`${styles.enrollmentPill} ${course.is_published ? styles.enrollmentPillsuccess : styles.enrollmentPillneutral}`}>{course.is_published ? 'Published' : 'Draft'}</span></div><CourseHealthStatus status={course.health_status} /></header>
          <div className={styles.courseCardTitle}><span>/{course.slug}</span><h4>{course.title}</h4><small>{course.total_modules} modules · {course.total_lessons} lessons · created {formatDate(course.created_at)}</small></div>
          <div className={styles.courseCardProgress}><div className={styles.courseProgressRing} style={{ '--course-progress': `${course.average_progress}%` }}><span><strong>{course.average_progress}%</strong><small>average</small></span></div><dl><div><dt>Enrolled</dt><dd>{course.enrolled_learners}</dd></div><div><dt>Active</dt><dd>{course.active_learners}</dd></div><div><dt>Completed</dt><dd>{course.completed}</dd></div><div><dt>At risk</dt><dd>{course.at_risk}</dd></div></dl></div>
          <div className={styles.courseStateDistribution}><span><i className={styles.courseStateComplete} style={{ width: `${number(course.completed) / total * 100}%` }} /><i className={styles.courseStateProgress} style={{ width: `${number(course.in_progress) / total * 100}%` }} /><i className={styles.courseStateNotStarted} style={{ width: `${number(course.not_started) / total * 100}%` }} /></span><div><small><i className={styles.courseStateComplete} />{course.completed} complete</small><small><i className={styles.courseStateProgress} />{course.in_progress} learning</small><small><i className={styles.courseStateNotStarted} />{course.not_started} not started</small></div></div>
          <div className={styles.courseAttention}><span><FaLayerGroup /></span><div><small>{insight.label}</small><strong>{insight.title}</strong></div><b>{insight.value}</b></div>
          <footer><span><FaClock /> Last activity {formatDate(course.last_activity_at, true)}</span><button type="button" onClick={() => setSelectedCourseId(course.course_id)}>Open course analysis <FaEye /></button></footer>
        </article>
      })}</div>
    </section>

    {selectedCourseId && <CourseAnalysisModal courseId={selectedCourseId} range={filters.range} onClose={() => setSelectedCourseId(null)} />}
  </div>
}
