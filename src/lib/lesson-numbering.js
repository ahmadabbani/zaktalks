export const LESSON_NUMBERING_STYLES = Object.freeze({
  MODULE: 'module',
  NONE: 'none',
})

export function normalizeLessonNumberingStyle(value) {
  return value === LESSON_NUMBERING_STYLES.NONE
    ? LESSON_NUMBERING_STYLES.NONE
    : LESSON_NUMBERING_STYLES.MODULE
}

export function getLessonDisplayNumber(numberingStyle, moduleIndex, lessons = [], lessonIndex) {
  if (normalizeLessonNumberingStyle(numberingStyle) === LESSON_NUMBERING_STYLES.NONE) return null

  const lesson = lessons[lessonIndex]
  if (!lesson || lesson.type !== 'video' || lesson.is_course_introduction) return null

  const videoPosition = lessons
    .slice(0, lessonIndex + 1)
    .filter((item) => item.type === 'video' && !item.is_course_introduction)
    .length

  return `${moduleIndex + 1}.${videoPosition}`
}
