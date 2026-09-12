'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

/**
 * Generates a personalized PDF certificate for a user.
 */
export async function generateCertificate(courseId) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('title, certificate_template_url')
    .eq('id', courseId)
    .is('deleted_at', null)
    .maybeSingle()

  if (courseError || !course?.certificate_template_url) {
    return { success: false, error: 'No certificate is available for this course.' }
  }

  const [{ data: enrollment, error: enrollmentError }, { data: lessons, error: lessonsError }] = await Promise.all([
    supabase
      .from('user_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .in('payment_status', ['completed', 'staff'])
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId),
  ])

  if (enrollmentError || lessonsError || !enrollment || !lessons?.length) {
    return { success: false, error: 'Certificate access is not available.' }
  }

  const { data: completedLessons, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('user_id', user.id)
    .eq('is_completed', true)
    .in('lesson_id', lessons.map((lesson) => lesson.id))

  const completedIds = new Set((completedLessons || []).map((lesson) => lesson.lesson_id))
  if (progressError || !lessons.every((lesson) => completedIds.has(lesson.id))) {
    return { success: false, error: 'Complete every lesson before downloading your certificate.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()

  try {
    const adminSupabase = await createAdminClient() // Private template, after access is verified.
    // 4. Download Template from Storage
    // Extract everything after 'certificates/' to get the full path
    const certMarker = '/certificates/'
    const markerIndex = course.certificate_template_url.indexOf(certMarker)
    const filePath = markerIndex !== -1 
      ? decodeURIComponent(course.certificate_template_url.substring(markerIndex + certMarker.length))
      : null
    
    if (!filePath) {
        console.error('Full URL was:', course.certificate_template_url)
        throw new Error('Could not determine file path from URL')
    }

    const { data: pdfData, error: downloadError } = await adminSupabase.storage
      .from('certificates')
      .download(filePath)

    if (downloadError) {
      console.error('Download Error:', downloadError)
      throw new Error(`Template download failed: ${downloadError.message}`)
    }

    const pdfBytes = await pdfData.arrayBuffer()

    // 5. Load PDF and Modify
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pages = pdfDoc.getPages()
    const firstPage = pages[0]
    const { width, height } = firstPage.getSize()

    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const fontSize = 36
    const name = `${profile?.first_name || 'Student'} ${profile?.last_name || ''}`.trim()
    const nameWidth = font.widthOfTextAtSize(name, fontSize)

    // Center Name (Horizontal and Vertical)
    firstPage.drawText(name, {
      x: (width - nameWidth) / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    })

    // Add Date (Bottom Right)
    const dateStr = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    })
    const dateFontSize = 14
    const dateWidth = font.widthOfTextAtSize(dateStr, dateFontSize)
    
    firstPage.drawText(dateStr, {
      x: width - dateWidth - 50,
      y: 50,
      size: dateFontSize,
      font,
      color: rgb(0, 0, 0),
    })

    // 6. Serialize to Base64
    const modifiedPdfBytes = await pdfDoc.save()
    const base64 = Buffer.from(modifiedPdfBytes).toString('base64')

    return { 
        success: true, 
        pdf: base64, 
        fileName: `${course.title.replace(/\s+/g, '_')}_Certificate.pdf` 
    }

  } catch (error) {
    console.error('Certificate generation error:', error)
    return { success: false, error: 'Could not generate certificate' }
  }
}
