'use server'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAssessmentById } from '@/assessments/registry'
import { verifyLessonProgressAccess } from '@/lib/course-progress.server'

const BUCKET = 'specific-assessments'
const ARCHETYPE_REFRAMING_ID = 'archetype-script-reframing-worksheet-v1'
const PDF_BRAND = {
  teal: rgb(37 / 255, 140 / 255, 155 / 255),
  yellow: rgb(241 / 255, 196 / 255, 15 / 255),
  black: rgb(33 / 255, 44 / 255, 45 / 255),
  muted: rgb(92 / 255, 108 / 255, 110 / 255),
}

function sanitizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function buildAnswers(definition, rawAnswers) {
  const answers = {}

  for (const section of definition.sections || []) {
    answers[section.id] = { oldStory: {}, newStory: {} }

    for (const field of getFields(section.oldStory)) {
      answers[section.id].oldStory[field.id] = sanitizeText(rawAnswers?.[section.id]?.oldStory?.[field.id])
    }

    for (const field of getFields(section.newStory)) {
      const value = rawAnswers?.[section.id]?.newStory?.[field.id] ?? ''
      answers[section.id].newStory[field.id] = sanitizeText(value)
    }
  }

  return answers
}

function validateAnswers(definition, answers) {
  for (const section of definition.sections || []) {
    for (const [group, lines] of [['oldStory', section.oldStory], ['newStory', section.newStory]]) {
      for (const field of getFields(lines)) {
        if (!answers?.[section.id]?.[group]?.[field.id]) {
          throw new Error('Please complete every worksheet field before submitting.')
        }
      }
    }
  }
}

function getFields(lines = []) {
  return lines.flatMap(line => (line.parts || []).filter(part => typeof part === 'object' && part.id))
}

function renderLineText(line, answers) {
  if (line.text) return line.text

  return (line.parts || [])
    .map(part => {
      if (typeof part === 'string') return part
      return answers?.[part.id] || '__________'
    })
    .join('')
}

function renderLineSegments(line, answers) {
  if (line.text) return [{ text: line.text, isAnswer: false }]

  return (line.parts || []).map((part) => {
    if (typeof part === 'string') return { text: part, isAnswer: false }
    return {
      text: answers?.[part.id] || '__________',
      isAnswer: true,
    }
  })
}

function wrapText(text, font, size, maxWidth) {
  const words = sanitizeText(text).split(' ').filter(Boolean)
  const lines = []
  let line = ''

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(testLine, size) <= maxWidth) {
      line = testLine
    } else {
      if (line) lines.push(line)
      line = word
    }
  }

  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

