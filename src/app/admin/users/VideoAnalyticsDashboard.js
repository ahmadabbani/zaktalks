'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  FaInfoCircle,
  FaPause,
  FaPlayCircle,
  FaSearch,
  FaSignal,
  FaTimes,
  FaUsers,
  FaVideo,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const RANGE_OPTIONS = [['7', '7 days'], ['30', '30 days'], ['90', '90 days'], ['365', '12 months'], ['all', 'All time']]
const ACTIVITY_OPTIONS = [['all', 'All video lessons'], ['active', 'Active viewing'], ['completed', 'All viewers completed'], ['no_activity', 'No activity in window']]
const SORT_OPTIONS = [['activity', 'Latest activity'], ['viewers', 'Most viewers'], ['reach', 'Highest reach'], ['completion', 'Highest completion'], ['curriculum', 'Curriculum order'], ['duration', 'Longest video']]
const DETAIL_STATUS_OPTIONS = [['all', 'All viewers'], ['active_now', 'Active now'], ['resume_ready', 'Resume-ready'], ['paused', 'Paused'], ['completed', 'Completed']]
const DETAIL_SORT_OPTIONS = [['activity', 'Latest activity'], ['reach', 'Highest reach'], ['name', 'Learner name'], ['completed', 'Latest completion']]
const initialFilters = { course: 'all', activity: 'all', range: '30', sort: 'activity', pageSize: '25' }
const initialDetailFilters = { status: 'all', sort: 'activity', pageSize: '25' }

function number(value) { return Number(value || 0) }

function formatDate(value, withTime = false) {
  if (!value) return 'No activity yet'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date)
}

