'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  FaArrowDown,
  FaArrowUp,
  FaBookOpen,
  FaCheck,
  FaCheckCircle,
  FaClock,
  FaExclamationCircle,
  FaGraduationCap,
  FaMinus,
  FaPlay,
  FaShieldAlt,
  FaUserPlus,
  FaUsers,
} from 'react-icons/fa'
import styles from './admin-users.module.css'

const DAY = 24 * 60 * 60 * 1000

const ranges = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
  { id: '365', label: '12 months', days: 365 },
  { id: 'all', label: 'All time', days: null },
]

const segments = [
  { id: 'all', label: 'All accounts' },
  { id: 'registered', label: 'Registered, no course' },
  { id: 'enrolled', label: 'Enrolled users' },
  { id: 'admins', label: 'Admins' },
]

const formatDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' })
const formatShortDate = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })

function toDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime()) ? date : null
}

function isAfter(value, threshold) {
  if (!threshold) return true
  const date = toDate(value)
  return Boolean(date && date >= threshold)
}

function relationValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function AnimatedNumber({ value, suffix = '' }) {
  const numericValue = Number(value) || 0
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let animationFrame
    const startedAt = performance.now()
    const duration = 720

    const update = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayValue(Math.round(numericValue * eased))
      if (progress < 1) animationFrame = requestAnimationFrame(update)
    }

    animationFrame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(animationFrame)
  }, [numericValue])

  return <>{displayValue.toLocaleString()}{suffix}</>
}

function Delta({ current, previous }) {
  if (previous === null || previous === undefined) return <span className={styles.metricContext}>All recorded activity</span>
  const difference = current - previous
  if (difference === 0) return <span className={styles.metricDeltaNeutral}><FaMinus /> No change</span>
  const Icon = difference > 0 ? FaArrowUp : FaArrowDown
  return (
    <span className={difference > 0 ? styles.metricDeltaPositive : styles.metricDeltaNegative}>
      <Icon /> {Math.abs(difference).toLocaleString()} vs previous period
    </span>
  )
}

function buildTrend(users, days, now) {
  const chartDays = days || 365
  const binCount = chartDays <= 7 ? 7 : chartDays <= 90 ? 6 : 12
  const start = new Date(now.getTime() - chartDays * DAY)
  const binWidth = (chartDays * DAY) / binCount
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: new Date(start.getTime() + index * binWidth),
    end: new Date(start.getTime() + (index + 1) * binWidth),
    value: 0,
  }))

  users.forEach((user) => {
    const created = toDate(user.created_at)
    if (!created || created < start || created > now) return
    const index = Math.min(binCount - 1, Math.floor((created.getTime() - start.getTime()) / binWidth))
    bins[index].value += 1
  })

  return bins.map((bin) => ({
    ...bin,
    label: chartDays <= 90 ? formatShortDate.format(bin.start) : bin.start.toLocaleDateString('en', { month: 'short' }),
  }))
}

function getUserName(user) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
  return name || user.email?.split('@')[0] || 'Unnamed user'
}

