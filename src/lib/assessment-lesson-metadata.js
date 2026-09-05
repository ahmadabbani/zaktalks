export const ASSESSMENT_TIME_OPTIONS = [
  'About 3 minutes',
  'About 6–8 minutes',
  'About 8–10 minutes',
  'About 10–12 minutes',
  'About 12–14 minutes',
]

export function isAssessmentTimeOption(value) {
  return ASSESSMENT_TIME_OPTIONS.includes(value)
}

function countWorksheetFields(lines = []) {
  return lines.reduce((total, line) => total + (line.parts || []).filter(
    (part) => part && typeof part === 'object' && part.id
  ).length, 0)
}

export function getAssessmentStatementCount(definition) {
  if (Array.isArray(definition?.questions)) return definition.questions.length
  if (Array.isArray(definition?.groups)) {
    return definition.groups.reduce((total, group) => total + (group.statements?.length || 0), 0)
  }
  if (Array.isArray(definition?.sections)) {
    return definition.sections.reduce((total, section) => (
      total
      + countWorksheetFields(section.oldStory)
      + countWorksheetFields(section.newStory)
    ), 0)
  }
  return 0
}
