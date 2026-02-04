import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import YouTubePlayer from '@/components/YouTubePlayer'
import AssessmentRenderer from '@/components/AssessmentRenderer'
import { FaCheckCircle, FaChevronRight, FaChevronLeft, FaAward, FaInfoCircle } from 'react-icons/fa'
import Link from 'next/link'
import styles from './lesson-player.module.css'

export default async function LessonPage({ params }) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch Lesson
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*, course:courses(id, slug)')
    .eq('id', lessonId)
    .single()

  if (error || !lesson) notFound()

  // 2. Fetch Progress for this lesson
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .single()

  // 3. Find Next/Prev Lessons
  const { data: allLessons } = await supabase
    .from('lessons')
    .select('id, display_order')
    .eq('course_id', lesson.course_id)
    .order('display_order', { ascending: true })

  const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
  const prevLesson = allLessons[currentIndex - 1]
  const nextLesson = allLessons[currentIndex + 1]

  // 4. Fetch All Progress for this course to show completion message
  const { data: allProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)
    .in('lesson_id', allLessons.map(l => l.id))

  const completedCount = allProgress?.filter(p => p.is_completed).length || 0
  const isCourseComplete = completedCount === allLessons.length

  return (
    <div className={styles.lessonPage}>
      {/* Lesson Description at Top (if exists) */}
      {lesson.description && (
        <div className={styles.lessonDescription}>
          <h2 className={styles.descriptionTitle}>
            <FaInfoCircle />
            About this lesson
          </h2>
          <p className={styles.descriptionText}>{lesson.description}</p>
        </div>
      )}

      {/* Lesson Header */}
      <div className={styles.lessonHeader}>
        <h1 className={styles.lessonTitle}>{lesson.title}</h1>
        <div className={styles.lessonMeta}>
          {progress?.is_completed && (
            <div className={styles.completedBadge}>
              <FaCheckCircle /> Completed
            </div>
          )}
          <div className={styles.lessonProgress}>
            Lesson {currentIndex + 1} of {allLessons.length}
          </div>
        </div>
      </div>

      {/* Lesson Content */}
      {lesson.type === 'video' ? (
        <div className={styles.videoContainer}>
          <YouTubePlayer 
            videoId={lesson.youtube_url} 
            lessonId={lesson.id} 
            userId={user.id}
            isCompleted={progress?.is_completed}
          />
        </div>
      ) : (
        <div className={styles.assessmentContainer}>
          <div className={styles.assessmentContent}>
            <AssessmentRenderer 
              assessmentKey={lesson.assessment_key} 
              lessonId={lesson.id}
              userId={user.id}
              isCompleted={progress?.is_completed}
            />
          </div>
        </div>
      )}

      {/* Course Completion Notice */}
      {isCourseComplete && (
        <div className={styles.congratsCard}>
          <div className={styles.congratsContent}>
            <h3 className={styles.congratsTitle}>
              <FaAward className={styles.congratsIcon} />
              Congratulations!
            </h3>
            <p className={styles.congratsMessage}>
              You have completed all lessons in this course. Your certificate is ready!
            </p>
          </div>
          <Link href="/dashboard" className={styles.certificateButton}>
            <FaAward />
            Get Certificate
          </Link>
        </div>
      )}

      {/* Navigation */}
      <div className={styles.navigation}>
        {prevLesson ? (
          <Link 
            href={`/courses/${slug}/player/${prevLesson.id}`} 
            className={`${styles.navButton} ${styles.prevButton}`}
          >
            <FaChevronLeft /> Previous Lesson
          </Link>
        ) : <div></div>}

        {nextLesson ? (
          <Link 
            href={`/courses/${slug}/player/${nextLesson.id}`} 
            className={`${styles.navButton} ${styles.nextButton}`}
          >
            Next Lesson <FaChevronRight />
          </Link>
        ) : (
          <Link 
            href="/dashboard" 
            className={`${styles.navButton} ${styles.dashboardButton}`}
          >
            Return to Dashboard <FaCheckCircle />
          </Link>
        )}
      </div>
    </div>
  )
}
