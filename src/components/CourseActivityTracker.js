'use client'

import { useEffect } from 'react'
import { recordCourseActivity } from '@/app/courses/activity.actions'

export default function CourseActivityTracker({ lessonId }) {
  useEffect(() => {
    void recordCourseActivity(lessonId)
  }, [lessonId])

  return null
}
