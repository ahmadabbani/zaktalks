import Link from 'next/link'
import { FaGraduationCap, FaPlus } from 'react-icons/fa'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { ASSESSMENTS, getExternalAssessmentPresentation } from '@/assessments/registry'
import OverviewDashboard from '../users/OverviewDashboard'
import UserDirectory from '../users/UserDirectory'
import EnrollmentsDashboard from '../users/EnrollmentsDashboard'
import LearningProgressDashboard from '../users/LearningProgressDashboard'
import CoursePerformanceDashboard from '../users/CoursePerformanceDashboard'
import VideoAnalyticsDashboard from '../users/VideoAnalyticsDashboard'
import AssessmentResultsDashboard from '../users/AssessmentResultsDashboard'
import PaymentsDashboard from '../users/PaymentsDashboard'
import RolesAccessDashboard from '../users/RolesAccessDashboard'
import CoursesTableRow from '../courses/CoursesTableRow'
import CourseSuccessToast from '../courses/CourseSuccessToast'
import SettingsForm from '../settings/SettingsForm'
import CouponsTable from '../coupons/CouponsTable'
import CoursePromotionsPanel from '../promotions/CoursePromotionsPanel'
import ExternalAssessmentLinks from './ExternalAssessmentLinks'
import CreationActivityDashboard from './CreationActivityDashboard'
import CourseReviewsDashboard from './CourseReviewsDashboard'
import { getAdminSettings } from '../settings/settings.actions'
import { getAllCourses, getCoupons } from '../coupons/coupons.actions'
import { getCoursePromotions } from '../promotions/promotions.actions'
import userStyles from '../users/admin-users.module.css'
import courseStyles from '../courses/admin-courses.module.css'

const PAGE_SIZE = 1000

async function fetchAllRows(supabase, table, columns, orderColumn, whereNullColumn = null) {
  const rows = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(columns).order(orderColumn, { ascending: false }).range(from, from + PAGE_SIZE - 1)
    if (whereNullColumn) query = query.is(whereNullColumn, null)
    const { data, error } = await query
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function OverviewPanel() {
  const supabase = await createAdminClient()
  let overviewData
  try {
    const [users, enrollments, progress] = await Promise.all([
      fetchAllRows(supabase, 'users', 'id, email, first_name, last_name, role, points, email_verified, password_set, first_purchase_discount_used, avatar_url, created_at, updated_at', 'created_at'),
      fetchAllRows(supabase, 'user_enrollments', 'id, user_id, course_id, payment_status, completed_at, certificate_url, created_at, course:courses(title)', 'created_at'),
      fetchAllRows(supabase, 'lesson_progress', 'id, user_id, lesson_id, enrollment_id, is_completed, score, attempts, started_at, completed_at, updated_at, last_accessed_at, playback_status, watch_time_seconds, max_position_reached_seconds, lesson:lessons(title, type, course_id, duration_seconds, is_course_introduction)', 'last_accessed_at'),
    ])
    overviewData = { users, enrollments, progress }
  } catch (error) {
    console.error('Unable to load the admin overview:', error)
    overviewData = { users: [], enrollments: [], progress: [], error: 'Analytics could not be loaded.' }
  }
  return <OverviewDashboard data={overviewData} />
}

async function CoursesPanel({ access }) {
  const supabase = await createAdminClient()
  const can = (permission) => access.role === 'admin' || access.permissions.includes(permission)
  const { data: courses, error } = await supabase
    .from('courses')
    .select('*, lessons:lessons(id, type, is_course_introduction), enrollments:user_enrollments(id, payment_status, user:users(email_verified))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const coursesWithStats = (courses || []).map((course) => ({
    ...course,
    lessonCount: (course.lessons || []).filter((lesson) => lesson.type === 'video' && !lesson.is_course_introduction).length,
    enrolledUsersCount: (course.enrollments || []).filter((enrollment) => enrollment.payment_status === 'completed' && enrollment.user?.email_verified === true).length,
  }))

  return <div className={userStyles.embeddedAdminPanel}>
    <CourseSuccessToast />
    <div className={userStyles.embeddedPanelActions}>
      {can('courses.create') && <Link href="/admin/courses/new" className={courseStyles.createButton}><FaPlus /> Create New Course</Link>}
    </div>
    {error && <div className={courseStyles.errorState}>Courses could not be loaded.</div>}
    {!error && coursesWithStats.length === 0 ? <div className={courseStyles.emptyState}><FaGraduationCap /><p>No courses found.</p></div> : <div className={courseStyles.tableWrapper}>
      <table className={courseStyles.table}>
        <thead className={courseStyles.tableHead}><tr><th>Course</th><th>Price</th><th>Stats</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
        <tbody className={courseStyles.tableBody}>{coursesWithStats.map((course) => <CoursesTableRow key={course.id} course={course} canEdit={can('courses.edit')} canManageContent={can('courses.content')} />)}</tbody>
      </table>
    </div>}
  </div>
}

