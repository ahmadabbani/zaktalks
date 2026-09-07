import 'server-only'

const AUDITED_ENTITY_TYPES = new Set(['course', 'module', 'lesson'])
const AUDITED_ACTIONS = new Set(['created', 'updated', 'deleted'])
const CHANGE_OPERATIONS = new Set(['added', 'updated', 'removed'])

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key])
      return result
    }, {})
  }
  return typeof value === 'string' ? value.trim() : value ?? null
}

function comparable(value) {
  return JSON.stringify(canonicalize(value))
}

function isEmpty(value) {
  if (value == null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

export function contentFieldChange(field, previousValue, nextValue) {
  const safeField = String(field || '').trim().slice(0, 120)
  if (!safeField || comparable(previousValue) === comparable(nextValue)) return null

  let operation = 'updated'
  if (isEmpty(previousValue) && !isEmpty(nextValue)) operation = 'added'
  else if (!isEmpty(previousValue) && isEmpty(nextValue)) operation = 'removed'
  else if (Array.isArray(previousValue) && Array.isArray(nextValue)) {
    if (nextValue.length > previousValue.length) operation = 'added'
    else if (nextValue.length < previousValue.length) operation = 'removed'
  }

  return { field: safeField, operation }
}

function sanitizeChanges(changes) {
  const seen = new Set()
  return (Array.isArray(changes) ? changes : [])
    .filter(Boolean)
    .map((change) => ({
      field: String(change.field || '').trim().slice(0, 120),
      operation: String(change.operation || '').trim().toLowerCase(),
    }))
    .filter((change) => {
      const key = `${change.field}:${change.operation}`
      if (!change.field || !CHANGE_OPERATIONS.has(change.operation) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 100)
}

export async function recordContentActivity(supabase, access, action, entityType, entityId, changes = []) {
  const safeChanges = sanitizeChanges(changes)
  if (
    !supabase
    || !access?.user?.id
    || !AUDITED_ACTIONS.has(action)
    || !AUDITED_ENTITY_TYPES.has(entityType)
    || !entityId
  ) {
    console.error('Content activity was not recorded because its trusted context was incomplete.')
    return false
  }

  if (action === 'updated' && safeChanges.length === 0) return true

  try {
    const { error } = await supabase.rpc('record_content_activity', {
      p_actor_user_id: access.user.id,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_changes: safeChanges,
    })

    if (error) {
      console.error(`Unable to record ${entityType} ${action} activity:`, error)
      return false
    }

    return true
  } catch (error) {
    console.error(`Unable to record ${entityType} ${action} activity:`, error)
    return false
  }
}

export async function recordContentCreationActivity(supabase, access, entityType, entityId) {
  return recordContentActivity(supabase, access, 'created', entityType, entityId)
}

export async function deleteContentWithActivity(
  supabase,
  access,
  entityType,
  entityId,
  { courseId = null, isCourseIntroduction = null } = {},
) {
  if (!supabase || !access?.user?.id || !AUDITED_ENTITY_TYPES.has(entityType) || !entityId) {
    return { error: 'The content could not be deleted safely.' }
  }

  try {
    const { error } = await supabase.rpc('delete_content_with_activity', {
      p_actor_user_id: access.user.id,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_expected_course_id: courseId,
      p_expected_is_course_introduction: isCourseIntroduction,
    })

    if (error) {
      console.error(`Unable to delete ${entityType} with activity tracking:`, error)
      return { error: error.message || 'The content could not be deleted safely.' }
    }

    return { success: true }
  } catch (error) {
    console.error(`Unable to delete ${entityType} with activity tracking:`, error)
    return { error: error.message || 'The content could not be deleted safely.' }
  }
}
