import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CourseDetailsExperience from './CourseDetailsExperience'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title, description')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  return {
    title: course ? `${course.title} | ZakTalks` : 'Course Details',
    description: course?.description || 'Explore this learning experience from ZakTalks.'
  }
}

export default async function CourseDetailPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()

  const [{ data: course, error: courseError }, { data: authData }] = await Promise.all([
    supabase
      .from('courses')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single(),
    supabase.auth.getUser()
  ])

  if (courseError || !course) notFound()

  const user = authData?.user || null
  const enrollmentRequest = user
    ? supabase
        .from('user_enrollments')
        .select('id, payment_status')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .eq('payment_status', 'completed')
        .maybeSingle()
    : Promise.resolve({ data: null })

  const [
    { data: modules },
    { data: lessons },
    { data: faqs },
    { data: galleryImages },
    { data: relatedCourses },
    { data: enrollment }
  ] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, title, description, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('lessons')
      .select('id, module_id, title, description, type, duration_seconds, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('course_faqs')
      .select('id, question, answer, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('course_images')
      .select('id, image_url, alt_text, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('courses')
      .select('id, title, slug, description, subheadline, logo_url, price_cents')
      .eq('is_published', true)
      .is('deleted_at', null)
      .neq('id', course.id)
      .order('created_at', { ascending: false })
      .limit(4),
    enrollmentRequest
  ])

  let curriculumPosition = 0
  const curriculumModules = (modules || []).map((module) => ({
    ...module,
    lessons: (lessons || [])
      .filter((lesson) => lesson.module_id === module.id)
      .map((lesson) => ({ ...lesson, curriculumPosition: ++curriculumPosition }))
  }))

  return (
    <CourseDetailsExperience
      course={course}
      curriculumModules={curriculumModules}
      galleryImages={galleryImages || []}
      faqs={faqs || []}
      relatedCourses={relatedCourses || []}
      isLoggedIn={Boolean(user)}
      isEnrolled={Boolean(enrollment)}
    />
  )
}
