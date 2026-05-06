'use server'

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { getAssessmentById } from '@/assessments/registry'

const BUCKET = 'specific-assessments'

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

  const drawRule = () => {
    ensureSpace(18)
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.82, 0.82, 0.82)
    })
    y -= 18
  }

  return { drawWrapped, drawRule, ensureSpace, get y() { return y }, set y(value) { y = value } }
}

async function generateWorksheetPdf(definition, answers, profile) {
  const pdfDoc = await PDFDocument.create()
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  }
  const writer = createPdfWriter(pdfDoc, fonts)
  const name = `${profile?.first_name || 'Student'} ${profile?.last_name || ''}`.trim()
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  writer.drawWrapped(definition.title, {
    font: fonts.bold,
    size: 22,
    lineHeight: 28,
    color: rgb(0.05, 0.05, 0.05),
    after: 10
  })
  writer.drawWrapped(`Completed by: ${name || 'Student'}    Date: ${date}`, {
    font: fonts.bold,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
    after: 12
  })
  writer.drawWrapped(definition.intro, {
    size: 10,
    lineHeight: 15,
    color: rgb(0.22, 0.22, 0.22),
    after: 16
  })
  writer.drawRule()

  for (const section of definition.sections || []) {
    writer.ensureSpace(96)
    writer.drawWrapped(section.title, {
      font: fonts.bold,
      size: 16,
      lineHeight: 20,
      color: rgb(0.05, 0.05, 0.05),
      after: 8
    })

    writer.drawWrapped('Old Story', {
      font: fonts.bold,
      size: 12,
      color: rgb(0.75, 0.24, 0.16),
      after: 5
    })

    for (const line of section.oldStory || []) {
      writer.drawWrapped(renderLineText(line, answers?.[section.id]?.oldStory), {
        size: 10,
        lineHeight: 14,
        color: rgb(0.05, 0.05, 0.05),
        after: 6
      })
    }

    writer.drawWrapped('New Story', {
      font: fonts.bold,
      size: 12,
      color: rgb(0.13, 0.48, 0.27),
      after: 5
    })

    for (const line of section.newStory || []) {
      writer.drawWrapped(renderLineText(line, answers?.[section.id]?.newStory), {
        size: 10,
        lineHeight: 14,
        color: rgb(0.05, 0.05, 0.05),
        after: 6
      })
    }

    writer.drawRule()
  }

  return pdfDoc.save()
}

async function getVerifiedContext(supabase, user, lessonId, options = {}) {
  const requireSpecificAssessment = options.requireSpecificAssessment !== false
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, course_id, assessment_key')
    .eq('id', lessonId)
    .single()

  if (lessonError || !lesson) throw new Error('Lesson not found.')

  const { data: enrollment, error: enrollmentError } = await supabase
    .from('user_enrollments')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', lesson.course_id)
    .single()

  if (enrollmentError || !enrollment) throw new Error('Enrollment not found.')

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
    await getVerifiedContext(supabase, user, lessonId, { requireSpecificAssessment: false })

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

export async function submitSpecificAssessment({ lessonId, assessmentKey, answers }) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const definition = getAssessmentById(assessmentKey)
    if (!definition || definition.type !== 'fillable-worksheet') {
      throw new Error('Worksheet assessment not found.')
    }

    const { lesson, enrollment } = await getVerifiedContext(supabase, user, lessonId)
    if (lesson.assessment_key !== assessmentKey) {
      throw new Error('This worksheet does not belong to the current lesson.')
    }

    const normalizedAnswers = buildAnswers(definition, answers)
    validateAnswers(definition, normalizedAnswers)

    const { data: profile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const pdfBytes = await generateWorksheetPdf(definition, normalizedAnswers, profile)
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

    const { error: progressError } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id: user.id,
        lesson_id: lessonId,
        enrollment_id: enrollment.id,
        watch_time_seconds: 0,
        is_completed: true,
        score: existingProgress?.score || null,
        completed_at: existingProgress?.completed_at || now,
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
