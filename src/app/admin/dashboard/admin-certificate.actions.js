'use server'

import { requirePermission, isStaffRole } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import {
  certificateFileName,
  generateCourseCertificatePdf,
} from '@/lib/certificates/generate-certificate.mjs'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function storagePath(templateUrl) {
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
    return filePath && !filePath.split('/').some((part) => part === '..') ? filePath : null
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

  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null
}

export async function generateAdminCertificate(enrollmentId) {
  try {
    await requirePermission('users.certificates')
  } catch {
    return { success: false, error: 'You do not have permission to download certificates.' }
  }

  if (!UUID_PATTERN.test(String(enrollmentId || ''))) {
    return { success: false, error: 'The certificate record is invalid.' }
  }

  const supabase = await createAdminClient()
  const { data: enrollment, error: enrollmentError } = await supabase
    .from('user_enrollments')
    .select('id, user_id, course_id, payment_status')
    .eq('id', enrollmentId)
    .maybeSingle()

  if (
    enrollmentError ||
    !enrollment ||
    !['completed', 'staff'].includes(enrollment.payment_status)
  ) {
    return { success: false, error: 'The certificate record is no longer available.' }
  }

  const [
    { data: account, error: accountError },
    { data: course, error: courseError },
    { data: lessons, error: lessonsError },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('first_name, last_name, role')
      .eq('id', enrollment.user_id)
      .maybeSingle(),
    supabase
      .from('courses')
      .select('title, certificate_template_url')
      .eq('id', enrollment.course_id)
      .is('deleted_at', null)
      .maybeSingle(),
    supabase
      .from('lessons')
      .select('id')
      .eq('course_id', enrollment.course_id),
  ])

  if (
    accountError ||
    courseError ||
    lessonsError ||
    !account ||
    !course?.certificate_template_url ||
    !lessons?.length ||
    (enrollment.payment_status === 'staff' && !isStaffRole(account.role))
  ) {
    return { success: false, error: 'The certificate is no longer eligible for download.' }
  }

  const { data: completedLessons, error: progressError } = await supabase
    .from('lesson_progress')
    .select('lesson_id, completed_at')
    .eq('enrollment_id', enrollment.id)
    .eq('user_id', enrollment.user_id)
    .eq('is_completed', true)
    .in('lesson_id', lessons.map((lesson) => lesson.id))

  const completedIds = new Set((completedLessons || []).map((row) => row.lesson_id))
  const completedAt = latestCompletionDate(completedLessons)
  if (
    progressError ||
    !completedAt ||
    !lessons.every((lesson) => completedIds.has(lesson.id))
  ) {
    return { success: false, error: 'This account has not completed every course lesson.' }
  }

  const learnerName = [account.first_name, account.last_name].filter(Boolean).join(' ').trim()
  if (!learnerName) {
    return { success: false, error: 'This account needs a full name before a certificate can be generated.' }
  }

  try {
    const filePath = storagePath(course.certificate_template_url)
    if (!filePath) throw new Error('The certificate template path is invalid.')

    const { data: template, error: templateError } = await supabase.storage
      .from('certificates')
      .download(filePath)
    if (templateError || !template) throw templateError || new Error('Certificate template unavailable.')

    const generatedPdf = await generateCourseCertificatePdf({
      templateBytes: await template.arrayBuffer(),
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
    console.error('Admin certificate generation failed:', error)
    return { success: false, error: 'The certificate could not be prepared. Please try again.' }
  }
}