function createPdfWriter(pdfDoc, fonts) {
  const margin = 48
  const pageWidth = 612
  const pageHeight = 792
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  const ensureSpace = (heightNeeded) => {
    if (y - heightNeeded < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
    }
  }

  const drawWrapped = (text, options = {}) => {
    const font = options.font || fonts.regular
    const size = options.size || 10
    const color = options.color || rgb(0.12, 0.12, 0.12)
    const lineHeight = options.lineHeight || size + 4
    const maxWidth = options.maxWidth || pageWidth - margin * 2
    const lines = wrapText(text, font, size, maxWidth)

    ensureSpace(lines.length * lineHeight + (options.after || 0))
    for (const line of lines) {
      page.drawText(line, {
        x: options.x || margin,
        y,
        size,
        font,
        color
      })
      y -= lineHeight
    }
    y -= options.after || 0
  }

  const drawRichWrapped = (segments, options = {}) => {
    const regularFont = options.font || fonts.regular
    const answerFont = options.answerFont || fonts.bold
    const size = options.size || 10
    const lineHeight = options.lineHeight || size + 5
    const maxWidth = options.maxWidth || pageWidth - margin * 2
    const startX = options.x || margin
    const defaultColor = options.color || PDF_BRAND.black
    const answerColor = options.answerColor || PDF_BRAND.teal
    const spaceWidth = regularFont.widthOfTextAtSize(' ', size)
    const lines = [[]]
    let lineWidth = 0
    let pendingGap = 0

    for (const segment of segments || []) {
      const segmentFont = segment.isAnswer ? answerFont : regularFont
      const tokens = String(segment.text || '').match(/\s+|[^\s]+/g) || []

      for (const token of tokens) {
        if (/^\s+$/.test(token)) {
          pendingGap = spaceWidth
          continue
        }

        const tokenWidth = segmentFont.widthOfTextAtSize(token, size)
        const currentLine = lines[lines.length - 1]
        const gap = currentLine.length ? pendingGap : 0

        if (currentLine.length && lineWidth + gap + tokenWidth > maxWidth) {
          lines.push([])
          lineWidth = 0
        }

        const activeLine = lines[lines.length - 1]
        const activeGap = activeLine.length ? pendingGap : 0
        const renderedText = activeGap ? ` ${token}` : token
        const renderedWidth = segmentFont.widthOfTextAtSize(renderedText, size)
        activeLine.push({
          text: renderedText,
          isAnswer: segment.isAnswer,
          font: segmentFont,
          width: renderedWidth,
          gap: 0,
        })
        lineWidth += renderedWidth
        pendingGap = 0
      }
    }

    ensureSpace(lines.length * lineHeight + (options.after || 0))
    for (const line of lines) {
      let x = startX

      for (const item of line) {
        x += item.gap
        page.drawText(item.text, {
          x,
          y,
          size,
          font: item.font,
          color: item.isAnswer ? answerColor : defaultColor,
        })
        x += item.width
      }
      y -= lineHeight
    }
    y -= options.after || 0
  }

  const drawRule = (options = {}) => {
    ensureSpace(18)
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: options.thickness || 1,
      color: options.color || rgb(0.82, 0.82, 0.82)
    })
    y -= options.after ?? 18
  }

  return { drawWrapped, drawRichWrapped, drawRule, ensureSpace, get y() { return y }, set y(value) { y = value } }
}

