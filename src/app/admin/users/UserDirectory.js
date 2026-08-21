'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowLeft,
  FaArrowRight,
  FaBookOpen,
  FaChevronDown,
  FaExclamationTriangle,
  FaEye,
  FaGraduationCap,
  FaSearch,
  FaTimes,
  FaUser,
} from 'react-icons/fa'
import styles from './admin-users.module.css'
import { AdminDashboardLoading, AdminDashboardUpdate } from './AdminDashboardLoading'

const FILTERS = {
  segment: [
    ['all', 'All accounts'], ['registered', 'No course'], ['enrolled', 'Enrolled'], ['admins', 'Admins'],
  ],
  verification: [['all', 'Any verification'], ['verified', 'Verified'], ['pending', 'Pending verification']],
  password: [['all', 'Any password status'], ['ready', 'Password ready'], ['pending', 'Password pending']],
  activity: [['all', 'Any learning activity'], ['active_7', 'Active in 7 days'], ['active_30', 'Active in 30 days'], ['inactive_30', 'Inactive 30+ days'], ['never', 'Never started']],
  sort: [['newest', 'Newest accounts'], ['oldest', 'Oldest accounts'], ['name', 'Name A–Z'], ['points', 'Highest points'], ['activity', 'Recent learning activity']],
}

const initialFilters = { segment: 'all', verification: 'all', password: 'all', activity: 'all', sort: 'newest', pageSize: '25' }

function formatDate(value, withTime = false) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(value))
}

function relativeDate(value) {
  if (!value) return 'Never active'
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000)
  const divisions = [[60, 'second'], [60, 'minute'], [24, 'hour'], [7, 'day'], [4.345, 'week'], [12, 'month'], [Infinity, 'year']]
  let amount = seconds
  for (const [division, unit] of divisions) {
    if (Math.abs(amount) < division) return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(Math.round(amount), unit)
    amount /= division
  }
  return formatDate(value)
}

