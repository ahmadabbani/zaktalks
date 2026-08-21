export function flattenCourseModules(modules = []) {
  return modules.flatMap((module) => module.lessons || [])
}

export function buildLessonAccessMap(modules = [], completedMap = {}) {
  const accessMap = {}
  let completedPrefix = true

  for (const lesson of flattenCourseModules(modules)) {
    const isCompleted = Boolean(completedMap[lesson.id])
    accessMap[lesson.id] = isCompleted || completedPrefix
    completedPrefix = completedPrefix && isCompleted
  }

  return accessMap
}

export function getFirstAvailableLesson(modules = [], completedMap = {}) {
  const lessons = flattenCourseModules(modules)
  const accessMap = buildLessonAccessMap(modules, completedMap)

  return lessons.find((lesson) => accessMap[lesson.id] && !completedMap[lesson.id]) || lessons[0] || null
}
