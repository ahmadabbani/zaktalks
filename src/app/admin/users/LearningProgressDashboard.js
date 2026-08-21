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
  FaExclamationTriangle,
  FaEye,
  FaLayerGroup,
  FaPlay,
  FaSearch,
  FaTimes,
  FaUserGraduate,
  FaUsers,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const RANGE_OPTIONS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months']]
const STATUS_OPTIONS = [['all', 'All journey states'], ['not_started', 'Not started'], ['in_progress', 'In progress'], ['completed', 'Completed']]
const ACTIVITY_OPTIONS = [['all', 'All activity'], ['active', 'Active in window'], ['inactive', 'Inactive in window'], ['never', 'Never started']]
const SORT_OPTIONS = [['activity', 'Latest activity'], ['progress_high', 'Highest progress'], ['progress_low', 'Lowest progress'], ['newest', 'Newest enrollment'], ['name', 'Learner name'], ['course', 'Course name']]
const initialFilters = { status: 'all', activity: 'all', course: 'all', range: '30', sort: 'activity', pageSize: '25' }

function number(value) { return Number(value || 0) }

function formatDate(value, withTime = false) {
  if (!value) return 'No learning activity'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(date)
}

function formatTrendDate(value, range) {
  const date = new Date(value)
  if (range === '365') return date.toLocaleDateString('en', { month: 'short' })
  return date.toLocaleDateString('en', { day: 'numeric', month: 'short' })
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
    const start = performance.now()
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / 620)
      setVisible(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return <>{visible.toLocaleString()}{suffix}</>
}

function ProgressBar({ value, label = true }) {
  const safeValue = Math.max(0, Math.min(100, number(value)))
  return (
    <span className={styles.learningProgressTrack} aria-label={`${safeValue}% complete`}>
      <i style={{ width: `${safeValue}%` }} />
      {label && <strong>{safeValue}%</strong>}
    </span>
  )
}

