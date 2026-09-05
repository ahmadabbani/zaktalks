const DEFAULT_MAX_LENGTH = 20000
const MAX_RICH_TEXT_NODES = 500

function cleanPlainText(value, maxLength = DEFAULT_MAX_LENGTH) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .slice(0, maxLength)
    .trim()
}

function sameMarks(left, right) {
  return Boolean(left?.bold) === Boolean(right?.bold)
    && Boolean(left?.italic) === Boolean(right?.italic)
}

function appendNode(nodes, rawText, marks, remaining) {
  if (remaining <= 0 || typeof rawText !== 'string' || !rawText) return remaining

  const text = rawText.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').slice(0, remaining)
  if (!text) return remaining

  const node = { text }
  if (marks?.bold) node.bold = true
  if (marks?.italic) node.italic = true

  const previous = nodes[nodes.length - 1]
  if (previous && sameMarks(previous, node)) previous.text += node.text
  else nodes.push(node)

  return remaining - text.length
}

function trimNodes(nodes) {
  while (nodes.length && !nodes[0].text) nodes.shift()
  while (nodes.length && !nodes[nodes.length - 1].text) nodes.pop()
  if (!nodes.length) return nodes

  nodes[0].text = nodes[0].text.trimStart()
  nodes[nodes.length - 1].text = nodes[nodes.length - 1].text.trimEnd()

  return nodes.filter((node) => node.text)
}

export function createRichText(value = '', maxLength = DEFAULT_MAX_LENGTH) {
  const text = cleanPlainText(value, maxLength)
  return {
    version: 1,
    content: text ? [{ text }] : [],
  }
}

export function normalizeRichText(value, fallback = '', maxLength = DEFAULT_MAX_LENGTH) {
  const rawNodes = Array.isArray(value?.content) ? value.content : []
  const nodes = []
  let remaining = Math.max(0, Number(maxLength) || DEFAULT_MAX_LENGTH)

  for (const rawNode of rawNodes.slice(0, MAX_RICH_TEXT_NODES)) {
    if (remaining <= 0) break
    remaining = appendNode(nodes, rawNode?.text, {
      bold: rawNode?.bold === true,
      italic: rawNode?.italic === true,
    }, remaining)
  }

  const content = trimNodes(nodes)
  if (!content.length && cleanPlainText(fallback, maxLength)) return createRichText(fallback, maxLength)
  return { version: 1, content }
}

export function richTextToPlainText(value, maxLength = DEFAULT_MAX_LENGTH) {
  return normalizeRichText(value, '', maxLength).content.map((node) => node.text).join('')
}

// Formatting is accepted only when its text is the same as the canonical plain
// value. This keeps the existing text columns authoritative and prevents a
// malformed client payload from displaying different course copy.
export function richTextForPlain(value, plainValue = '', maxLength = DEFAULT_MAX_LENGTH) {
  const plainText = cleanPlainText(plainValue, maxLength)
  const candidate = normalizeRichText(value, '', maxLength)
  return richTextToPlainText(candidate, maxLength) === plainText
    ? candidate
    : createRichText(plainText, maxLength)
}

export function normalizeRichTextList(values, plainValues, maxLength = DEFAULT_MAX_LENGTH) {
  const candidates = Array.isArray(values) ? values : []
  const plains = Array.isArray(plainValues) ? plainValues : []
  let cursor = 0

  return plains.map((plainValue) => {
    const plainText = cleanPlainText(plainValue, maxLength)
    let match = null

    for (let index = cursor; index < candidates.length; index += 1) {
      const candidate = richTextForPlain(candidates[index], plainText, maxLength)
      if (richTextToPlainText(candidates[index], maxLength) === plainText) {
        match = candidate
        cursor = index + 1
        break
      }
    }

    return match || createRichText(plainText, maxLength)
  })
}

export function parseRichTextObject(value, fieldName = 'Formatted content', maxBytes = 500000) {
  if (value == null || value === '') return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value

  const raw = String(value)
  if (raw.length > maxBytes) throw new Error(`${fieldName} is too large.`)

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    throw new Error(`${fieldName} contains invalid data. Please refresh the page and try again.`)
  }
}

export function sanitizeDescriptionRichContent(value, description, maxLength = DEFAULT_MAX_LENGTH) {
  const parsed = parseRichTextObject(value)
  return {
    version: 1,
    description: richTextForPlain(parsed.description, description || '', maxLength),
  }
}

export function getRichContentObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