async function generateWorksheetPdf(definition, answers, profile) {
  const pdfDoc = await PDFDocument.create()
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  }
  const writer = createPdfWriter(pdfDoc, fonts)
  const isArchetypeReframing = definition.id === ARCHETYPE_REFRAMING_ID
  const name = `${profile?.first_name || 'Student'} ${profile?.last_name || ''}`.trim()
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  if (isArchetypeReframing) {
    writer.drawWrapped('OKAYNESS  /  REFLECTION WORKSHEET', {
      font: fonts.bold,
      size: 8,
      color: PDF_BRAND.yellow,
      after: 14
    })
  }

  writer.drawWrapped(definition.title, {
    font: fonts.bold,
    size: isArchetypeReframing ? 24 : 22,
    lineHeight: isArchetypeReframing ? 30 : 28,
    color: isArchetypeReframing ? PDF_BRAND.teal : rgb(0.05, 0.05, 0.05),
    after: 10
  })
  writer.drawWrapped(isArchetypeReframing
    ? `Completed by: ${name || 'Student'}    |    Date: ${date}`
    : `Completed by: ${name || 'Student'}    Date: ${date}`, {
    font: fonts.bold,
    size: 10,
    color: isArchetypeReframing ? PDF_BRAND.muted : rgb(0.35, 0.35, 0.35),
    after: 12
  })
  writer.drawWrapped(definition.intro, {
    size: 10,
    lineHeight: 15,
    color: isArchetypeReframing ? PDF_BRAND.black : rgb(0.22, 0.22, 0.22),
    after: 16
  })
  writer.drawRule(isArchetypeReframing
    ? { color: PDF_BRAND.yellow, thickness: 2.5, after: 27 }
    : undefined)

  for (const section of definition.sections || []) {
    writer.ensureSpace(96)
    writer.drawWrapped(section.title, {
      font: fonts.bold,
      size: isArchetypeReframing ? 17 : 16,
      lineHeight: isArchetypeReframing ? 22 : 20,
      color: isArchetypeReframing ? PDF_BRAND.teal : rgb(0.05, 0.05, 0.05),
      after: 8
    })

    writer.drawWrapped('Old Story', {
      font: fonts.bold,
      size: 12,
      color: isArchetypeReframing ? PDF_BRAND.black : rgb(0.75, 0.24, 0.16),
      after: 5
    })

    for (const line of section.oldStory || []) {
      if (isArchetypeReframing) {
        writer.drawRichWrapped(renderLineSegments(line, answers?.[section.id]?.oldStory), {
          size: 10.5,
          lineHeight: 16,
          color: PDF_BRAND.black,
          answerColor: PDF_BRAND.teal,
          after: 7
        })
      } else {
        writer.drawWrapped(renderLineText(line, answers?.[section.id]?.oldStory), {
          size: 10,
          lineHeight: 14,
          color: rgb(0.05, 0.05, 0.05),
          after: 6
        })
      }
    }

    writer.drawWrapped('New Story', {
      font: fonts.bold,
      size: 12,
      color: isArchetypeReframing ? PDF_BRAND.teal : rgb(0.13, 0.48, 0.27),
      after: 5
    })

    for (const line of section.newStory || []) {
      if (isArchetypeReframing) {
        writer.drawRichWrapped(renderLineSegments(line, answers?.[section.id]?.newStory), {
          size: 10.5,
          lineHeight: 16,
          color: PDF_BRAND.black,
          answerColor: PDF_BRAND.teal,
          after: 7
        })
      } else {
        writer.drawWrapped(renderLineText(line, answers?.[section.id]?.newStory), {
          size: 10,
          lineHeight: 14,
          color: rgb(0.05, 0.05, 0.05),
          after: 6
        })
      }
    }

    writer.drawRule(isArchetypeReframing
      ? { color: PDF_BRAND.teal, thickness: 1.2 }
      : undefined)
  }

  if (isArchetypeReframing) {
    pdfDoc.getPages().forEach((page, index, pages) => {
      page.drawLine({
        start: { x: 48, y: 30 },
        end: { x: 564, y: 30 },
        thickness: 1.5,
        color: PDF_BRAND.yellow,
      })
      page.drawText('OKAYNESS', {
        x: 48,
        y: 17,
        size: 7,
        font: fonts.bold,
        color: PDF_BRAND.teal,
      })
      const pageLabel = `${index + 1} / ${pages.length}`
      page.drawText(pageLabel, {
        x: 564 - fonts.bold.widthOfTextAtSize(pageLabel, 7),
        y: 17,
        size: 7,
        font: fonts.bold,
        color: PDF_BRAND.muted,
      })
    })
  }

  return pdfDoc.save()
}

async function getVerifiedContext(supabase, user, lessonId, options = {}) {
  const requireSpecificAssessment = options.requireSpecificAssessment !== false
  const { lesson, enrollment } = await verifyLessonProgressAccess(
    supabase,
    user.id,
    lessonId,
    'assessment'
  )

  const { data: specificAssessment, error: specificAssessmentError } = await supabase
    .from('specific_assessment_lessons')
    .select('assessment_key, default_file_path, default_file_name')
    .eq('lesson_id', lessonId)
    .eq('assessment_key', lesson.assessment_key)
    .maybeSingle()

  if (specificAssessmentError) throw specificAssessmentError
  if (requireSpecificAssessment && !specificAssessment) {
    throw new Error('This worksheet lesson is not configured yet.')
  }

  return { lesson, enrollment, specificAssessment }
}

