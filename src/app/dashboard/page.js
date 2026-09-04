import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import UserDashboardShell from './UserDashboardShell'
import MyCoursesDashboard from './MyCoursesDashboard'
import AssessmentResultsDashboard from './AssessmentResultsDashboard'
import DiscoverCoursesDashboard from './DiscoverCoursesDashboard'
import PurchaseHistoryDashboard from './PurchaseHistoryDashboard'
import ProfileSecurityDashboard from './ProfileSecurityDashboard'
import styles from './dashboard.module.css'

export const metadata = {
  title: 'Dashboard | ZakTalks',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const publicCatalogClient = await createAdminClient()

  // 1. Fetch User Profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const [
    { data: enrollments },
    { data: progressRows },
    { data: assessmentAttempts },
    { data: worksheetSubmissions },
    { data: publishedCourses },
  ] = await Promise.all([
    supabase
      .from('user_enrollments')
      .select(`
        id,
        created_at,
        course:courses!inner (
          id,
          title,
          slug,
          description,
          promise,
          short_introduction,
          logo_url,
          deleted_at,
          modules:course_modules (
            id,
            title,
            description,
            display_order
          ),
          lessons:lessons (
            id,
            module_id,
            title,
            type,
            assessment_key,
            duration_seconds,
            display_order
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('payment_status', 'completed')
      .is('course.deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('lesson_progress')
      .select('lesson_id, is_completed, watch_time_seconds, max_position_reached_seconds, started_at, completed_at, last_accessed_at')
      .eq('user_id', user.id),
    supabase
      .from('assessment_attempts')
      .select('id, course_id, module_id, lesson_id, assessment_key, assessment_type, attempt_number, score_value, score_max, score_percent, result_label, score_details, completed_at')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false }),
    supabase
      .from('specific_assessment_submissions')
      .select('id, lesson_id, assessment_key, generated_file_path, generated_file_name, submitted_at, updated_at')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false }),
    // Keep unenrolled course counts available without opening raw lesson rows
    // to authenticated users who have not purchased those courses.
    publicCatalogClient
      .from('courses')
      .select(`
        id,
        slug,
        title,
        description,
        subheadline,
        promise,
        short_introduction,
        tutor_name,
        logo_url,
        price_cents,
        created_at,
        modules:course_modules (id),
        lessons:lessons (id)
      `)
      .eq('is_published', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ])

  const progressByLesson = new Map((progressRows || []).map((progress) => [progress.lesson_id, progress]))
  const courses = (enrollments || [])
    .filter((enrollment) => enrollment.course && !enrollment.course.deleted_at)
    .map((enrollment) => {
      const course = enrollment.course
      const modules = [...(course.modules || [])]
        .sort((a, b) => a.display_order - b.display_order)
        .map((module) => ({
          ...module,
          lessons: (course.lessons || [])
            .filter((lesson) => lesson.module_id === module.id)
            .sort((a, b) => a.display_order - b.display_order)
            .map((lesson) => {
              const progress = progressByLesson.get(lesson.id)
              const duration = Number(lesson.duration_seconds) || 0
              const verifiedPosition = Math.max(
                Number(progress?.max_position_reached_seconds) || 0,
                Number(progress?.watch_time_seconds) || 0
              )

              return {
                ...lesson,
                progress: progress ? {
                  is_completed: progress.is_completed,
                  started_at: progress.started_at,
                  completed_at: progress.completed_at,
                  last_accessed_at: progress.last_accessed_at,
                  watched_percent: progress.is_completed
                    ? 100
                    : duration > 0
                      ? Math.min(95, Math.floor(((verifiedPosition / duration) * 100) / 5) * 5)
                      : 0,
                } : null,
              }
            }),
        }))
      const activityDates = modules
        .flatMap((module) => module.lessons)
        .map((lesson) => lesson.progress?.last_accessed_at)
        .filter(Boolean)
        .sort((a, b) => new Date(b) - new Date(a))

      return {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.short_introduction || course.promise || course.description,
        logo_url: course.logo_url,
        enrolled_at: enrollment.created_at,
        last_activity_at: activityDates[0] || null,
        modules,
      }
    })
  const enrolledCourseIds = new Set(courses.map((course) => course.id))
  const discoverCourses = (publishedCourses || [])
    .filter((course) => !enrolledCourseIds.has(course.id))
    .map((course) => ({
      id: course.id,
      slug: course.slug,
      title: course.title,
      description: course.description,
      subheadline: course.subheadline,
      promise: course.promise,
      short_introduction: course.short_introduction,
      tutor_name: course.tutor_name,
      logo_url: course.logo_url,
      price_cents: course.price_cents,
      created_at: course.created_at,
      module_count: course.modules?.length || 0,
      lesson_count: course.lessons?.length || 0,
    }))

  return (
    <div className={styles.dashboardWrapper}>
      <UserDashboardShell
        profile={{
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: profile?.email || user.email || '',
          points: profile?.points || 0,
          email_verified: profile?.email_verified ?? Boolean(user.email_confirmed_at),
          password_set: profile?.password_set ?? false,
          pending_email: user.new_email || '',
          created_at: profile?.created_at || user.created_at || null,
          updated_at: profile?.updated_at || null,
          last_sign_in_at: user.last_sign_in_at || null,
        }}
        coursesContent={
          <div className={styles.dashboardContent}>
            <MyCoursesDashboard courses={courses} />
          </div>
        }
        assessmentContent={
          <div className={styles.dashboardContent}>
            <AssessmentResultsDashboard
              courses={courses}
              attempts={assessmentAttempts || []}
              worksheetSubmissions={worksheetSubmissions || []}
            />
          </div>
        }
        discoverContent={
          <div className={styles.dashboardContent}>
            <DiscoverCoursesDashboard courses={discoverCourses} />
          </div>
        }
        purchaseContent={
          <div className={styles.dashboardContent}>
            <PurchaseHistoryDashboard />
          </div>
        }
        profileContent={
          <div className={styles.dashboardContent}>
            <ProfileSecurityDashboard
              profile={{
                first_name: profile?.first_name || '',
                last_name: profile?.last_name || '',
                email: profile?.email || user.email || '',
                email_verified: profile?.email_verified ?? Boolean(user.email_confirmed_at),
                password_set: profile?.password_set ?? false,
                pending_email: user.new_email || '',
                created_at: profile?.created_at || user.created_at || null,
                updated_at: profile?.updated_at || null,
                last_sign_in_at: user.last_sign_in_at || null,
              }}
            />
          </div>
        }
      />
    </div>
  )
}
