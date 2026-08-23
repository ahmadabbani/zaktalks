import Link from 'next/link'
import { FaGraduationCap, FaPlus } from 'react-icons/fa'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { ASSESSMENTS } from '@/assessments/registry'
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
import ExternalAssessmentLinks from './ExternalAssessmentLinks'
import { getAdminSettings } from '../settings/settings.actions'
import { getAllCourses, getCoupons } from '../coupons/coupons.actions'
import userStyles from '../users/admin-users.module.css'
import courseStyles from '../courses/admin-courses.module.css'

const PAGE_SIZE = 1000

async function fetchAllRows(supabase, table, columns, orderColumn) {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase.from(table).select(columns).order(orderColumn, { ascending: false }).range(from, from + PAGE_SIZE - 1)
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
      fetchAllRows(supabase, 'lesson_progress', 'id, user_id, lesson_id, enrollment_id, is_completed, score, attempts, started_at, completed_at, updated_at, last_accessed_at, playback_status, watch_time_seconds, max_position_reached_seconds, lesson:lessons(title, type, course_id, duration_seconds)', 'last_accessed_at'),
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
    .select('*, lessons:lessons(count), enrollments:user_enrollments(id, payment_status, user:users(email_verified))')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const coursesWithStats = (courses || []).map((course) => ({
    ...course,
    lessonCount: course.lessons?.[0]?.count || 0,
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
      assessments={Object.values(ASSESSMENTS).map((assessment) => ({ id: assessment.id, title: assessment.title, description: assessment.description }))}
      initialLinks={(externalLinks || []).map((link) => ({ ...link, path: `/assessments/external/${link.token}` }))}
    />
  </div>
}

async function DiscountSettingsPanel() {
  const settings = await getAdminSettings()
  return <div className={`${userStyles.embeddedAdminPanel} ${userStyles.embeddedAdminPanelNarrow}`}><SettingsForm initialSettings={settings} /></div>
}

async function CouponsPanel() {
  const [coupons, courses] = await Promise.all([getCoupons(), getAllCourses()])
  return <div className={userStyles.embeddedAdminPanel}><CouponsTable coupons={coupons} courses={courses} /></div>
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
    case 'discounts': return <DiscountSettingsPanel />
    case 'coupons': return <CouponsPanel />
    case 'roles': return access.role === 'admin' ? <RolesPanel /> : null
    default: return null
  }
}
