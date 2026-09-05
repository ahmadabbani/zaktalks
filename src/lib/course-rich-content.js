import {
  createRichText,
  normalizeRichTextList,
  parseRichTextObject,
  richTextForPlain,
} from '@/lib/rich-text'

const FIELD_LIMITS = {
  promise: 8000,
  short_introduction: 4000,
  description: 12000,
  audience_supporting_text: 5000,
  subheadline: 4000,
  meet_the_tutor: 8000,
}

function list(value) {
  return Array.isArray(value) ? value : []
}

function targetKey(item) {
  return item?.target_type === 'page'
    ? `page:${String(item?.page_path || '')}`
    : `course:${String(item?.course_id || '')}`
}

function findSequentialMatch(candidates, cursor, matches) {
  for (let index = cursor.value; index < candidates.length; index += 1) {
    if (!matches(candidates[index])) continue
    cursor.value = index + 1
    return candidates[index]
  }
  return null
}

function sanitizeBlocks(rawBlocks, plainBlocks) {
  const candidates = list(rawBlocks)
  const cursor = { value: 0 }

  return list(plainBlocks).map((block) => {
    const candidate = findSequentialMatch(
      candidates,
      cursor,
      (entry) => !entry?.title || String(entry.title) === String(block?.title || ''),
    ) || {}

    return {
      title: String(block?.title || ''),
      text: richTextForPlain(candidate.text, block?.text || '', 8000),
      items: normalizeRichTextList(candidate.items, list(block?.items), 1200),
    }
  })
}

function sanitizeRecommendations(rawItems, plainItems) {
  const candidates = list(rawItems)
  const cursor = { value: 0 }

  return list(plainItems).map((item) => {
    const key = targetKey(item)
    const candidate = findSequentialMatch(candidates, cursor, (entry) => {
      const candidateKey = targetKey(entry)
      return candidateKey === 'course:' || candidateKey === 'page:' || candidateKey === key
    }) || {}
    return {
      target_type: item?.target_type === 'page' ? 'page' : 'course',
      course_id: String(item?.course_id || ''),
      page_path: String(item?.page_path || ''),
      description: richTextForPlain(candidate.description, item?.description || '', 3000),
    }
  })
}

export function sanitizeCourseRichContent(rawValue, canonical = {}) {
  const parsed = parseRichTextObject(rawValue, 'Course formatting')

  return {
    version: 1,
    promise: richTextForPlain(parsed.promise, canonical.promise || '', FIELD_LIMITS.promise),
    short_introduction: richTextForPlain(parsed.short_introduction, canonical.short_introduction || '', FIELD_LIMITS.short_introduction),
    description: richTextForPlain(parsed.description, canonical.description || '', FIELD_LIMITS.description),
    what_youll_learn: normalizeRichTextList(parsed.what_youll_learn, list(canonical.what_youll_learn), 1000),
    details_to_know_items: sanitizeBlocks(parsed.details_to_know_items, canonical.details_to_know_items),
    target_audience: normalizeRichTextList(parsed.target_audience, list(canonical.target_audience), 1000),
    who_this_is_not_for: normalizeRichTextList(parsed.who_this_is_not_for, list(canonical.who_this_is_not_for), 1000),
    audience_supporting_text: richTextForPlain(parsed.audience_supporting_text, canonical.audience_supporting_text || '', FIELD_LIMITS.audience_supporting_text),
    subheadline: richTextForPlain(parsed.subheadline, canonical.subheadline || '', FIELD_LIMITS.subheadline),
    what_youll_explore: sanitizeBlocks(parsed.what_youll_explore, canonical.what_youll_explore),
    meet_the_tutor: richTextForPlain(parsed.meet_the_tutor, canonical.meet_the_tutor || '', FIELD_LIMITS.meet_the_tutor),
    explore_more: sanitizeRecommendations(parsed.explore_more, canonical.explore_more),
  }
}

export function emptyCourseRichContent() {
  return sanitizeCourseRichContent({}, {})
}

export function enrichRichList(plainValues, richValues, maxLength = 1000) {
  const values = list(plainValues)
  const normalized = normalizeRichTextList(richValues, values, maxLength)
  return values.map((text, index) => ({ text, rich: normalized[index] || createRichText(text, maxLength) }))
}

export function enrichContentBlocks(plainBlocks, richBlocks) {
  const sanitized = sanitizeBlocks(richBlocks, plainBlocks)
  return list(plainBlocks).map((block, index) => ({
    ...block,
    rich_text: sanitized[index]?.text || createRichText(block?.text || '', 8000),
    rich_items: sanitized[index]?.items || list(block?.items).map((item) => createRichText(item, 1200)),
  }))
}

export function enrichExploreMore(plainItems, richItems) {
  const sanitized = sanitizeRecommendations(richItems, plainItems)
  return list(plainItems).map((item, index) => ({
    ...item,
    description_rich: sanitized[index]?.description || createRichText(item?.description || '', 3000),
  }))
}
