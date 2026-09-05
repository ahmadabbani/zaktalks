export function flattenCourseModules(modules = [], introductionLesson = null) {
  return [
    ...(introductionLesson ? [introductionLesson] : []),
    ...modules.flatMap((module) => module.lessons || [])
  ]
}

export function buildLessonAccessMap(modules = [], completedMap = {}, introductionLesson = null, unlockAll = false) {
  const accessMap = {}
  let completedPrefix = true

  for (const lesson of flattenCourseModules(modules, introductionLesson)) {
    const isCompleted = Boolean(completedMap[lesson.id])
    accessMap[lesson.id] = unlockAll || isCompleted || completedPrefix
    completedPrefix = completedPrefix && isCompleted
  }

  return accessMap
}

export function getFirstAvailableLesson(modules = [], completedMap = {}, introductionLesson = null, unlockAll = false) {
  const lessons = flattenCourseModules(modules, introductionLesson)
  const accessMap = buildLessonAccessMap(modules, completedMap, introductionLesson, unlockAll)

  return lessons.find((lesson) => accessMap[lesson.id] && !completedMap[lesson.id]) || lessons[0] || null
}
