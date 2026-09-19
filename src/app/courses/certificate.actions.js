'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { isStaffRole } from '@/lib/auth-utils'
import {
  certificateFileName,
  generateCourseCertificatePdf,
} from '@/lib/certificates/generate-certificate.mjs'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function certificateStoragePath(templateUrl) {
  if (!templateUrl) return null

  try {
    const pathname = new URL(templateUrl).pathname
    const markers = [
      '/storage/v1/object/public/certificates/',
      '/storage/v1/object/sign/certificates/',
      '/storage/v1/object/authenticated/certificates/',
    ]
    const marker = markers.find((candidate) => pathname.includes(candidate))
    if (!marker) return null

    const filePath = decodeURIComponent(pathname.split(marker)[1] || '')
    if (!filePath || filePath.split('/').some((part) => part === '..')) return null
    return filePath
  } catch {
    return null
  }
}

function latestCompletionDate(progressRows) {
  const dates = (progressRows || [])
    .map((row) => row.completed_at)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))

  return dates.length
    ? new Date(Math.max(...dates.map((date) => date.getTime())))
    : null
}

/**
 * Generates a personalized PDF certificate for a user.
 */
export async function generateCertificate(courseId) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) return { success: false, error: 'Please sign in again to download your certificate.' }
  if (!UUID_PATTERN.test(courseId || '')) return { success: false, error: 'The selected course is invalid.' }

  const adminSupabase = await createAdminClient()
  const [
    { data: course, error: courseError },
    { data: enrollment, error: enrollmentError },
    { data: lessons, error: lessonsError },
    { data: profile, error: profileError },
  ] = await Promise.all([
    adminSupabase
      .from('courses')
      .select('title, certificate_template_url')
      .eq('id', courseId)
      .is('deleted_at', null)
      .maybeSingle(),
    adminSupabase
      .from('user_enrollments')
      .select('id, payment_status')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .in('payment_status', ['completed', 'staff'])
      .maybeSingle(),
    adminSupabase
      .from('lessons')
      .select('id')
      .eq('course_id', courseId),
    adminSupabase
      .from('users')
      .select('first_name, last_name, role')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (courseError || !course?.certificate_template_url) {
    return { success: false, error: 'No certificate is available for this course.' }
  }
  if (enrollmentError || lessonsError || profileError || !enrollment || !profile || !lessons?.length) {
    return { success: false, error: 'Certificate access is not available.' }
  }
  if (enrollment.payment_status === 'staff' && !isStaffRole(profile.role)) {
    return { success: false, error: 'Certificate access is not available.' }
  }

  const { data: completedLessons, error: progressError } = await adminSupabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('user_id', user.id)
    .eq('enrollment_id', enrollment.id)
    .eq('is_completed', true)
    .in('lesson_id', lessons.map((lesson) => lesson.id))

  const completedIds = new Set((completedLessons || []).map((lesson) => lesson.lesson_id))
  if (progressError || !lessons.every((lesson) => completedIds.has(lesson.id))) {
    return { success: false, error: 'Complete every lesson before downloading your certificate.' }
  }

  const learnerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
  if (!learnerName) {
    return { success: false, error: 'Add your name in Profile & Security before downloading your certificate.' }
  }

  const completedAt = latestCompletionDate(completedLessons)
  if (!completedAt) {
    return { success: false, error: 'The course completion date is not available yet.' }
  }

  try {
    const filePath = certificateStoragePath(course.certificate_template_url)
    if (!filePath) {
      throw new Error('Could not determine the certificate template path.')
    }

    const { data: pdfData, error: downloadError } = await adminSupabase.storage
      .from('certificates')
      .download(filePath)

    if (downloadError) {
      throw new Error(`Template download failed: ${downloadError.message}`)
    }

    const generatedPdf = await generateCourseCertificatePdf({
      templateBytes: await pdfData.arrayBuffer(),
      learnerName,
      courseTitle: course.title,
      completedAt,
    })

    return {
      success: true,
      pdf: Buffer.from(generatedPdf).toString('base64'),
      fileName: certificateFileName(course.title),
    }
  } catch (error) {
    console.error('Certificate generation error:', error)
    return { success: false, error: 'Could not prepare the certificate. Please try again.' }
  }
}