function formatDuration(value, compact = false) {
  const seconds = Math.max(0, Math.round(number(value)))
  if (!seconds) return compact ? '0m' : '0:00'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (compact) return hours ? `${hours}h ${minutes}m` : `${minutes}m ${remainder}s`
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

function formatTrendDate(value, range) {
  const date = new Date(value)
  if (range === '365' || range === 'all') return date.toLocaleDateString('en', { month: 'short', year: '2-digit' })
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

function ProgressBar({ value, unknown = false }) {
  const safe = Math.max(0, Math.min(100, number(value)))
  return <span className={`${styles.videoProgressTrack} ${unknown ? styles.videoProgressUnknown : ''}`} aria-label={unknown ? 'Reach unavailable' : `${safe}% verified reach`}>
    {!unknown && <i style={{ width: `${safe}%` }} />}
  </span>
}

function ViewerStatus({ status }) {
  const details = {
    active_now: ['Active now', 'success'],
    paused: ['Paused', 'yellow'],
    resume_ready: ['Resume-ready', 'blue'],
    completed: ['Completed', 'success'],
    started: ['Started', 'neutral'],
  }
  const [label, tone] = details[status] || details.started
  return <span className={`${styles.enrollmentPill} ${styles[`enrollmentPill${tone}`]}`}>{label}</span>
}

function VideoTrend({ rows, range }) {
  const max = Math.max(1, ...rows.flatMap((row) => [number(row.starts), number(row.completions)]))
  if (!rows.length) return <div className={styles.enrollmentEmptyCompact}><FaCalendarAlt /><span>No starts or completions in this window.</span></div>

  return <div className={styles.videoTrend}>
    {rows.map((row) => <div className={styles.videoTrendItem} key={row.bucket}>
      <span>{number(row.starts) + number(row.completions)}</span>
      <div>
        <i className={styles.videoTrendStarts} style={{ height: `${Math.max(6, number(row.starts) / max * 100)}%` }} title={`${row.starts} starts`} />
        <i className={styles.videoTrendCompletions} style={{ height: `${Math.max(6, number(row.completions) / max * 100)}%` }} title={`${row.completions} completions`} />
      </div>
      <small>{formatTrendDate(row.bucket, range)}</small>
    </div>)}
  </div>
}

function ReachDistribution({ data }) {
  const segments = [
    ['Reached 0–24%', number(data.reach_0_24), 'low'],
    ['Reached 25–49%', number(data.reach_25_49), 'early'],
    ['Reached 50–74%', number(data.reach_50_74), 'middle'],
    ['Reached 75–96%', number(data.reach_75_96), 'near'],
    ['Completed video', number(data.completed), 'complete'],
    ['Reach unavailable', number(data.unknown), 'unknown'],
  ]
  const total = segments.reduce((sum, [, count]) => sum + count, 0)

  if (!total) return <div className={styles.enrollmentEmptyCompact}><FaChartLine /><span>No viewing records in this window.</span></div>

  return <div className={styles.videoReachDistribution}>
    <div className={styles.videoReachGuide}>
      <span><b>Reach range</b> shows how far each viewer progressed.</span>
      <span><b>Segment width</b> shows that group’s share of all viewer records.</span>
    </div>
    <div className={styles.videoReachBar} aria-label="Verified viewer reach distribution">
      {segments.filter(([, count]) => count).map(([label, count, tone]) => <i key={label} className={styles[`videoReach${tone}`]} style={{ width: `${count / total * 100}%` }} title={`${label}: ${count} viewer ${count === 1 ? 'record' : 'records'} (${Math.round(count / total * 100)}% of records)`} />)}
    </div>
    <div className={styles.videoReachLegend}>{segments.map(([label, count, tone]) => <span key={label}><i className={styles[`videoReach${tone}`]} /><span><strong>{label}</strong><small>{count} {count === 1 ? 'record' : 'records'} · {total ? Math.round(count / total * 100) : 0}% of records</small></span></span>)}</div>
  </div>
}

function VideoDetailDrawer({ lessonId, range, onClose }) {
  const closeButton = useRef(null)
  const [filters, setFilters] = useState(initialDetailFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const query = useMemo(() => new URLSearchParams({ ...filters, range, page: String(page) }).toString(), [filters, page, range])

  useEffect(() => {
    closeButton.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => { if (!controller.signal.aborted) { setLoading(true); setError('') } })
    fetch(`/api/admin/users/video-analytics/${lessonId}?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load video details.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [lessonId, query])

  const lesson = data?.lesson || {}
  const summary = data?.summary || {}
  const start = data?.totalCount ? (page - 1) * number(filters.pageSize) + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.rows?.length || 0) - 1)
  const updateFilter = (event) => { setPage(1); setFilters((current) => ({ ...current, [event.target.name]: event.target.value })) }

  return <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className={`${styles.userDrawer} ${styles.videoDrawer}`} role="dialog" aria-modal="true" aria-labelledby="video-drawer-title">
      <header className={styles.videoDrawerHeader}>
        <div><span>Video lesson</span><h3 id="video-drawer-title">{lesson.lesson_title || 'Loading video analytics'}</h3><small>{lesson.course_title ? `${lesson.course_title} · ${lesson.module_title}` : 'Retrieving curriculum details'}</small></div>
        <button ref={closeButton} type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close video details"><FaTimes /></button>
      </header>

      {loading && data && <AdminDashboardUpdate label="Updating video details" />}
      {!data && loading && <div className={styles.videoDrawerLoading}>{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>}
      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Video details unavailable</strong><span>{error}</span></div></div>}

      {data && <div className={loading ? styles.videoDrawerContentUpdating : styles.videoDrawerContent}>
        <div className={styles.videoDrawerSummary}>
          <article><span>Viewers</span><strong>{number(summary.viewers)}</strong></article>
          <article><span>Average reach</span><strong>{number(summary.measurable_viewers) ? `${number(summary.average_reach)}%` : 'N/A'}</strong></article>
          <article><span>Completed</span><strong>{number(summary.completed)}</strong></article>
          <article><span>Resume-ready</span><strong>{number(summary.resume_ready)}</strong></article>
        </div>

        <div className={styles.videoMeasurementNote}>
          <FaInfoCircle />
          <p>{lesson.duration_seconds
            ? `Duration ${formatDuration(lesson.duration_seconds)}. Reach uses the furthest server-verified playback position.`
            : 'Duration is not available for this lesson. Completed viewers remain measurable, while incomplete reach is shown as unavailable.'}</p>
        </div>

        <div className={styles.videoDrawerToolbar}>
          <Select label="Viewer state" name="status" value={filters.status} options={DETAIL_STATUS_OPTIONS} onChange={updateFilter} />
          <Select label="Sort" name="sort" value={filters.sort} options={DETAIL_SORT_OPTIONS} onChange={updateFilter} />
        </div>

        <section className={styles.videoViewerSection}>
          <div className={styles.courseDetailSectionHeading}><div><span>Learner detail</span><h3>Viewer progress</h3></div><p>{number(data.totalCount)} matching records</p></div>
          {!data.rows.length && !loading ? <div className={styles.directoryEmpty}><FaVideo /><strong>No matching viewers</strong><span>Try another viewer-state filter.</span></div> : <div className={styles.videoViewerList}>{data.rows.map((viewer) => <article key={viewer.progress_id}>
            <span className={styles.directoryAvatar}>{initials(viewer)}</span>
            <div className={styles.videoViewerIdentity}><strong>{learnerName(viewer)}</strong><small>{viewer.email}</small><ViewerStatus status={viewer.viewer_status} /></div>
            <div className={styles.videoViewerReach}>
              <span><b>{viewer.reach_percent === null ? 'Reach unavailable' : `${viewer.reach_percent}% reached`}</b><small>{formatDuration(viewer.max_position_reached_seconds)} verified · resume at {formatDuration(viewer.last_position_seconds)}</small></span>
              <ProgressBar value={viewer.reach_percent} unknown={viewer.reach_percent === null} />
            </div>
            <div className={styles.videoViewerDates}><strong>{formatDate(viewer.last_accessed_at, true)}</strong><small>{viewer.completed_at ? `Completed ${formatDate(viewer.completed_at)}` : `Started ${formatDate(viewer.started_at)}`}</small></div>
          </article>)}</div>}
        </section>

        <div className={styles.directoryPagination}>
          <label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label>
          <span>{start}-{end} of {number(data.totalCount)}</span>
          <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div>
        </div>
      </div>}
    </aside>
  </div>
}

export default function VideoAnalyticsDashboard() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedLessonId, setSelectedLessonId] = useState(null)

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
    fetch(`/api/admin/users/video-analytics?${query}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load video analytics.')
        setData(body)
      })
      .catch((requestError) => requestError.name !== 'AbortError' && setError(requestError.message))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [query])

  const summary = data?.summary || {}
  const rangeLabel = RANGE_OPTIONS.find(([value]) => value === filters.range)?.[1]
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])
  const start = data?.totalCount ? (page - 1) * number(filters.pageSize) + 1 : 0
  const end = Math.min(number(data?.totalCount), start + (data?.rows?.length || 0) - 1)
  const updateFilter = (event) => { setPage(1); setFilters((current) => ({ ...current, [event.target.name]: event.target.value })) }
  const courseOptions = [['all', 'All courses'], ...(data?.courses || []).map((course) => [course.course_id, course.course_title])]
  const metrics = [
    { label: 'Video lessons', value: summary.video_lessons, detail: 'Lessons matching the current filters', icon: FaVideo },
    { label: 'Unique viewers', value: summary.unique_viewers, detail: `Active during ${rangeLabel.toLowerCase()}`, icon: FaUsers },
    { label: 'Viewing records', value: summary.viewing_records, detail: 'One learner-video pair per record', icon: FaPlayCircle },
    { label: 'Completion rate', value: summary.completion_rate, suffix: '%', detail: 'Completed among records in view', icon: FaCheckCircle },
    { label: 'Average verified reach', value: summary.average_reach, suffix: '%', detail: `${number(summary.measurable_views)} measurable · ${number(summary.unknown_reach_views)} unknown`, icon: FaChartLine, unavailable: !number(summary.measurable_views) },
    { label: 'Verified coverage', display: formatDuration(summary.verified_coverage_seconds, true), detail: 'Furthest verified coverage, not replay time', icon: FaClock },
  ]

  if (loading && !data) return <AdminDashboardLoading label="Loading video analytics" />

  return <div className={styles.videoAnalyticsDashboard} aria-busy={loading}>
    {loading && data && <AdminDashboardUpdate label="Updating video analytics" />}

    <div className={styles.enrollmentRangeBar}>
      <div><span>Viewing window</span><p>Controls viewer activity and lesson comparisons. Completion reflects the current state of records active in this window.</p></div>
      <div className={styles.enrollmentRangeOptions}>{RANGE_OPTIONS.map(([value, label]) => <button type="button" key={value} className={filters.range === value ? styles.enrollmentRangeActive : styles.enrollmentRangeOption} onClick={() => { setPage(1); setFilters((current) => ({ ...current, range: value })) }}>{label}</button>)}</div>
    </div>

    <div className={styles.videoMetricGrid}>{metrics.map((metric, index) => { const Icon = metric.icon; return <article className={styles.videoMetricCard} style={{ '--metric-delay': `${index * 55}ms` }} key={metric.label}><span><Icon /></span><div><small>{metric.label}</small><strong>{metric.unavailable ? 'N/A' : metric.display || <AnimatedNumber value={metric.value} suffix={metric.suffix} />}</strong><p>{metric.detail}</p></div></article> })}</div>

    {number(summary.lessons_missing_duration) > 0 && <div className={styles.videoDataNotice}>
      <span><FaInfoCircle /></span>
      <div><strong>Measurement coverage</strong><p>{summary.lessons_missing_duration} video {number(summary.lessons_missing_duration) === 1 ? 'lesson is' : 'lessons are'} missing duration metadata. Completed views remain accurate; incomplete reach for those lessons is marked unavailable instead of being counted as 0%.</p></div>
    </div>}

    <div className={styles.videoInsightsGrid}>
      <section className={styles.enrollmentInsightCard}>
        <div className={styles.enrollmentCardHeader}><div><span>Momentum</span><h3>Starts and completions</h3></div><span>{rangeLabel}</span></div>
        <VideoTrend rows={data?.trend || []} range={filters.range} />
        <div className={styles.videoTrendLegend}><span><i className={styles.videoTrendStarts} />Starts</span><span><i className={styles.videoTrendCompletions} />Completions</span></div>
      </section>

      <section className={styles.enrollmentInsightCard}>
        <div className={styles.enrollmentCardHeader}><div><span>Viewer distribution</span><h3>Furthest verified point reached</h3></div><span>{summary.viewing_records || 0} viewer records</span></div>
        <ReachDistribution data={data?.reachDistribution || {}} />
      </section>

      <section className={styles.enrollmentInsightCard}>
        <div className={styles.enrollmentCardHeader}><div><span>Playback snapshot</span><h3>Current saved states</h3></div><span>Fresh heartbeat: 45s</span></div>
        <div className={styles.videoPlaybackGrid}>
          <article><span><FaSignal /></span><div><strong>{number(data?.playbackSnapshot?.active_now)}</strong><small>Active now</small></div></article>
          <article><span><FaPause /></span><div><strong>{number(data?.playbackSnapshot?.paused)}</strong><small>Paused</small></div></article>
          <article><span><FaPlayCircle /></span><div><strong>{number(summary.resume_ready)}</strong><small>Resume-ready</small></div></article>
          <article><span><FaCheckCircle /></span><div><strong>{number(data?.playbackSnapshot?.completed)}</strong><small>Completed</small></div></article>
        </div>
        <p className={styles.videoSnapshotNote}>“Active now” requires a fresh server heartbeat. Stale browser sessions are never presented as live viewers.</p>
      </section>
    </div>

    <section className={styles.videoCourseComparison}>
      <div className={styles.enrollmentSectionHeading}><div><span>Course comparison</span><h3>Viewing by course</h3></div><p>Reach is calculated only where duration or verified completion makes the record measurable.</p></div>
      <div>{(data?.courseComparison || []).map((course) => <article key={course.course_id}>
        <div><strong>{course.course_title}</strong><small>{course.video_lessons} videos · {course.unique_viewers} viewers</small></div>
        <span><b>{course.average_reach}%</b><small>average reach</small></span>
        <span><b>{course.completion_rate}%</b><small>completion</small></span>
        <ProgressBar value={course.average_reach} unknown={!course.viewing_records} />
      </article>)}</div>
    </section>

    <section className={styles.videoLessonSection}>
      <div className={styles.enrollmentSectionHeading}><div><span>Lesson analytics</span><h3>Video performance</h3></div><p>One row per video lesson, with server-verified coverage and learner-level drill-down.</p></div>
      <div className={styles.videoToolbar}>
        <label className={styles.directorySearch}><FaSearch /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search video, module, or course" />{searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}</label>
        <div><Select label="Course" name="course" value={filters.course} options={courseOptions} onChange={updateFilter} /><Select label="Activity" name="activity" value={filters.activity} options={ACTIVITY_OPTIONS} onChange={updateFilter} /><Select label="Sort" name="sort" value={filters.sort} options={SORT_OPTIONS} onChange={updateFilter} /></div>
        <span>{loading ? 'Updating video lessons...' : `${number(data?.totalCount)} matching video lessons`}{hasFilters && <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); setFilters(initialFilters) }}>Reset filters</button>}</span>
      </div>

      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Video analytics unavailable</strong><span>{error}</span></div></div>}
      {!loading && !error && !data?.rows?.length ? <div className={styles.directoryEmpty}><FaVideo /><strong>No matching video lessons</strong><span>Try a broader viewing window or reset the filters.</span></div> : null}

      <div className={loading ? styles.videoLessonTableUpdating : styles.videoLessonTable}>
        <div className={styles.videoLessonHeader}><span>Video lesson</span><span>Duration</span><span>Viewers</span><span>Verified reach</span><span>Completion</span><span>Latest activity</span><span>Open</span></div>
        {(data?.rows || []).map((lesson, index) => <article style={{ '--row-delay': `${index * 28}ms` }} key={lesson.lesson_id}>
          <span className={styles.videoLessonIdentity}><i><FaPlayCircle /></i><span><strong>{lesson.lesson_title}</strong><small>{lesson.course_title} · {lesson.module_title}</small></span></span>
          <span className={styles.videoDurationCell}><strong>{lesson.duration_seconds ? formatDuration(lesson.duration_seconds) : 'Unavailable'}</strong><small>{lesson.duration_seconds ? 'trusted duration' : 'reach may be limited'}</small></span>
          <span className={styles.videoNumericCell}><strong>{lesson.viewer_count}</strong><small>{lesson.resume_ready} resume-ready</small></span>
          <span className={styles.videoReachCell}><span><ProgressBar value={lesson.average_reach} unknown={!number(lesson.measurable_viewers)} /><strong>{number(lesson.measurable_viewers) ? `${lesson.average_reach}%` : 'N/A'}</strong></span><small>{lesson.measurable_viewers} of {lesson.viewer_count} measurable</small></span>
          <span className={styles.videoNumericCell}><strong>{lesson.completion_rate}%</strong><small>{lesson.completed_viewers} completed</small></span>
          <span className={styles.videoDateCell}><strong>{formatDate(lesson.last_activity_at, true)}</strong><small>{lesson.active_now ? 'Active now' : lesson.paused_viewers ? `${lesson.paused_viewers} paused` : 'Saved state'}</small></span>
          <button type="button" className={styles.videoOpenButton} onClick={() => setSelectedLessonId(lesson.lesson_id)} aria-label={`Open analytics for ${lesson.lesson_title}`}><FaEye /></button>
        </article>)}
      </div>

      <div className={styles.directoryPagination}>
        <label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label>
        <span>{start}-{end} of {number(data?.totalCount).toLocaleString()}</span>
        <div><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} aria-label="Previous page"><FaArrowLeft /></button><span>Page {page}</span><button type="button" onClick={() => setPage((current) => current + 1)} disabled={page >= number(data?.pageCount || 1) || loading} aria-label="Next page"><FaArrowRight /></button></div>
      </div>
    </section>

    <div className={styles.videoMethodNote}><FaBookOpen /><p><strong>How to read this report:</strong> coverage is the furthest server-verified point reached in a video. It is intentionally not presented as total viewing time, replay count, or a second-by-second retention heatmap because those events are not stored.</p></div>

    {selectedLessonId && <VideoDetailDrawer lessonId={selectedLessonId} range={filters.range} onClose={() => setSelectedLessonId(null)} />}
  </div>
}
