'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { buildLessonAccessMap } from '@/lib/course-progression'

const CourseProgressContext = createContext(null)

export function CourseProgressProvider({ modules, initialCompletedMap, initialWatchedMap, children }) {
  const [completedMap, setCompletedMap] = useState(initialCompletedMap || {})
  const [watchedMap, setWatchedMap] = useState(initialWatchedMap || {})

  const markLessonCompleted = useCallback((lessonId) => {
    setCompletedMap((current) => current[lessonId]
      ? current
      : { ...current, [lessonId]: true })
    setWatchedMap((current) => current[lessonId] === 100
      ? current
      : { ...current, [lessonId]: 100 })
  }, [])

  const updateLessonWatchedProgress = useCallback((lessonId, percentage) => {
    const nextPercentage = Math.max(0, Math.min(100, Number(percentage) || 0))
    setWatchedMap((current) => nextPercentage <= (current[lessonId] || 0)
      ? current
      : { ...current, [lessonId]: nextPercentage })
  }, [])

  const value = useMemo(() => ({
    completedMap,
    watchedMap,
    accessMap: buildLessonAccessMap(modules, completedMap),
    markLessonCompleted,
    updateLessonWatchedProgress
  }), [completedMap, markLessonCompleted, modules, updateLessonWatchedProgress, watchedMap])

  return (
    <CourseProgressContext.Provider value={value}>
      {children}
    </CourseProgressContext.Provider>
  )
}

export function useCourseProgress() {
  const context = useContext(CourseProgressContext)

  if (!context) {
    throw new Error('useCourseProgress must be used inside CourseProgressProvider')
  }

  return context
}