async function AssessmentLinksPanel() {
  const supabase = await createAdminClient()
  const { data: externalLinks, error } = await supabase.from('external_assessment_links').select('id, assessment_key, token, created_at, expires_at, revoked_at').order('created_at', { ascending: false }).limit(20)
  if (error) console.error('Unable to load external assessment links:', error)

  return <div className={userStyles.embeddedAdminPanel}>
    <ExternalAssessmentLinks
      showHeading={false}
      assessments={Object.values(ASSESSMENTS).filter((assessment) => assessment.courseOnly !== true).map((assessment) => {
        const presentation = getExternalAssessmentPresentation(assessment)
        return {
          id: assessment.id,
          title: presentation.title,
          description: presentation.description
        }
      })}
      initialLinks={(externalLinks || []).map((link) => ({ ...link, path: `/assessments/external/${link.token}` }))}
    />
  </div>
}

async function CreationActivityPanel() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('content_creation_audit_log')
    .select('id, actor_user_id, actor_role, actor_name, actor_email, action, entity_type, entity_id, course_id, module_id, lesson_id, entity_title, course_title, module_title, lesson_type, assessment_key, is_course_introduction, changes, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)

  if (error) console.error('Unable to load content creation activity:', error)

  const entries = (data || []).map((entry) => ({
    ...entry,
    assessment_title: entry.assessment_key ? ASSESSMENTS[entry.assessment_key]?.title || entry.assessment_key : '',
  }))

  return <CreationActivityDashboard entries={entries} error={error ? 'Content activity could not be loaded.' : ''} />
}

async function CourseReviewsPanel() {
  const supabase = await createAdminClient()
  let reviews = []
  let errorMessage = ''

  try {
    reviews = await fetchAllRows(
      supabase,
      'course_reviews',
      'id, course_id, user_id, rating, review_text, created_at, updated_at, is_published, published_at, is_test, course:courses!course_reviews_course_id_fkey(title, slug, deleted_at), learner:users!course_reviews_user_id_fkey(first_name, last_name, email)',
      'created_at',
      'deleted_at',
    )
  } catch (error) {
    console.error('Unable to load course reviews:', error)
    errorMessage = 'Course reviews could not be loaded.'
  }

  return <CourseReviewsDashboard initialReviews={reviews} error={errorMessage} />
}

async function DiscountSettingsPanel() {
  const settings = await getAdminSettings()
  return <div className={`${userStyles.embeddedAdminPanel} ${userStyles.embeddedAdminPanelNarrow}`}><SettingsForm initialSettings={settings} /></div>
}

async function CouponsPanel() {
  const [coupons, courses] = await Promise.all([getCoupons(), getAllCourses()])
  return <div className={userStyles.embeddedAdminPanel}><CouponsTable coupons={coupons} courses={courses} /></div>
}

async function PromotionsPanel() {
  const [promotions, courses] = await Promise.all([getCoursePromotions(), getAllCourses()])
  return <div className={userStyles.embeddedAdminPanel}><CoursePromotionsPanel initialPromotions={promotions} courses={courses} /></div>
}

async function RolesPanel() {
  const supabase = await createAdminClient()
  const [{ data: accounts, error: accountsError }, { data: permissions, error: permissionsError }] = await Promise.all([
    supabase.from('users').select('id, email, first_name, last_name, role, email_verified, password_set, created_at').in('role', ['admin', 'creator']).order('created_at', { ascending: false }),
    supabase.from('creator_permissions').select('permission_key, enabled, updated_at').order('permission_key'),
  ])
  if (accountsError) console.error('Unable to load staff accounts:', accountsError)
  if (permissionsError) console.error('Unable to load creator permissions:', permissionsError)
  return <RolesAccessDashboard initialAccounts={accounts || []} initialPermissions={permissions || []} />
}

function CertificatesPanel() {
  return <div className={userStyles.workspaceComingSoon}><FaGraduationCap aria-hidden="true" /><strong>Certificate management</strong><p>Issued certificate records will appear here as learners complete eligible courses.</p></div>
}

export default async function DashboardPanelContent({ viewId, access }) {
  switch (viewId) {
    case 'overview': return <OverviewPanel />
    case 'directory': return <UserDirectory />
    case 'enrollments': return <EnrollmentsDashboard />
    case 'progress': return <LearningProgressDashboard />
    case 'course-performance': return <CoursePerformanceDashboard />
    case 'video-analytics': return <VideoAnalyticsDashboard />
    case 'assessments': return <AssessmentResultsDashboard />
    case 'certificates': return <CertificatesPanel />
    case 'purchases': return <PaymentsDashboard />
    case 'courses': return <CoursesPanel access={access} />
    case 'assessment-links': return <AssessmentLinksPanel />
    case 'creation-activity': return <CreationActivityPanel />
    case 'course-reviews': return access.role === 'admin' ? <CourseReviewsPanel /> : null
    case 'discounts': return <DiscountSettingsPanel />
    case 'coupons': return <CouponsPanel />
    case 'course-promotions': return <PromotionsPanel />
    case 'roles': return access.role === 'admin' ? <RolesPanel /> : null
    default: return null
  }
}
