'use client'

import { useMemo, useState } from 'react'
import {
  FaBookOpen,
  FaClipboardCheck,
  FaHistory,
  FaLayerGroup,
  FaPen,
  FaPlayCircle,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserShield,
} from 'react-icons/fa'
import styles from './creation-activity.module.css'

const FILTERS = [
  { id: 'all', label: 'All content' },
  { id: 'course', label: 'Courses' },
  { id: 'module', label: 'Modules' },
  { id: 'lesson', label: 'Lessons' },
]

const ACTION_FILTERS = [
  { id: 'all', label: 'All changes' },
  { id: 'created', label: 'Created' },
  { id: 'updated', label: 'Updated' },
  { id: 'deleted', label: 'Deleted' },
]

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Beirut',
})

function EntityIcon({ entry }) {
  if (entry.entity_type === 'course') return <FaBookOpen aria-hidden="true" />
  if (entry.entity_type === 'module') return <FaLayerGroup aria-hidden="true" />
  if (entry.lesson_type === 'assessment') return <FaClipboardCheck aria-hidden="true" />
  return <FaPlayCircle aria-hidden="true" />
}

function entityLabel(entry) {
  if (entry.entity_type === 'course') return 'Course'
  if (entry.entity_type === 'module') return 'Module'
  if (entry.is_course_introduction) return 'Course introduction'
  return entry.lesson_type === 'assessment' ? 'Assessment' : 'Video lesson'
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown date' : DATE_FORMATTER.format(date)
}

function actionLabel(action) {
  if (action === 'updated') return 'Updated'
  if (action === 'deleted') return 'Deleted'
  return 'Created'
}

function activityDetails(entry) {
  if (Array.isArray(entry.changes) && entry.changes.length > 0) {
    return entry.changes.map((change) => `${change.field} ${change.operation}`)
  }
  if (entry.action === 'deleted') return [`${entityLabel(entry)} deleted`]
  return [`${entityLabel(entry)} created`]
}

export default function CreationActivityDashboard({ entries = [], error = '' }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')

  const counts = useMemo(() => ({
    created: entries.filter((entry) => entry.action === 'created').length,
    updated: entries.filter((entry) => entry.action === 'updated').length,
    deleted: entries.filter((entry) => entry.action === 'deleted').length,
  }), [entries])

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (filter !== 'all' && entry.entity_type !== filter) return false
      if (actionFilter !== 'all' && entry.action !== actionFilter) return false
      if (!normalizedQuery) return true
      return [
        entry.actor_name,
        entry.actor_email,
        entry.entity_title,
        entry.course_title,
        entry.module_title,
        entry.assessment_title,
        entry.action,
        entityLabel(entry),
        ...(Array.isArray(entry.changes) ? entry.changes.flatMap((change) => [change?.field, change?.operation]) : []),
      ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery))
    })
  }, [actionFilter, entries, filter, query])

  return (
    <div className={styles.dashboard}>
      <div className={styles.metrics}>
        <article><span><FaPlus /></span><div><small>Created</small><strong>{counts.created}</strong></div></article>
        <article><span><FaPen /></span><div><small>Updated</small><strong>{counts.updated}</strong></div></article>
        <article><span><FaTrash /></span><div><small>Deleted</small><strong>{counts.deleted}</strong></div></article>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <FaSearch aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search creator, course, module, or lesson"
            aria-label="Search content activity"
          />
        </label>
        <div className={styles.filterGroups}>
          <div className={styles.filters} aria-label="Filter by content type">
            {FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={filter === item.id ? styles.filterActive : ''}
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={styles.filters} aria-label="Filter by action">
            {ACTION_FILTERS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={actionFilter === item.id ? styles.filterActive : ''}
                onClick={() => setActionFilter(item.id)}
                aria-pressed={actionFilter === item.id}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className={styles.error} role="alert">{error}</div>}

      {!error && filteredEntries.length === 0 ? (
        <div className={styles.empty}>
          <FaHistory aria-hidden="true" />
          <strong>{entries.length ? 'No matching activity' : 'No content activity yet'}</strong>
          <p>{entries.length ? 'Try a different search or filter.' : 'Course, module, and lesson changes will appear here.'}</p>
        </div>
      ) : !error && (
        <div className={styles.tableShell}>
          <table>
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Activity</th>
                <th>Changes</th>
                <th>Course</th>
                <th>Module</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="Staff member">
                    <div className={styles.creator}>
                      <span><FaUserShield aria-hidden="true" /></span>
                      <div><strong>{entry.actor_name}</strong><small>{entry.actor_email}</small><em>{entry.actor_role}</em></div>
                    </div>
                  </td>
                  <td data-label="Activity">
                    <div className={styles.entity}>
                      <span><EntityIcon entry={entry} /></span>
                      <div>
                        <small className={`${styles.actionBadge} ${styles[`action${actionLabel(entry.action)}`]}`}>{actionLabel(entry.action)}</small>
                        <strong>{entry.entity_title}</strong>
                        <em>{entityLabel(entry)}</em>
                        {entry.lesson_type === 'assessment' && entry.assessment_title && <em>{entry.assessment_title}</em>}
                      </div>
                    </div>
                  </td>
                  <td data-label="Changes">
                    <ul className={styles.changeList}>
                      {activityDetails(entry).map((detail, index) => <li key={`${entry.id}-${index}`}>{detail}</li>)}
                    </ul>
                  </td>
                  <td data-label="Course"><strong className={styles.contextTitle}>{entry.course_title}</strong></td>
                  <td data-label="Module"><span className={styles.contextText}>{entry.module_title || 'Not applicable'}</span></td>
                  <td data-label="Date"><time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