function duration(seconds) {
  const total = Number(seconds || 0)
  if (!total) return '0m'
  const hours = Math.floor(total / 3600)
  const minutes = Math.round((total % 3600) / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m`
}

function userName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || user?.email?.split('@')[0] || 'Unnamed account'
}

function initials(user) {
  const name = userName(user).split(/\s+/).slice(0, 2).map((part) => part[0]).join('')
  return name.toUpperCase() || 'U'
}

function relation(value) {
  return Array.isArray(value) ? value[0] : value
}

function enrollmentLabel(status) {
  const labels = {
    completed: 'Enrolled',
    pending: 'Access pending',
    failed: 'Payment failed',
    refunded: 'Refunded',
  }
  return labels[status] || 'Access recorded'
}

function DirectorySelect({ label, name, value, options, onChange }) {
  return (
    <label className={styles.directorySelectLabel}>
      <span>{label}</span>
      <span className={styles.directorySelectShell}>
        <select name={name} value={value} onChange={onChange}>
          {options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}
        </select>
        <FaChevronDown aria-hidden="true" />
      </span>
    </label>
  )
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`${styles.directoryPill} ${styles[`directoryPill${tone}`]}`}>{children}</span>
}

function UserDetailDrawer({ user, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const closeButton = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setData(null)
        setError('')
      }
    })
    fetch(`/api/admin/users/${user.id}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load user details.')
        setData(body)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
    closeButton.current?.focus()
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      controller.abort()
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [user.id, onClose])

  const profile = data?.profile || user
  const enrollments = data?.enrollments || []
  const progress = data?.recentProgress || []

  return (
    <div className={styles.drawerLayer} role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className={styles.userDrawer} role="dialog" aria-modal="true" aria-labelledby="user-drawer-title">
        <div className={styles.drawerHeader}>
          <div className={styles.drawerIdentity}>
            <span className={styles.directoryAvatar}>{initials(profile)}</span>
            <div>
              <span>Account profile</span>
              <h3 id="user-drawer-title">{userName(profile)}</h3>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </div>
          </div>
          <button ref={closeButton} type="button" className={styles.drawerClose} onClick={onClose} aria-label="Close user profile"><FaTimes /></button>
        </div>

        {error && <div className={styles.directoryError}><FaExclamationTriangle /><span>{error}</span></div>}
        {!data && !error && <div className={styles.drawerLoading}><span /><span /><span /></div>}

        {data && (
          <div className={styles.drawerContent}>
            <div className={styles.drawerStatusRow}>
              <StatusPill tone={profile.role === 'admin' ? 'yellow' : 'blue'}>{profile.role === 'admin' ? 'Administrator' : profile.role === 'creator' ? 'Creator' : 'Registered account'}</StatusPill>
              <StatusPill tone={profile.email_verified ? 'success' : 'neutral'}>{profile.email_verified ? 'Email verified' : 'Verification pending'}</StatusPill>
              <StatusPill tone={profile.password_set ? 'success' : 'neutral'}>{profile.password_set ? 'Password ready' : 'Password pending'}</StatusPill>
            </div>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}><FaUser /><h4>Account details</h4></div>
              <dl className={styles.detailGrid}>
                <div><dt>Joined</dt><dd>{formatDate(profile.created_at, true)}</dd></div>
                <div><dt>Last profile update</dt><dd>{formatDate(profile.updated_at, true)}</dd></div>
                <div><dt>Last sign-in</dt><dd>{formatDate(data.auth?.lastSignInAt, true)}</dd></div>
                <div><dt>Sign-in provider</dt><dd>{data.auth?.providers?.join(', ') || 'Email'}</dd></div>
                <div><dt>Points balance</dt><dd>{Number(profile.points || 0).toLocaleString()}</dd></div>
                <div><dt>First-purchase discount</dt><dd>{profile.first_purchase_discount_used ? 'Used' : 'Available'}</dd></div>
              </dl>
            </section>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}><FaBookOpen /><h4>Course access</h4><span>{enrollments.length}</span></div>
              {enrollments.length ? <div className={styles.drawerList}>
                {enrollments.map((enrollment) => {
                  const course = relation(enrollment.course)
                  return <article key={enrollment.id} className={styles.drawerListItem}>
                    <div><strong>{course?.title || 'Course'}</strong><span>Added {formatDate(enrollment.created_at)}</span></div>
                    <StatusPill tone={enrollment.payment_status === 'completed' ? 'success' : 'neutral'}>{enrollmentLabel(enrollment.payment_status)}</StatusPill>
                  </article>
                })}
              </div> : <p className={styles.drawerEmpty}>No course access records.</p>}
            </section>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionTitle}><FaGraduationCap /><h4>Recent learning activity</h4><span>{progress.length}</span></div>
              {progress.length ? <div className={styles.progressTimeline}>
                {progress.map((entry) => {
                  const lesson = relation(entry.lesson)
                  const courseModule = relation(lesson?.module)
                  const course = relation(lesson?.course)
                  return <article key={entry.id} className={styles.progressTimelineItem}>
                    <span className={entry.is_completed ? styles.progressDotComplete : styles.progressDot} />
                    <div>
                      <div className={styles.progressTimelineTop}>
                        <strong>{lesson?.title || 'Lesson'}</strong>
                        <time>{relativeDate(entry.last_accessed_at)}</time>
                      </div>
                      <span>{[course?.title, courseModule?.title, lesson?.type].filter(Boolean).join(' · ')}</span>
                      <div className={styles.progressMeta}>
                        <span>{entry.is_completed ? 'Completed' : entry.playback_status || 'Started'}</span>
                        {lesson?.type === 'video' && <span>{duration(entry.watch_time_seconds)} watched</span>}
                        {entry.score !== null && <span>{entry.score}% score</span>}
                      </div>
                    </div>
                  </article>
                })}
              </div> : <p className={styles.drawerEmpty}>No learning activity yet.</p>}
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}

