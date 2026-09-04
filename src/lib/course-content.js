export const PUBLIC_PAGE_OPTIONS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Podcast', path: '/speaking' },
  { label: 'One-on-one Coaching', path: '/one-on-one' },
  { label: 'Becoming Again Program', path: '/becoming-again' },
  { label: 'Events', path: '/events' },
  { label: 'Contact', path: '/contact' },
]

export const PUBLIC_PAGE_PATHS = new Set(PUBLIC_PAGE_OPTIONS.map((page) => page.path))

export function normalizeContentBlocks(value) {
  if (!Array.isArray(value)) return []

  return value.map((item) => ({
    title: typeof item?.title === 'string' ? item.title : '',
    content_type: item?.content_type === 'list' ? 'list' : 'text',
    text: typeof item?.text === 'string' ? item.text : '',
    items: Array.isArray(item?.items)
      ? item.items.filter((entry) => typeof entry === 'string').map((entry) => entry)
      : [],
  }))
}

export function normalizeExploreMore(value) {
  if (!Array.isArray(value)) return []

  return value.map((item) => ({
    target_type: item?.target_type === 'page' ? 'page' : 'course',
    course_id: typeof item?.course_id === 'string' ? item.course_id : '',
    page_path: typeof item?.page_path === 'string' ? item.page_path : '',
    description: typeof item?.description === 'string' ? item.description : '',
    cta_text: typeof item?.cta_text === 'string' ? item.cta_text : '',
  }))
}

export function legacyDetailsToBlocks(structuredValue, legacyValue) {
  const structured = normalizeContentBlocks(structuredValue)
  if (structured.length > 0) return structured

  const legacyText = typeof legacyValue === 'string' ? legacyValue.trim() : ''
  return legacyText
    ? [{ title: 'Details', content_type: 'text', text: legacyText, items: [] }]
    : []
}