function initials(user) {
  const name = getUserName(user)
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default function OverviewDashboard({ data }) {
  const [rangeId, setRangeId] = useState('30')
  const [segmentId, setSegmentId] = useState('all')
  const [activityPage, setActivityPage] = useState({ key: '', items: [], hasMore: true, error: '' })
  const [activityLoading, setActivityLoading] = useState(false)
  const now = useMemo(() => new Date(), [])

  const dashboard = useMemo(() => {
    const users = data?.users || []
    const enrollments = data?.enrollments || []
    const progress = data?.progress || []
    const selectedRange = ranges.find((range) => range.id === rangeId) || ranges[1]
    const rangeStart = selectedRange.days ? new Date(now.getTime() - selectedRange.days * DAY) : null
    const previousStart = selectedRange.days ? new Date(now.getTime() - selectedRange.days * DAY * 2) : null
    const completedEnrollments = enrollments.filter((item) => item.payment_status === 'completed')
    const enrolledUserIds = new Set(completedEnrollments.map((item) => item.user_id))

    const segmentUsers = users.filter((user) => {
      if (segmentId === 'registered') return user.role === 'user' && !enrolledUserIds.has(user.id)
      if (segmentId === 'admins') return user.role === 'admin'
      if (segmentId === 'enrolled') return enrolledUserIds.has(user.id)
      return true
    })
    const userIds = new Set(segmentUsers.map((user) => user.id))
    const scopedEnrollments = completedEnrollments.filter((item) => userIds.has(item.user_id))
    const scopedProgress = progress.filter((item) => userIds.has(item.user_id))
    const newUsers = segmentUsers.filter((user) => isAfter(user.created_at, rangeStart))
    const previousNewUsers = selectedRange.days
      ? segmentUsers.filter((user) => {
          const created = toDate(user.created_at)
          return created && created >= previousStart && created < rangeStart
        })
      : null
    const progressInRange = scopedProgress.filter((item) => isAfter(item.last_accessed_at || item.updated_at || item.started_at, rangeStart))
    const previousProgress = selectedRange.days
      ? scopedProgress.filter((item) => {
          const activeAt = toDate(item.last_accessed_at || item.updated_at || item.started_at)
          return activeAt && activeAt >= previousStart && activeAt < rangeStart
        })
      : []
    const activeUserIds = new Set(progressInRange.map((item) => item.user_id))
    const previousActiveUserIds = new Set(previousProgress.map((item) => item.user_id))
    const verifiedCount = segmentUsers.filter((user) => user.email_verified).length
    const passwordReadyCount = segmentUsers.filter((user) => user.password_set).length
    const enrolledCount = segmentUsers.filter((user) => enrolledUserIds.has(user.id)).length
    const enrollmentEligibleUsers = segmentUsers.filter((user) => user.role === 'user')
    const enrolledEligibleCount = enrollmentEligibleUsers.filter((user) => enrolledUserIds.has(user.id)).length
    const enrollmentRate = enrollmentEligibleUsers.length
      ? Math.round((enrolledEligibleCount / enrollmentEligibleUsers.length) * 100)
      : 0
    const completedProgress = progressInRange.filter((item) => item.is_completed).length
    const completionRate = progressInRange.length ? Math.round((completedProgress / progressInRange.length) * 100) : 0
    const averageProgress = progressInRange.length
      ? Math.round(progressInRange.reduce((total, item) => {
          if (item.is_completed) return total + 100
          const position = Number(item.max_position_reached_seconds) || 0
          const lesson = relationValue(item.lesson)
          const duration = Number(lesson?.duration_seconds) || 0
          return total + (lesson?.type === 'assessment' || duration <= 0 ? 0 : Math.min(96, Math.round((position / duration) * 100)))
        }, 0) / progressInRange.length)
      : 0

    const trend = buildTrend(segmentUsers, selectedRange.days, now)
    const maxTrend = Math.max(1, ...trend.map((item) => item.value))
    const recentUsers = [...segmentUsers]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6)

    const allActivities = [
      ...segmentUsers.map((user) => ({
        id: `user-${user.id}`,
        type: 'account',
        title: `${getUserName(user)} joined`,
        detail: user.email_verified ? 'Verified account' : 'Verification pending',
        at: user.created_at,
      })),
      ...scopedEnrollments.map((item) => ({
        id: `enrollment-${item.id}`,
        type: 'enrollment',
        title: `${getUserName(users.find((user) => user.id === item.user_id) || {})} enrolled`,
        detail: relationValue(item.course)?.title || 'Course enrollment',
        at: item.completed_at || item.created_at,
      })),
      ...scopedProgress.filter((item) => item.is_completed).map((item) => ({
        id: `progress-${item.id}`,
        type: 'completion',
        title: `${getUserName(users.find((user) => user.id === item.user_id) || {})} completed a lesson`,
        detail: relationValue(item.lesson)?.title || 'Lesson completed',
        at: item.completed_at || item.updated_at,
      })),
    ]
      .filter((item) => isAfter(item.at, rangeStart))
      .sort((a, b) => new Date(b.at) - new Date(a.at))

    return {
      selectedRange,
      segmentUsers,
      newUsers,
      previousNewUsers,
      verifiedCount,
      passwordReadyCount,
      enrolledCount,
      enrollmentRate,
      activeCount: activeUserIds.size,
      previousActiveCount: selectedRange.days ? previousActiveUserIds.size : null,
      completedProgress,
      completionRate,
      averageProgress,
      trend,
      maxTrend,
      recentUsers,
      activities: allActivities.slice(0, 7),
      activityTotal: allActivities.length,
      enrolledUserIds,
      scopedEnrollments,
    }
  }, [data, now, rangeId, segmentId])

  const activityKey = `${rangeId}:${segmentId}`
  const currentActivityPage = activityPage.key === activityKey ? activityPage : { items: [], hasMore: dashboard.activityTotal > 7, error: '' }
  const visibleActivities = [...dashboard.activities, ...currentActivityPage.items].filter((activity, index, items) => items.findIndex((item) => item.id === activity.id) === index)

  const loadMoreActivity = async () => {
    setActivityLoading(true)
    try {
      const response = await fetch(`/api/admin/users/activity?offset=${visibleActivities.length}&limit=7&range=${rangeId}&segment=${segmentId}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Activity could not be loaded.')
      setActivityPage({
        key: activityKey,
        items: [...currentActivityPage.items, ...(result.activities || [])],
        hasMore: Boolean(result.hasMore),
        error: '',
      })
    } catch (error) {
      setActivityPage({ ...currentActivityPage, key: activityKey, error: error.message || 'Activity could not be loaded.' })
    } finally {
      setActivityLoading(false)
    }
  }

  if (data?.error) {
    return (
      <div className={styles.overviewError} role="alert">
        <FaExclamationCircle />
        <div><strong>Overview unavailable</strong><p>{data.error} Refresh the page to try again.</p></div>
      </div>
    )
  }

  const metricCards = [
    { label: 'Total accounts', value: dashboard.segmentUsers.length, icon: FaUsers, detail: segments.find((item) => item.id === segmentId)?.label, tone: 'blue' },
    { label: 'New accounts', value: dashboard.newUsers.length, icon: FaUserPlus, detail: dashboard.selectedRange.label, previous: dashboard.previousNewUsers?.length, tone: 'yellow' },
    { label: 'Verified accounts', value: dashboard.segmentUsers.length ? Math.round((dashboard.verifiedCount / dashboard.segmentUsers.length) * 100) : 0, suffix: '%', icon: FaShieldAlt, detail: `${dashboard.verifiedCount} verified`, tone: 'blue' },
    { label: 'Enrolled users', value: dashboard.enrolledCount, icon: FaGraduationCap, detail: `${dashboard.scopedEnrollments.length} completed enrollments`, tone: 'slate' },
    { label: 'Active course users', value: dashboard.activeCount, icon: FaPlay, detail: dashboard.selectedRange.label, previous: dashboard.previousActiveCount, tone: 'yellow' },
    { label: 'Lesson completion', value: dashboard.completionRate, suffix: '%', icon: FaCheckCircle, detail: `${dashboard.completedProgress} completions in view`, tone: 'blue' },
  ]

  return (
    <div className={styles.overviewDashboard}>
      <div className={styles.overviewToolbar}>
        <div className={styles.filterBlock}>
          <span className={styles.filterLabel}>Time range</span>
          <div className={styles.filterOptions}>
            {ranges.map((range) => (
              <button key={range.id} type="button" onClick={() => setRangeId(range.id)} className={rangeId === range.id ? styles.filterOptionActive : styles.filterOption}>{range.label}</button>
            ))}
          </div>
        </div>
        <div className={styles.filterBlock}>
          <span className={styles.filterLabel}>User segment</span>
          <div className={styles.filterOptions}>
            {segments.map((segment) => (
              <button key={segment.id} type="button" onClick={() => setSegmentId(segment.id)} className={segmentId === segment.id ? styles.filterOptionActive : styles.filterOption}>{segment.label}</button>
            ))}
          </div>
        </div>
      </div>

      <section className={styles.metricGrid} aria-label="User metrics">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon
          return (
            <article className={`${styles.metricCard} ${styles[`metricTone${metric.tone}`]}`} style={{ '--metric-delay': `${index * 55}ms` }} key={metric.label}>
              <div className={styles.metricCardTop}><span className={styles.metricIcon}><Icon /></span><span className={styles.metricLabel}>{metric.label}</span></div>
              <strong className={styles.metricValue}><AnimatedNumber value={metric.value} suffix={metric.suffix} /></strong>
              <div className={styles.metricFooter}><span>{metric.detail}</span>{'previous' in metric && <Delta current={metric.value} previous={metric.previous} />}</div>
            </article>
          )
        })}
      </section>

      <div className={styles.overviewPrimaryGrid}>
        <section className={styles.dashboardCard}>
          <div className={styles.cardHeader}>
            <div><span className={styles.cardKicker}>Growth</span><h3>Account growth</h3></div>
            <span className={styles.cardMeta}>{dashboard.selectedRange.days ? dashboard.selectedRange.label : 'Last 12 months shown'}</span>
          </div>
          <div className={styles.growthChart}>
            {dashboard.trend.map((item) => (
              <div className={styles.growthColumn} key={item.start.toISOString()}>
                <div className={styles.growthBarArea}><span className={styles.growthValue}>{item.value}</span><span className={styles.growthBar} style={{ height: `${Math.max(item.value ? 12 : 2, (item.value / dashboard.maxTrend) * 100)}%` }} /></div>
                <span className={styles.growthLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.dashboardCard}>
          <div className={styles.cardHeader}><div><span className={styles.cardKicker}>Readiness</span><h3>Account health</h3></div></div>
          <div className={styles.healthVisuals}>
            <div>
              <div className={styles.healthRing} style={{ '--health-value': `${dashboard.segmentUsers.length ? Math.round((dashboard.verifiedCount / dashboard.segmentUsers.length) * 100) : 0}%` }}>
                <div><strong><AnimatedNumber value={dashboard.segmentUsers.length ? Math.round((dashboard.verifiedCount / dashboard.segmentUsers.length) * 100) : 0} suffix="%" /></strong><span>verified</span></div>
              </div>
              <span>Account verification</span>
            </div>
            <div>
              <div className={styles.healthRing} style={{ '--health-value': `${dashboard.enrollmentRate}%` }}>
                <div><strong><AnimatedNumber value={dashboard.enrollmentRate} suffix="%" /></strong><span>enrolled</span></div>
              </div>
              <span>Enrollment conversion</span>
            </div>
          </div>
          <div className={styles.healthRows}>
            <div><span><FaCheck /> Email verified</span><strong>{dashboard.verifiedCount}</strong></div>
            <div><span><FaShieldAlt /> Password ready</span><strong>{dashboard.passwordReadyCount}</strong></div>
            <div><span><FaGraduationCap /> Enrolled</span><strong>{dashboard.enrolledCount}</strong></div>
          </div>
        </section>
      </div>

      <div className={styles.overviewSecondaryGrid}>
        <section className={styles.dashboardCard}>
          <div className={styles.cardHeader}><div><span className={styles.cardKicker}>Engagement</span><h3>Learning activity</h3></div><span className={styles.cardMeta}>{dashboard.selectedRange.label}</span></div>
          <div className={styles.engagementSummary}>
            <div><strong><AnimatedNumber value={dashboard.activeCount} /></strong><span>active learners</span></div>
            <div><strong><AnimatedNumber value={dashboard.completedProgress} /></strong><span>lessons completed</span></div>
            <div><strong><AnimatedNumber value={dashboard.averageProgress} suffix="%" /></strong><span>average activity</span></div>
          </div>
          <div className={styles.engagementTrack}><span style={{ width: `${dashboard.completionRate}%` }} /></div>
          <p className={styles.engagementCaption}>{dashboard.completionRate}% of lesson activity in this view is completed.</p>
        </section>

        <section className={styles.dashboardCard}>
          <div className={styles.cardHeader}><div><span className={styles.cardKicker}>Latest</span><h3>Recent activity</h3></div></div>
          <div className={styles.activityList}>
            {visibleActivities.length ? visibleActivities.map((activity) => {
              const Icon = activity.type === 'account' ? FaUserPlus : activity.type === 'enrollment' ? FaBookOpen : FaCheckCircle
              return <div className={styles.activityItem} key={activity.id}><span className={styles.activityIcon}><Icon /></span><div><strong>{activity.title}</strong><span>{activity.detail}</span></div><time dateTime={activity.at}>{formatShortDate.format(new Date(activity.at))}</time></div>
            }) : <div className={styles.emptyDashboardState}><FaClock /><span>No activity in this range</span></div>}
          </div>
          {currentActivityPage.error && <p className={styles.activityError}>{currentActivityPage.error}</p>}
          {currentActivityPage.hasMore && visibleActivities.length > 0 && (
            <button type="button" className={styles.activityMoreButton} onClick={loadMoreActivity} disabled={activityLoading}>
              {activityLoading ? 'Loading activity…' : 'Show more activity'}
            </button>
          )}
        </section>
      </div>

      <section className={`${styles.dashboardCard} ${styles.recentUsersCard}`}>
        <div className={styles.cardHeader}><div><span className={styles.cardKicker}>Accounts</span><h3>Recently joined</h3></div><span className={styles.cardMeta}>{segments.find((item) => item.id === segmentId)?.label}</span></div>
        <div className={styles.recentUsersTable}>
          <div className={styles.recentUsersHead}><span>User</span><span>Account</span><span>Learning</span><span>Joined</span></div>
          {dashboard.recentUsers.length ? dashboard.recentUsers.map((user) => (
            <div className={styles.recentUserRow} key={user.id}>
              <div className={styles.userIdentity}><span className={styles.userAvatar}>{initials(user)}</span><div><strong>{getUserName(user)}</strong><span>{user.email}</span></div></div>
              <div className={styles.userBadges}><span className={user.email_verified ? styles.statusVerified : styles.statusPending}>{user.email_verified ? 'Verified' : 'Pending'}</span>{user.role === 'admin' && <span className={styles.statusAdmin}>Admin</span>}{user.role === 'creator' && <span className={styles.statusAdmin}>Creator</span>}</div>
              <span className={dashboard.enrolledUserIds.has(user.id) ? styles.learningEnrolled : styles.learningNotEnrolled}>{dashboard.enrolledUserIds.has(user.id) ? 'Enrolled' : 'Not enrolled'}</span>
              <time dateTime={user.created_at}>{formatDate.format(new Date(user.created_at))}</time>
            </div>
          )) : <div className={styles.emptyDashboardState}><FaUsers /><span>No accounts match these filters</span></div>}
        </div>
      </section>
    </div>
  )
}
