import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { normalizeExploreMore, PUBLIC_PAGE_OPTIONS } from '@/lib/course-content'
import { extractYouTubeVideoId, getYouTubeVideoDurations } from '@/lib/youtube'
import { notFound } from 'next/navigation'
import CourseDetailsExperience from './CourseDetailsExperience'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title, description, promise')
    .eq('slug', slug)
    .is('deleted_at', null)
    .single()

  return {
    title: course ? `${course.title} | ZakTalks` : 'Course Details',
    description: course?.description || course?.promise || 'Explore this learning experience from ZakTalks.'
  }
}

export default async function CourseDetailPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const publicCurriculumClient = await createAdminClient()

  const [{ data: course, error: courseError }, { data: authData }] = await Promise.all([
    supabase
      .from('courses')
      .select(`
        id,
        title,
        price_cents,
        promise,
        short_introduction,
        primary_cta_text,
        bold_introduction,
        subheadline,
        description,
        course_info_modules,
        course_level,
        course_language,
        flexible_schedule,
        course_support,
        what_youll_learn,
        skills_youll_gain,
        details_to_know,
        details_to_know_items,
        details_cta_text,
        target_audience_title,
        target_audience,
        who_this_is_not_for_title,
        who_this_is_not_for,
        audience_supporting_text,
        what_youll_explore,
        introduction_video_url,
        tutor_name,
        meet_the_tutor,
        explore_more,
        rich_content
      `)
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
    { data: enrollment }
  ] = await Promise.all([
    supabase
      .from('course_modules')
      .select('id, title, description, rich_content, display_order')
      .eq('course_id', course.id)
      .order('display_order', { ascending: true }),
    // This server-only query deliberately exposes curriculum metadata without
    // granting anonymous clients access to protected lesson records.
    publicCurriculumClient
      .from('lessons')
      .select('id, module_id, title, description, rich_content, type, duration_seconds, youtube_url, display_order')
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
    enrollmentRequest
  ])

  const configuredExploreMore = normalizeExploreMore(course.explore_more)
  const configuredCourseIds = [...new Set(
    configuredExploreMore
      .filter((item) => item.target_type === 'course' && item.course_id && item.course_id !== course.id)
      .map((item) => item.course_id)
  )]
  const missingDurationUrls = (lessons || [])
    .filter((lesson) => lesson.type === 'video' && !Number(lesson.duration_seconds) && lesson.youtube_url)
    .map((lesson) => lesson.youtube_url)

  const [durationByVideoId, exploreCourseResult] = await Promise.all([
    getYouTubeVideoDurations(missingDurationUrls),
    configuredCourseIds.length
      ? supabase
          .from('courses')
          .select('id, slug, title, logo_url')
          .in('id', configuredCourseIds)
          .eq('is_published', true)
          .is('deleted_at', null)
      : Promise.resolve({ data: [] })
  ])

  const safeLessons = (lessons || []).map(({ youtube_url: youtubeUrl, ...lesson }) => {
    const videoId = extractYouTubeVideoId(youtubeUrl)
    const resolvedDuration = Number(lesson.duration_seconds) || Number(durationByVideoId[videoId]) || null

    return {
      ...lesson,
      duration_seconds: lesson.type === 'video' ? resolvedDuration : lesson.duration_seconds,
    }
  })

  const exploreCoursesById = new Map((exploreCourseResult.data || []).map((item) => [item.id, item]))
  const publicPagesByPath = new Map(PUBLIC_PAGE_OPTIONS.map((item) => [item.path, item]))
  const exploreMoreItems = configuredExploreMore.flatMap((item, index) => {
    if (item.target_type === 'page') {
      const page = publicPagesByPath.get(item.page_path)
      if (!page) return []

      return [{
        id: `page-${page.path}-${index}`,
        target_type: 'page',
        title: page.label,
        target_path: page.path,
        description: item.description,
        rich_description: course.rich_content?.explore_more?.[index]?.description,
        cta_text: item.cta_text,
        image_url: null,
      }]
    }

    const recommendedCourse = exploreCoursesById.get(item.course_id)
    if (!recommendedCourse) return []

    return [{
      id: `course-${recommendedCourse.id}-${index}`,
      target_type: 'course',
      title: recommendedCourse.title,
      target_path: `/courses/${recommendedCourse.slug}`,
      description: item.description,
      rich_description: course.rich_content?.explore_more?.[index]?.description,
      cta_text: item.cta_text,
      image_url: recommendedCourse.logo_url,
    }]
  })

  let curriculumPosition = 0
  const curriculumModules = (modules || []).map((module) => ({
    ...module,
    lessons: safeLessons
      .filter((lesson) => lesson.module_id === module.id)
      .map((lesson) => ({ ...lesson, curriculumPosition: ++curriculumPosition }))
  }))

  return (
    <CourseDetailsExperience
      course={course}
      curriculumModules={curriculumModules}
      galleryImages={galleryImages || []}
      faqs={faqs || []}
      exploreMoreItems={exploreMoreItems}
      isLoggedIn={Boolean(user)}
      isEnrolled={Boolean(enrollment)}
    />
  )
}
