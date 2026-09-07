import { createClient } from '@/lib/supabase/server'
import { isStaffRole } from '@/lib/auth-utils'
import { notFound, redirect } from 'next/navigation'
import YouTubePlayer from '@/components/YouTubePlayer'
import AssessmentRenderer from '@/components/AssessmentRenderer'
import RichText from '@/components/RichText'
import { FaBookOpen, FaLayerGroup, FaPlay } from 'react-icons/fa'
import { buildLessonAccessMap, getFirstAvailableLesson } from '@/lib/course-progression'
import { getLessonDisplayNumber } from '@/lib/lesson-numbering'
import { CourseCompletionNotice, LessonCompletionBadge, LessonNavigation } from './LessonStatus'
import LessonResource from './LessonResource'
import styles from './lesson-player.module.css'

export default async function LessonPage({ params }) {
  const { slug, lessonId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  const unlockAll = isStaffRole(profile?.role)

  // 1. Fetch Lesson
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('*, course:courses(id, slug, lesson_numbering_style)')
    .eq('id', lessonId)
    .single()

  if (error || !lesson || lesson.course?.slug !== slug) notFound()

  // 2. Fetch Progress for this lesson
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  // 3. Find Next/Prev Lessons
  const resourceQuery = progress?.is_completed && !lesson.is_course_introduction
    ? supabase
        .from('lesson_resources')
        .select('resource_type, text_content, rich_content, external_url, original_file_name')
        .eq('lesson_id', lesson.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [{ data: lessonRows }, { data: moduleRows }, { data: initialResource, error: initialResourceError }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, module_id, display_order, is_course_introduction')
      .eq('course_id', lesson.course_id),
    supabase
      .from('course_modules')
      .select('id, title, description, rich_content, display_order')
      .eq('course_id', lesson.course_id),
    resourceQuery
  ])

  const orderedModules = [...(moduleRows || [])].sort((a, b) => a.display_order - b.display_order)
  const moduleOrder = new Map(orderedModules.map((module) => [module.id, module.display_order]))
  const allLessons = [...(lessonRows || [])].sort((a, b) => {
    if (a.is_course_introduction !== b.is_course_introduction) {
      return a.is_course_introduction ? -1 : 1
    }
    const moduleDifference = (moduleOrder.get(a.module_id) || 0) - (moduleOrder.get(b.module_id) || 0)
    return moduleDifference || a.display_order - b.display_order
  })

  const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
  const currentModuleIndex = orderedModules.findIndex((module) => module.id === lesson.module_id)
  const currentModule = orderedModules[currentModuleIndex]
  const currentModuleLessons = currentModule
    ? allLessons.filter((item) => !item.is_course_introduction && item.module_id === currentModule.id)
    : []
  const currentModuleLessonIndex = currentModuleLessons.findIndex((item) => item.id === lesson.id)
  const displayNumber = currentModuleLessonIndex >= 0
    ? getLessonDisplayNumber(
        lesson.course.lesson_numbering_style,
        currentModuleIndex,
        currentModuleLessons,
        currentModuleLessonIndex
      )
    : null
  const lessonDisplayLabel = lesson.is_course_introduction
    ? 'Course introduction'
    : displayNumber
      ? `Lesson ${displayNumber}`
      : lesson.type === 'assessment'
        ? 'Assessment'
        : 'Video lesson'
  const prevLesson = allLessons[currentIndex - 1]
  const nextLesson = allLessons[currentIndex + 1]

  // 4. Fetch All Progress for this course to show completion message
  const { data: allProgress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, is_completed')
    .eq('user_id', user.id)
    .in('lesson_id', allLessons.map(l => l.id))

  const completedMap = Object.fromEntries(
    (allProgress || []).map((row) => [row.lesson_id, row.is_completed])
  )
  const courseModules = orderedModules
    .map((module) => ({
      ...module,
      lessons: allLessons.filter((item) => !item.is_course_introduction && item.module_id === module.id)
    }))
  const introductionLesson = allLessons.find((item) => item.is_course_introduction) || null
  const accessMap = buildLessonAccessMap(courseModules, completedMap, introductionLesson, unlockAll)

  if (!accessMap[lesson.id]) {
    const availableLesson = getFirstAvailableLesson(courseModules, completedMap, introductionLesson, unlockAll)
    redirect(availableLesson
      ? `/courses/${slug}/player/${availableLesson.id}`
      : `/courses/${slug}`)
  }

  const learningContext = lesson.is_course_introduction ? (
    <section className={`${styles.learningContext} ${styles.introductionContext}`} aria-label="Course introduction">
      <article className={`${styles.contextItem} ${styles.contextLesson}`}>
        <div className={styles.contextEyebrow}>
          <span className={styles.contextIcon}><FaPlay /></span>
          <span>Course introduction</span>
        </div>
        <h2>{lesson.title}</h2>
        {lesson.description && (
          <p><RichText value={lesson.rich_content?.description} fallback={lesson.description} maxLength={2000} /></p>
        )}
      </article>
    </section>
  ) : currentModule ? (
    <section className={`${styles.learningContext} ${lesson.type === 'assessment' ? styles.assessmentLearningContext : ''}`} aria-label="Current module and lesson">
      <article className={styles.contextItem}>
        <div className={styles.contextEyebrow}>
          <span className={styles.contextIcon}><FaLayerGroup /></span>
          <span>Module {String(currentModuleIndex + 1).padStart(2, '0')}</span>
        </div>
        <h2>{currentModule.title}</h2>
        {currentModule.description && (
          <p><RichText value={currentModule.rich_content?.description} fallback={currentModule.description} maxLength={500} /></p>
        )}
      </article>

      {lesson.type !== 'assessment' && <article className={`${styles.contextItem} ${styles.contextLesson}`}>
        <div className={styles.contextEyebrow}>
          <span className={styles.contextIcon}><FaBookOpen /></span>
          <span>{lessonDisplayLabel}</span>
        </div>
        <h2>{lesson.title}</h2>
        {lesson.description && (
          <p><RichText value={lesson.rich_content?.description} fallback={lesson.description} maxLength={2000} /></p>
        )}
      </article>}
    </section>
  ) : null

  return (
    <div className={styles.lessonPage}>
      <div className={styles.lessonStage}>
      {/* Lesson Header */}
      {lesson.type === 'video' && <div className={styles.lessonHeader}>
        <h1 className={styles.lessonTitle}>{lesson.title}</h1>
        <div className={styles.lessonMeta}>
          <LessonCompletionBadge lessonId={lesson.id} />
          <div className={styles.lessonProgress}>
            {lessonDisplayLabel}
          </div>
        </div>
      </div>}

      {/* Lesson Content */}
      {lesson.type === 'video' ? (
        <div className={styles.videoContainer}>
          <YouTubePlayer
            videoId={lesson.youtube_url}
            lessonId={lesson.id}
            durationSeconds={lesson.duration_seconds}
            initialProgress={progress}
            allowUnrestrictedSeeking={unlockAll}
          />
        </div>
      ) : (
        <div className={styles.assessmentContainer}>
          <div className={styles.assessmentContent}>
            <AssessmentRenderer 
              assessmentKey={lesson.assessment_key} 
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              moduleNumber={currentModuleIndex + 1}
              isCompleted={progress?.is_completed}
              showIntro={true}
              lessonDescription={lesson.description}
              lessonDescriptionRich={lesson.rich_content?.description}
              lessonInstructions={lesson.instructions}
              lessonInstructionsRich={lesson.rich_content?.instructions}
              timeEstimate={lesson.assessment_time_estimate}
              completionGuidance={lesson.assessment_completion_guidance}
            />
          </div>
        </div>
      )}
      {!lesson.is_course_introduction && (
        <LessonResource
          key={lesson.id}
          lessonId={lesson.id}
          initialResource={initialResource || null}
          initiallyCompleted={Boolean(progress?.is_completed && !initialResourceError)}
        />
      )}
      {learningContext}
      </div>

      {/* Course Completion Notice */}
      <CourseCompletionNotice lessonIds={allLessons.map((item) => item.id)} />

      {/* Navigation */}
      <LessonNavigation
        slug={slug}
        currentLessonId={lesson.id}
        previousLesson={prevLesson}
        nextLesson={nextLesson}
      />
    </div>
  )
}