export async function getSpecificAssessmentSubmission({ lessonId, assessmentKey }) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    await getVerifiedContext(adminSupabase, user, lessonId, { requireSpecificAssessment: false })

    const { data: submission, error } = await supabase
      .from('specific_assessment_submissions')
      .select('answers, generated_file_path, generated_file_name, submitted_at')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .eq('assessment_key', assessmentKey)
      .maybeSingle()

    if (error) throw error

    let downloadUrl = null
    if (submission?.generated_file_path) {
      const { data: signed, error: signedError } = await adminSupabase.storage
        .from(BUCKET)
        .createSignedUrl(submission.generated_file_path, 60 * 60)

      if (!signedError) downloadUrl = signed?.signedUrl || null
    }

    return {
      success: true,
      submission: submission
        ? {
            ...submission,
            downloadUrl
          }
        : null
    }
  } catch (error) {
    console.error('Specific assessment load error:', error)
    return { success: false, error: error.message || 'Could not load saved worksheet.' }
  }
}

export async function submitSpecificAssessment({ lessonId, assessmentKey, selectedSectionId = null, answers }) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const definition = getAssessmentById(assessmentKey)
    if (!definition || definition.type !== 'fillable-worksheet') {
      throw new Error('Worksheet assessment not found.')
    }

    const { lesson, enrollment } = await getVerifiedContext(
      adminSupabase,
      user,
      lessonId,
      { requireSpecificAssessment: false }
    )
    if (lesson.assessment_key !== assessmentKey) {
      throw new Error('This worksheet does not belong to the current lesson.')
    }

    const submittedDefinition = definition.archetypeSelection
      ? {
          ...definition,
          sections: definition.sections.filter(section => section.id === selectedSectionId)
        }
      : definition

    if (definition.archetypeSelection && submittedDefinition.sections.length !== 1) {
      throw new Error('Please choose a valid financial archetype.')
    }

    const normalizedAnswers = buildAnswers(submittedDefinition, answers)
    validateAnswers(submittedDefinition, normalizedAnswers)

    const { data: profile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const pdfBytes = await generateWorksheetPdf(submittedDefinition, normalizedAnswers, profile)
    const generatedFilePath = `submissions/${user.id}/${lessonId}/latest.pdf`
    const generatedFileName = `${definition.title.replace(/[^a-z0-9]+/gi, '_')}.pdf`

    const { error: uploadError } = await adminSupabase.storage
      .from(BUCKET)
      .upload(generatedFilePath, Buffer.from(pdfBytes), {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    const now = new Date().toISOString()
    const { error: submissionError } = await supabase
      .from('specific_assessment_submissions')
      .upsert({
        lesson_id: lessonId,
        user_id: user.id,
        enrollment_id: enrollment.id,
        assessment_key: assessmentKey,
        answers: normalizedAnswers,
        generated_file_path: generatedFilePath,
        generated_file_name: generatedFileName,
        submitted_at: now,
        updated_at: now
      }, {
        onConflict: 'lesson_id,user_id'
      })

    if (submissionError) throw submissionError

    const { data: existingProgress } = await supabase
      .from('lesson_progress')
      .select('is_completed, completed_at, score')
      .eq('user_id', user.id)
      .eq('lesson_id', lessonId)
      .maybeSingle()

    const { error: progressError } = await adminSupabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        enrollment_id: enrollment.id,
        watch_time_seconds: 0,
        is_completed: true,
        score: existingProgress?.score || null,
        completed_at: existingProgress?.completed_at || now,
        playback_status: 'inactive',
        last_accessed_at: now,
        updated_at: now
      }, {
        onConflict: 'user_id,lesson_id'
      })

    if (progressError) throw progressError

    const { data: signed, error: signedError } = await adminSupabase.storage
      .from(BUCKET)
      .createSignedUrl(generatedFilePath, 60 * 60)

    if (signedError) throw signedError

    revalidatePath('/dashboard')
    revalidatePath(`/courses/[slug]/player/[lessonId]`, 'layout')

    return {
      success: true,
      submission: {
        answers: normalizedAnswers,
        generated_file_path: generatedFilePath,
        generated_file_name: generatedFileName,
        submitted_at: now,
        downloadUrl: signed?.signedUrl || null
      }
    }
  } catch (error) {
    console.error('Specific assessment submit error:', error)
    return { success: false, error: error.message || 'Could not save worksheet.' }
  }
}