function Select({ label, name, value, options, onChange }) {
  return (
    <label className={styles.enrollmentSelectLabel}>
      <span>{label}</span>
      <span className={styles.enrollmentSelectShell}>
        <select name={name} value={value} onChange={onChange}>
          {options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
        </select>
        <FaChevronDown aria-hidden="true" />
      </span>
    </label>
  )
}

const stateDetails = {
  not_started: { label: 'Not started', className: 'neutral' },
  in_progress: { label: 'In progress', className: 'blue' },
  completed: { label: 'Completed', className: 'success' },
  started: { label: 'In progress', className: 'blue' },
}

function StatePill({ status }) {
  const state = stateDetails[status] || stateDetails.not_started
  return <span className={`${styles.enrollmentPill} ${styles[`enrollmentPill${state.className}`]}`}>{state.label}</span>
}

function ProgressDrawer({ enrollmentId, onClose }) {
  const closeButton = useRef(null)
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [openModule, setOpenModule] = useState(null)

  useEffect(() => {
    closeButton.current?.focus()
    const controller = new AbortController()
    fetch(`/api/admin/users/learning-progress/${enrollmentId}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load learning journey.')
        setDetail(body)
        setOpenModule(body.modules?.find((module) => number(module.progress_percent) < 100)?.module_id || body.modules?.[0]?.module_id || null)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => { controller.abort(); window.removeEventListener('keydown', closeOnEscape) }
  }, [enrollmentId, onClose])

  const journey = detail?.journey || {}
  const overall = detail?.overall || {}
  return (
    <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={`${styles.userDrawer} ${styles.learningDrawer}`} role="dialog" aria-modal="true" aria-labelledby="learning-drawer-title">
        <div className={styles.drawerHeader}>
          <div className={styles.drawerIdentity}>
            <span className={styles.directoryAvatar}>{detail ? initials(journey) : 'LP'}</span>
            <div><span>Learning journey</span><h3 id="learning-drawer-title">{detail ? learnerName(journey) : 'Loading progress'}</h3><a href={journey.email ? `mailto:${journey.email}` : undefined}>{journey.email || 'Retrieving learner record'}</a></div>
          </div>
          <button ref={closeButton} type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close learning journey"><FaTimes /></button>
        </div>

        {!detail && !error && <div className={styles.drawerLoading}><span /><span /></div>}
        {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Journey unavailable</strong><span>{error}</span></div></div>}
        {detail && (
          <div className={styles.drawerContent}>
            <section className={styles.learningDrawerHero}>
              <div><span>Course</span><h4>{journey.course_title}</h4><small>Enrolled {formatDate(journey.enrolled_at)}</small></div>
              <strong>{number(overall.progress_percent)}%</strong>
              <ProgressBar value={overall.progress_percent} label={false} />
            </section>

            <div className={styles.learningDrawerStats}>
              <div><strong>{number(overall.completed_lessons)}</strong><span>Completed</span></div>
              <div><strong>{number(overall.started_lessons)}</strong><span>Started</span></div>
              <div><strong>{number(overall.total_lessons)}</strong><span>Total lessons</span></div>
            </div>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}><FaLayerGroup /><h4>Module progress</h4><span>{detail.modules.length}</span></div>
              <div className={styles.learningModules}>
                {detail.modules.map((module) => {
                  const isOpen = openModule === module.module_id
                  return (
                    <article className={styles.learningModule} key={module.module_id}>
                      <button type="button" onClick={() => setOpenModule(isOpen ? null : module.module_id)} aria-expanded={isOpen}>
                        <span className={styles.learningModuleOrder}>{String(number(module.module_order)).padStart(2, '0')}</span>
                        <span><strong>{module.module_title}</strong><small>{module.completed_lessons} of {module.total_lessons} lessons completed</small></span>
                        <span className={styles.learningModulePercent}>{module.progress_percent}%</span>
                        <FaChevronDown className={isOpen ? styles.learningChevronOpen : ''} />
                      </button>
                      <ProgressBar value={module.progress_percent} label={false} />
                      {isOpen && (
                        <div className={styles.learningLessonList}>
                          {module.lessons.length ? module.lessons.map((lesson) => (
                            <div key={lesson.id}>
                              <span className={`${styles.learningLessonIcon} ${lesson.status === 'completed' ? styles.learningLessonComplete : ''}`}>{lesson.status === 'completed' ? <FaCheck /> : <FaPlay />}</span>
                              <span><strong>{lesson.title}</strong><small>{lesson.type?.replaceAll('_', ' ')} · {formatDate(lesson.last_accessed_at)}</small></span>
                              <StatePill status={lesson.status} />
                            </div>
                          )) : <p className={styles.drawerEmpty}>No lessons in this module.</p>}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}><FaClock /><h4>Recent learning activity</h4></div>
              {detail.recent_activity.length ? <div className={styles.progressTimeline}>{detail.recent_activity.map((item) => (
                <div className={styles.progressTimelineItem} key={`${item.lesson_id}-${item.last_accessed_at}`}>
                  <span className={item.lesson_status === 'completed' ? styles.progressDotComplete : styles.progressDot} />
                  <div><span className={styles.progressTimelineTop}><strong>{item.lesson_title}</strong><time>{formatDate(item.last_accessed_at, true)}</time></span><span>{item.lesson_status === 'completed' ? 'Lesson completed' : 'Learning activity recorded'}</span></div>
                </div>
              ))}</div> : <p className={styles.drawerEmpty}>This learner has not started the course yet.</p>}
            </section>

            <p className={styles.enrollmentScopeNote}>Playback behavior and assessment outcomes remain in their dedicated analytics areas.</p>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function LearningProgressDashboard() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchInput.trim()
      if (next !== search) { setSearch(next); setPage(1) }
    }, 320)
    return () => window.clearTimeout(timer)
  }, [searchInput, search])

  const query = useMemo(() => new URLSearchParams({ search, ...filters, page: String(page) }).toString(), [filters, page, search])
  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    fetch(`/api/admin/users/learning-progress?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load learning progress.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query])

  const summary = data?.summary || {}
  const maxTrend = Math.max(1, ...(data?.trend || []).map((item) => number(item.completions)))
  const courseOptions = [['all', 'All courses'], ...(data?.courses || []).map((course) => [course.id, course.title])]
  const start = data?.totalCount ? (page - 1) * number(filters.pageSize) + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.rows?.length || 0) - 1)
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])
  const updateFilter = (event) => { setPage(1); setFilters((current) => ({ ...current, [event.target.name]: event.target.value })) }
  const reset = () => { setSearchInput(''); setSearch(''); setFilters(initialFilters); setPage(1) }
  const selectedRangeLabel = RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1]
  const metrics = [
    { label: 'Average progress', value: number(summary.average_progress), suffix: '%', detail: 'Across filtered learner journeys', icon: FaUserGraduate, tone: 'blue' },
    { label: 'Active learners', value: number(summary.active_learners), detail: `Learning activity in ${selectedRangeLabel}`, icon: FaPlay, tone: 'slate' },
    { label: 'Completed journeys', value: number(summary.completed), detail: `${number(summary.learners)} unique learners in view`, icon: FaCheckCircle, tone: 'blue' },
    { label: 'Needs a start', value: number(summary.not_started), detail: `${number(summary.in_progress)} currently in progress`, icon: FaClock, tone: 'yellow' },
  ]

  if (loading && !data) return <AdminDashboardLoading label="Loading learning progress" />

  return (
    <div className={styles.learningDashboard} aria-busy={loading}>
      {loading && data && <AdminDashboardUpdate label="Updating learning progress" />}
      <div className={styles.enrollmentRangeBar}>
        <div><span>Activity window</span><p>Controls active-learner and completion-momentum insights. Overall progress remains current.</p></div>
        <div className={styles.enrollmentRangeOptions}>{RANGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={filters.range === value ? styles.enrollmentRangeActive : styles.enrollmentRangeOption} onClick={() => { setPage(1); setFilters((current) => ({ ...current, range: value })) }}>{label}</button>)}</div>
      </div>

      <div className={styles.enrollmentMetricGrid}>{metrics.map((metric, index) => {
        const Icon = metric.icon
        return <article className={`${styles.enrollmentMetricCard} ${styles[`enrollmentMetric${metric.tone}`]}`} style={{ '--metric-delay': `${index * 70}ms` }} key={metric.label}><span className={styles.enrollmentMetricIcon}><Icon /></span><div><span>{metric.label}</span><strong><AnimatedNumber value={metric.value} suffix={metric.suffix} /></strong><small>{metric.detail}</small></div></article>
      })}</div>

      <div className={styles.learningInsightsGrid}>
        <section className={styles.enrollmentInsightCard}>
          <div className={styles.enrollmentCardHeader}><div><span>Learning momentum</span><h3>Lessons completed</h3></div><span>{selectedRangeLabel}</span></div>
          {(data?.trend || []).length ? <div className={styles.learningTrend}>{data.trend.map((item) => <div className={styles.learningTrendItem} key={item.bucket}><span>{item.completions}</span><div><i style={{ height: `${Math.max(7, (number(item.completions) / maxTrend) * 100)}%` }} /></div><small>{formatTrendDate(item.bucket, filters.range)}</small></div>)}</div> : <div className={styles.enrollmentEmptyCompact}><FaCalendarAlt /><span>No lesson completions in this window.</span></div>}
        </section>

        <section className={styles.enrollmentInsightCard}>
          <div className={styles.enrollmentCardHeader}><div><span>Course health</span><h3>Progress by course</h3></div></div>
          {(data?.courseHealth || []).length ? <div className={styles.learningHealthList}>{data.courseHealth.map((course) => <article key={course.course_id}><div><strong>{course.course_title}</strong><span>{course.average_progress}%</span></div><ProgressBar value={course.average_progress} label={false} /><small>{course.completed} complete · {course.in_progress} in progress · {course.not_started} not started</small></article>)}</div> : <div className={styles.enrollmentEmptyCompact}><FaBookOpen /><span>No course progress in this view.</span></div>}
        </section>

        <section className={styles.enrollmentInsightCard}>
          <div className={styles.enrollmentCardHeader}><div><span>Module health</span><h3>Where support may help</h3></div></div>
          {(data?.moduleHealth || []).length ? <div className={styles.learningModuleHealth}>{data.moduleHealth.slice(0, 5).map((module) => <div key={module.module_id}><span className={styles.learningModuleOrder}>{String(number(module.display_order)).padStart(2, '0')}</span><span><strong>{module.module_title}</strong><small>{module.course_title} · {module.learners_started}/{module.learner_journeys} started</small></span><b>{module.average_progress}%</b></div>)}</div> : <div className={styles.enrollmentEmptyCompact}><FaLayerGroup /><span>No module progress in this view.</span></div>}
        </section>
      </div>

      <section className={styles.enrollmentRecordsSection}>
        <div className={styles.enrollmentSectionHeading}><div><span>Learner journeys</span><h3>Progress directory</h3></div><p>Each row is one learner in one course, measured against the full published curriculum.</p></div>
        <div className={styles.enrollmentToolbar}>
          <label className={styles.directorySearch}><span className="sr-only">Search learning progress</span><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search learner, email, or course" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
          <div className={styles.learningFilterGrid}>
            <Select label="Journey" name="status" value={filters.status} options={STATUS_OPTIONS} onChange={updateFilter} />
            <Select label="Activity" name="activity" value={filters.activity} options={ACTIVITY_OPTIONS} onChange={updateFilter} />
            <Select label="Course" name="course" value={filters.course} options={courseOptions} onChange={updateFilter} />
            <Select label="Sort" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} />
          </div>
          <div className={styles.directoryToolbarBottom}><span>{loading ? 'Updating learning journeys...' : `${number(data?.totalCount).toLocaleString()} matching journeys`}</span>{hasFilters && <button type="button" onClick={reset}>Reset filters</button>}</div>
        </div>

        {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Learning progress unavailable</strong><span>{error}</span></div></div>}
        <div className={styles.learningTableShell} aria-busy={loading}>
          <div className={styles.learningTableHeader}><span>Learner</span><span>Course</span><span>Progress</span><span>Journey</span><span>Last activity</span><span className="sr-only">Open</span></div>
          {loading && !data && <div className={styles.enrollmentSkeleton}>{Array.from({ length: 7 }, (_, index) => <span key={index} />)}</div>}
          {!loading && !error && !data?.rows?.length && <div className={styles.directoryEmpty}><FaUserGraduate /><strong>No matching learning journeys</strong><span>Try a broader search or reset the filters.</span></div>}
          <div className={loading ? styles.learningRowsLoading : styles.learningRows}>{(data?.rows || []).map((row, index) => <button type="button" className={styles.learningRow} style={{ '--row-delay': `${index * 30}ms` }} key={row.enrollment_id} onClick={() => setSelectedEnrollmentId(row.enrollment_id)}>
            <span className={styles.directoryIdentity}><span className={styles.directoryAvatar}>{initials(row)}</span><span><strong>{learnerName(row)}</strong><small>{row.email}</small></span></span>
            <span className={styles.enrollmentCourseCell}><strong>{row.course_title}</strong><small>{row.total_lessons} lessons · enrolled {formatDate(row.enrolled_at)}</small></span>
            <span className={styles.learningProgressCell}><ProgressBar value={row.progress_percent} /><small>{row.completed_lessons} of {row.total_lessons} complete</small></span>
            <span className={styles.learningStateCell}><StatePill status={row.progress_status} /><small>{row.started_lessons} lessons opened</small></span>
            <span className={styles.directoryDate}><strong>{formatDate(row.last_activity_at, true)}</strong><small>{row.first_started_at ? `Started ${formatDate(row.first_started_at)}` : 'Course not started'}</small></span>
            <span className={styles.directoryOpen}><FaEye /></span>
          </button>)}</div>
        </div>

        <div className={styles.directoryPagination}><label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label><span>{start}-{end} of {number(data?.totalCount).toLocaleString()}</span><div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data?.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div></div>
      </section>

      {selectedEnrollmentId && <ProgressDrawer enrollmentId={selectedEnrollmentId} onClose={() => setSelectedEnrollmentId(null)} />}
    </div>
  )
}
