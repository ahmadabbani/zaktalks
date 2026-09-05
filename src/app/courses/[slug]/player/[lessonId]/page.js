import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import YouTubePlayer from '@/components/YouTubePlayer'
import AssessmentRenderer from '@/components/AssessmentRenderer'
import RichText from '@/components/RichText'
import { FaBookOpen, FaLayerGroup } from 'react-icons/fa'
import { buildLessonAccessMap, getFirstAvailableLesson } from '@/lib/course-progression'
import { CourseCompletionNotice, LessonCompletionBadge, LessonNavigation } from './LessonStatus'
import LessonResource from './LessonResource'
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

  if (error || !lesson || lesson.course?.slug !== slug) notFound()

  // 2. Fetch Progress for this lesson
  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle()

  // 3. Find Next/Prev Lessons
  const resourceQuery = progress?.is_completed
    ? supabase
        .from('lesson_resources')
        .select('resource_type, text_content, external_url, original_file_name')
        .eq('lesson_id', lesson.id)
        .maybeSingle()
    : Promise.resolve({ data: null, error: null })

  const [{ data: lessonRows }, { data: moduleRows }, { data: initialResource, error: initialResourceError }] = await Promise.all([
    supabase
      .from('lessons')
      .select('id, module_id, display_order')
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
    const moduleDifference = (moduleOrder.get(a.module_id) || 0) - (moduleOrder.get(b.module_id) || 0)
    return moduleDifference || a.display_order - b.display_order
  })

  const currentIndex = allLessons.findIndex(l => l.id === lesson.id)
  const currentModuleIndex = orderedModules.findIndex((module) => module.id === lesson.module_id)
  const currentModule = orderedModules[currentModuleIndex]
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
      lessons: allLessons.filter((item) => item.module_id === module.id)
    }))
  const accessMap = buildLessonAccessMap(courseModules, completedMap)

  if (!accessMap[lesson.id]) {
    const availableLesson = getFirstAvailableLesson(courseModules, completedMap)
    redirect(availableLesson
      ? `/courses/${slug}/player/${availableLesson.id}`
      : `/courses/${slug}`)
  }

  const learningContext = currentModule ? (
    <section className={styles.learningContext} aria-label="Current module and lesson">
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

      <article className={`${styles.contextItem} ${styles.contextLesson}`}>
        <div className={styles.contextEyebrow}>
          <span className={styles.contextIcon}><FaBookOpen /></span>
          <span>Current lesson / {String(currentIndex + 1).padStart(2, '0')}</span>
        </div>
        <h2>{lesson.title}</h2>
        {lesson.description && (
          <p><RichText value={lesson.rich_content?.description} fallback={lesson.description} maxLength={2000} /></p>
        )}
      </article>
    </section>
  ) : null

  return (
    <div className={styles.lessonPage}>
      <div className={styles.lessonStage}>
      {/* Lesson Header */}
      <div className={styles.lessonHeader}>
        <h1 className={styles.lessonTitle}>{lesson.title}</h1>
        <div className={styles.lessonMeta}>
          <LessonCompletionBadge lessonId={lesson.id} />
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
            durationSeconds={lesson.duration_seconds}
            initialProgress={progress}
          />
        </div>
      ) : (
        <div className={styles.assessmentContainer}>
          <div className={styles.assessmentContent}>
            <AssessmentRenderer 
              assessmentKey={lesson.assessment_key} 
              lessonId={lesson.id}
              isCompleted={progress?.is_completed}
              showIntro={true}
              lessonDescription={lesson.description}
              lessonDescriptionRich={lesson.rich_content?.description}
            />
          </div>
        </div>
      )}
      <LessonResource
        key={lesson.id}
        lessonId={lesson.id}
        initialResource={initialResource || null}
        initiallyCompleted={Boolean(progress?.is_completed && !initialResourceError)}
      />
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
