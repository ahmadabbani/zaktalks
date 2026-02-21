import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FaGraduationCap, FaAward, FaPlay, FaCheckCircle, FaBookOpen } from 'react-icons/fa'
import DownloadCertificateBtn from '@/components/DownloadCertificateBtn'
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

  // 1. Fetch User Profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  // 2. Fetch Enrollments with Course Details and Lessons
  const { data: enrollments, error } = await supabase
    .from('user_enrollments')
    .select(`
      *,
      course:courses (
        id,
        title,
        slug,
        logo_url,
        certificate_template_url,
        certificate_template_url,
        lessons:lessons (
          id,
          title,
          display_order,
          type
        )
      )
    `)
    .eq('user_id', user.id)
    .eq('payment_status', 'completed')

  // 3. Fetch Lesson Progress
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)

  const progressMap = progress?.reduce((acc, curr) => {
    acc[curr.lesson_id] = curr
    return acc
  }, {}) || {}

  return (
    <div className={styles.dashboardWrapper}>
      <div className="container">
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1>
              Welcome back, <span className={styles.highlight}>{profile?.first_name + ' ' + '!' || 'Student !'}</span>
            </h1>
            <p>Keep pushing forward. Your learning journey is looking great.</p>
          </div>
          
          <div className={styles.statsCard}>
            <div className={styles.statItem}>
                <div className={styles.statLabel}>Total Points</div>
                <div className={styles.statValue}>
                    <FaAward /> {profile?.points || 0}
                </div>
            </div>
            <div className={styles.statItem}>
                <div className={styles.statLabel}>Courses</div>
                <div className={styles.statValue}>{enrollments?.length || 0}</div>
            </div>
            <div className={styles.statItem}>
                <div className={styles.statLabel}>Action</div>
                <div className={styles.statValue}>
                    <Link href="/reset-password" className={styles.resetPasswordBtn}>
                        Reset Password
                    </Link>
                </div>
            </div>
          </div>
        </div>

        <h2 className={styles.sectionTitle}>
          <FaBookOpen /> My Courses
        </h2>

        {/* Courses Grid */}
        <div className={styles.coursesGrid}>
          {enrollments?.map((enrollment) => {
            const course = enrollment.course
            const lessons = course.lessons || []
            const completedCount = lessons.filter(l => progressMap[l.id]?.is_completed).length
            const percent = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0
            
            // Find next lesson to resume
            const sortedLessons = [...lessons].sort((a, b) => a.display_order - b.display_order)
            const nextLesson = sortedLessons.find(l => !progressMap[l.id]?.is_completed) || sortedLessons[0]

            return (
              <div key={enrollment.id} className={styles.courseCard}>
                {/* Course Header */}
                <div className={styles.courseHeader}>
                    {course.logo_url ? (
                        <img src={course.logo_url} alt={course.title} />
                    ) : (
                        <div className={styles.coursePlaceholder}>
                            <FaGraduationCap />
                        </div>
                    )}
                    <div className={styles.courseOverlay}>
                        <h3>{course.title}</h3>
                    </div>
                </div>

                {/* Progress Content */}
                <div className={styles.courseContent}>
                    <div className={styles.progressHeader}>
                        <span className={styles.progressLabel}>Progress</span>
                        <span className={styles.progressPercent}>{percent}%</span>
                    </div>
                    
                    <div className={styles.progressBarWrapper}>
                        <div className={styles.progressBarFill} style={{ width: `${percent}%` }}></div>
                    </div>

                    <div className={styles.courseStats}>
                        {percent === 100 ? (
                            <div className={styles.completedBadge}>
                                <FaCheckCircle /> Course Completed!
                            </div>
                        ) : (
                            <span>{completedCount} of {lessons.length} lessons completed</span>
                        )}
                    </div>

                    <div className={styles.courseActions}>
                        {nextLesson ? (
                            <Link 
                                href={`/courses/${course.slug}/player/${nextLesson.id}`} 
                                className={percent === 100 ? "btn btn-success" : percent > 0 ? "btn btn-secondary" : "btn btn-primary"}
                            >
                                <FaPlay /> {percent === 0 ? 'Start Course' : percent === 100 ? 'Review Lessons' : 'Resume Learning'}
                            </Link>
                        ) : (
                            <Link href={`/courses/${course.slug}`} className="btn btn-outline">
                                View Course Details
                            </Link>
                        )}

                        {percent === 100 && course.certificate_template_url && (
                            <DownloadCertificateBtn courseId={course.id} courseTitle={course.title} />
                        )}
                    </div>
                </div>
              </div>
            )
          })}
        </div>

        {(!enrollments || enrollments.length === 0) && (
          <div className={styles.emptyState}>
            <div>
                <FaGraduationCap />
            </div>
            <h3>No courses yet</h3>
            <p>You haven't enrolled in any courses yet. Start your journey today!</p>
            <Link href="/courses" className="coursesbtn">Browse Courses</Link>
          </div>
        )}
      </div>
    </div>
  )
}
