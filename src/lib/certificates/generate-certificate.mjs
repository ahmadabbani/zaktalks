import { readFile } from 'node:fs/promises'
import path from 'node:path'
import fontkit from '@pdf-lib/fontkit'
import {
  PDFDocument,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setCharacterSqueeze,
  setFillingColor,
  setFontAndSize,
  setTextMatrix,
  showText,
} from 'pdf-lib'

const REFERENCE_PAGE = Object.freeze({ width: 841.89, height: 595.276 })
const TEAL = rgb(34 / 255, 141 / 255, 157 / 255)
const WHITE = rgb(1, 1, 1)
const FONT_PATH = path.join(
  process.cwd(),
  'src',
  'lib',
  'certificates',
  'assets',
  'Montserrat-Certificate-SemiBold.ttf'
)

let certificateFontBytesPromise

function getCertificateFontBytes() {
  certificateFontBytesPromise ||= readFile(FONT_PATH)
  return certificateFontBytesPromise
}

function cleanDisplayText(value, { uppercase = false } = {}) {
  const clean = String(value || '').normalize('NFC').replace(/\s+/g, ' ').trim()
  return uppercase ? clean.toLocaleUpperCase('en') : clean
}

function scaledRect(rect, scaleX, scaleY) {
  return {
    x: rect.x * scaleX,
    y: rect.y * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  }
}

function fittedFontSize(font, text, preferredSize, minimumSize, maxWidth, horizontalScale) {
  let size = preferredSize
  while (
    size > minimumSize &&
    font.widthOfTextAtSize(text, size) * horizontalScale > maxWidth
  ) {
    size -= 0.25
  }
  return Math.max(minimumSize, size)
}

function drawCenteredText(page, font, text, options) {
  const {
    centerX,
    baselineY,
    preferredSize,
    minimumSize,
    maxWidth,
    horizontalScale = 0.96,
  } = options
  const size = fittedFontSize(
    font,
    text,
    preferredSize,
    minimumSize,
    maxWidth,
    horizontalScale
  )
  const renderedWidth = font.widthOfTextAtSize(text, size) * horizontalScale
  const x = centerX - renderedWidth / 2
  const fontKey = page.node.newFontDictionary(font.name, font.ref)

  page.pushOperators(
    pushGraphicsState(),
    beginText(),
    setFillingColor(TEAL),
    setFontAndSize(fontKey, size),
    setCharacterSqueeze(horizontalScale * 100),
    setTextMatrix(1, 0, 0, 1, x, baselineY),
    showText(font.encodeText(text)),
    endText(),
    popGraphicsState()
  )
}

export function formatCertificateDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('The course completion date is invalid.')

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Beirut',
  }).format(date)
}

export function certificateFileName(courseTitle) {
  const safeTitle = cleanDisplayText(courseTitle)
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '')
    .replace(/[. ]+$/g, '')
    .slice(0, 100)
  return `Okayness Certification - ${safeTitle || 'Course'}.pdf`
}

/**
 * Personalizes the approved Okayness certificate layout.
 *
 * All coordinates are proportional to the supplied A4 landscape template so
 * later course templates can reuse the same layout without storing per-course
 * positioning data.
 */
export async function generateCourseCertificatePdf({
  templateBytes,
  learnerName,
  courseTitle,
  completedAt,
}) {
  const displayName = cleanDisplayText(learnerName, { uppercase: true })
  const displayCourse = cleanDisplayText(courseTitle, { uppercase: true })
  const displayDate = formatCertificateDate(completedAt)

  if (!displayName) throw new Error('A learner name is required for the certificate.')
  if (!displayCourse) throw new Error('A course title is required for the certificate.')
  if (!templateBytes?.byteLength) throw new Error('The certificate template is empty.')

  const pdfDoc = await PDFDocument.load(templateBytes, { updateMetadata: false })
  if (pdfDoc.getPageCount() < 1) throw new Error('The certificate template has no pages.')

  pdfDoc.registerFontkit(fontkit)
  const font = await pdfDoc.embedFont(await getCertificateFontBytes(), {
    subset: true,
    customName: 'OkaynessCertificateSemiBold',
  })
  const page = pdfDoc.getPage(0)
  const { width, height } = page.getSize()
  const scaleX = width / REFERENCE_PAGE.width
  const scaleY = height / REFERENCE_PAGE.height
  const typeScale = Math.min(scaleX, scaleY)

  // Cover only the three replaceable values. Static certificate artwork and
  // labels stay untouched so their original typography remains exact.
  for (const rect of [
    { x: 220, y: 359.776, width: 402, height: 35.5 },
    { x: 92, y: 265.276, width: 658, height: 36 },
    { x: 526, y: 62.276, width: 151, height: 17.75 },
  ]) {
    page.drawRectangle({ ...scaledRect(rect, scaleX, scaleY), color: WHITE })
  }

  drawCenteredText(page, font, displayName, {
    centerX: (REFERENCE_PAGE.width / 2) * scaleX,
    baselineY: 368.906 * scaleY,
    preferredSize: 26 * typeScale,
    minimumSize: 18 * typeScale,
    maxWidth: 590 * scaleX,
    horizontalScale: 0.96,
  })
  drawCenteredText(page, font, displayCourse, {
    centerX: (REFERENCE_PAGE.width / 2) * scaleX,
    baselineY: 274.8164 * scaleY,
    preferredSize: 26 * typeScale,
    minimumSize: 15 * typeScale,
    maxWidth: 640 * scaleX,
    horizontalScale: 0.965,
  })
  drawCenteredText(page, font, displayDate, {
    centerX: 601.27 * scaleX,
    baselineY: 68.196 * scaleY,
    preferredSize: 13 * typeScale,
    minimumSize: 10 * typeScale,
    maxWidth: 145 * scaleX,
    horizontalScale: 0.96,
  })

  return pdfDoc.save({ useObjectStreams: false })
}