export default function UserDirectory() {
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [cursor, setCursor] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      if (nextSearch === search) return
      setCursor(null)
      setHistory([])
      setPageNumber(1)
      setSearch(nextSearch)
    }, 320)
    return () => window.clearTimeout(timeout)
  }, [searchInput, search])

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ search, ...filters })
    if (cursor) params.set('cursor', cursor)
    return params.toString()
  }, [search, filters, cursor])

  useEffect(() => {
    const controller = new AbortController()
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setLoading(true)
        setError('')
      }
    })
    fetch(`/api/admin/users/directory?${queryString}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.error || 'Unable to load the directory.')
        setPage(body)
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError(requestError.message)
      })
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [queryString])

  const resetPaging = useCallback(() => {
    setCursor(null)
    setHistory([])
    setPageNumber(1)
  }, [])

  const updateFilter = (event) => {
    resetPaging()
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }
  const clearFilters = () => {
    setSearchInput('')
    setSearch('')
    setFilters(initialFilters)
    resetPaging()
  }
  const nextPage = () => {
    if (!page?.nextCursor) return
    setHistory((current) => [...current, cursor])
    setCursor(page.nextCursor)
    setPageNumber((current) => current + 1)
  }
  const previousPage = () => {
    if (!history.length) return
    setCursor(history.at(-1) || null)
    setHistory((current) => current.slice(0, -1))
    setPageNumber((current) => Math.max(1, current - 1))
  }

  const start = page?.totalCount ? (pageNumber - 1) * Number(filters.pageSize) + 1 : 0
  const end = Math.min(page?.totalCount || 0, start + (page?.rows?.length || 0) - 1)
  const hasFilters = searchInput || Object.entries(filters).some(([key, value]) => value !== initialFilters[key])

  if (loading && !page) return <AdminDashboardLoading label="Loading user directory" />

  return (
    <div className={styles.userDirectory} aria-busy={loading}>
      {loading && page && <AdminDashboardUpdate label="Updating user directory" />}
      <div className={styles.directoryToolbar}>
        <label className={styles.directorySearch}>
          <span className="sr-only">Search users</span>
          <FaSearch aria-hidden="true" />
          <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search by name or email" />
          {searchInput && <button type="button" onClick={() => setSearchInput('')} aria-label="Clear search"><FaTimes /></button>}
        </label>
        <div className={styles.directoryFilterGrid}>
          <DirectorySelect label="Account" name="segment" value={filters.segment} options={FILTERS.segment} onChange={updateFilter} />
          <DirectorySelect label="Verification" name="verification" value={filters.verification} options={FILTERS.verification} onChange={updateFilter} />
          <DirectorySelect label="Password" name="password" value={filters.password} options={FILTERS.password} onChange={updateFilter} />
          <DirectorySelect label="Activity" name="activity" value={filters.activity} options={FILTERS.activity} onChange={updateFilter} />
          <DirectorySelect label="Sort" name="sort" value={filters.sort} options={FILTERS.sort} onChange={updateFilter} />
        </div>
        <div className={styles.directoryToolbarBottom}>
          <span>{loading ? 'Updating directory…' : `${Number(page?.totalCount || 0).toLocaleString()} matching accounts`}</span>
          {hasFilters && <button type="button" onClick={clearFilters}>Reset filters</button>}
        </div>
      </div>

      {error && <div className={styles.directoryError}><FaExclamationTriangle /><div><strong>Directory unavailable</strong><span>{error}</span></div></div>}

      <div className={styles.directoryTableShell} aria-busy={loading}>
        <div className={styles.directoryTableHeader}>
          <span>Account</span><span>Access</span><span>Learning</span><span>Last activity</span><span>Joined</span><span className="sr-only">Open</span>
        </div>
        {loading && !page ? <div className={styles.directorySkeleton}>{Array.from({ length: 8 }, (_, index) => <span key={index} />)}</div> : null}
        {!loading && !error && !page?.rows?.length ? <div className={styles.directoryEmpty}><FaUser /><strong>No matching accounts</strong><span>Try a broader search or reset the filters.</span></div> : null}
        <div className={loading ? styles.directoryRowsLoading : styles.directoryRows}>
          {page?.rows?.map((user, index) => (
            <button type="button" className={styles.directoryRow} style={{ '--row-delay': `${index * 28}ms` }} key={user.id} onClick={() => setSelectedUser(user)}>
              <span className={styles.directoryIdentity}>
                <span className={styles.directoryAvatar}>{initials(user)}</span>
                <span><strong>{userName(user)}</strong><small>{user.email}</small></span>
              </span>
              <span className={styles.directoryAccess}>
                <StatusPill tone={user.role === 'admin' ? 'yellow' : 'blue'}>{user.role === 'admin' ? 'Admin' : user.role === 'creator' ? 'Creator' : user.enrollment_count ? 'Enrolled' : 'No course'}</StatusPill>
                <small>{user.email_verified ? 'Verified' : 'Verification pending'}</small>
              </span>
              <span className={styles.directoryLearning}>
                <strong>{user.completed_lessons}/{user.started_lessons}</strong>
                <small>lessons completed</small>
              </span>
              <span className={styles.directoryDate}><strong>{relativeDate(user.last_learning_activity)}</strong><small>{duration(user.watch_time_seconds)} watched</small></span>
              <span className={styles.directoryDate}><strong>{formatDate(user.created_at)}</strong><small>{Number(user.points || 0).toLocaleString()} points</small></span>
              <span className={styles.directoryOpen}><FaEye aria-hidden="true" /></span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.directoryPagination}>
        <label>Rows <select name="pageSize" value={filters.pageSize} onChange={updateFilter}><option>10</option><option>25</option><option>50</option></select></label>
        <span>{start}–{end} of {Number(page?.totalCount || 0).toLocaleString()}</span>
        <div>
          <button type="button" onClick={previousPage} disabled={!history.length || loading} aria-label="Previous page"><FaArrowLeft /></button>
          <span>Page {pageNumber}</span>
          <button type="button" onClick={nextPage} disabled={!page?.hasMore || loading} aria-label="Next page"><FaArrowRight /></button>
        </div>
      </div>

      {selectedUser && <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />}
    </div>
  )
}
