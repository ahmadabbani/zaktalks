'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaPlayCircle, FaClipboardList, FaCheckCircle, FaChevronDown, FaLock } from 'react-icons/fa'
import { useCourseProgress } from './CourseProgressContext'
import styles from './player-layout.module.css'

export default function LessonList({ modules, slug }) {
  const pathname = usePathname()
  const { completedMap, watchedMap, accessMap } = useCourseProgress()
  const activeModuleId = modules?.find((module) =>
    module.lessons.some((lesson) => pathname.includes(`/player/${lesson.id}`))
  )?.id || null
  const [moduleSelection, setModuleSelection] = useState(null)
  const openModuleId = moduleSelection?.pathname === pathname
    ? moduleSelection.moduleId
    : activeModuleId
  let lessonNumber = 0
  
  return (
    <div className={styles.moduleLessonList}>
      {modules?.map((module, moduleIndex) => {
        const completedInModule = module.lessons.filter((lesson) => completedMap[lesson.id]).length
        const moduleIsComplete = module.lessons.length > 0 && completedInModule === module.lessons.length
        const moduleProgress = module.lessons.length > 0
          ? Math.round((completedInModule / module.lessons.length) * 100)
          : 0
        const isOpen = openModuleId === module.id
        const panelId = `course-module-${module.id}`

        return (
        <section key={module.id} className={`${styles.lessonModule} ${moduleIsComplete ? styles.lessonModuleComplete : ''}`}>
          <button
            type="button"
            className={styles.lessonModuleHeader}
            aria-expanded={isOpen}
            aria-controls={panelId}
            onClick={() => setModuleSelection({
              pathname,
              moduleId: isOpen ? null : module.id
            })}
          >
            <div className={styles.lessonModuleHeadingCopy}>
              <div className={styles.lessonModuleEyebrow}>
                <span>MODULE {String(moduleIndex + 1).padStart(2, '0')}</span>
                <small>{completedInModule}/{module.lessons.length}</small>
              </div>
              <h3>{module.title}</h3>
              <div className={styles.lessonModuleProgressRow}>
                <div
                  className={styles.lessonModuleProgressTrack}
                  role="progressbar"
                  aria-label={`${module.title} progress`}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={moduleProgress}
                >
                  <span
                    className={styles.lessonModuleProgressFill}
                    style={{ width: `${moduleProgress}%` }}
                  />
                </div>
                <strong>{moduleProgress}%</strong>
              </div>
            </div>
            <FaChevronDown className={`${styles.lessonModuleChevron} ${isOpen ? styles.lessonModuleChevronOpen : ''}`} />
          </button>
          <div
            id={panelId}
            className={`${styles.lessonModulePanel} ${isOpen ? styles.lessonModulePanelOpen : ''}`}
            aria-hidden={!isOpen}
          >
            <div className={styles.lessonModulePanelInner}>
              <div className={styles.lessonList}>
            {module.lessons.map((lesson) => {
              lessonNumber += 1
              const currentNumber = lessonNumber
              const isCompleted = completedMap[lesson.id]
              const isUnlocked = accessMap[lesson.id]
              const isActive = pathname.includes(`/player/${lesson.id}`)

              return isUnlocked ? (
                <Link
                  key={lesson.id}
                  href={`/courses/${slug}/player/${lesson.id}`}
                  className={`${styles.lessonItem} ${isActive ? styles.lessonItemActive : ''} ${isCompleted ? styles.lessonItemComplete : ''}`}
                >
                  <div className={`${styles.lessonNumber} ${isCompleted ? styles.lessonNumberComplete : styles.lessonNumberIncomplete}`}>
                    {isCompleted ? <FaCheckCircle /> : currentNumber}
                  </div>
                  <div className={styles.lessonContent}>
                    <div className={styles.lessonTitle}>{lesson.title}</div>
                    <div className={styles.lessonMeta}>
                      {lesson.type === 'video' ? <FaPlayCircle /> : <FaClipboardList />}
                      {lesson.type === 'video' ? 'Video' : 'Assessment'}
                      {isCompleted ? (
                        <span className={`${styles.lessonAccessLabel} ${styles.lessonCompletedLabel}`}>
                          <FaCheckCircle /> Completed
                        </span>
                      ) : lesson.type === 'video' ? (
                        <span className={styles.lessonVideoProgress} aria-label={`${watchedMap[lesson.id] || 0}% watched`}>
                          <span className={styles.lessonVideoProgressTrack} aria-hidden="true">
                            <span style={{ width: `${watchedMap[lesson.id] || 0}%` }} />
                          </span>
                          <strong>{watchedMap[lesson.id] || 0}%</strong>
                        </span>
                      ) : (
                        <span className={styles.lessonAccessLabel}>Ready</span>
                      )}
                    </div>
                  </div>
                </Link>
              ) : (
                <div
                  key={lesson.id}
                  className={`${styles.lessonItem} ${styles.lessonItemLocked}`}
                  aria-disabled="true"
                  title="Complete the previous lessons to unlock this lesson"
                >
                  <div className={`${styles.lessonNumber} ${styles.lessonNumberLocked}`}>
                    <FaLock />
                  </div>
                  <div className={styles.lessonContent}>
                    <div className={styles.lessonTitle}>{lesson.title}</div>
                    <div className={styles.lessonMeta}>
                      {lesson.type === 'video' ? <FaPlayCircle /> : <FaClipboardList />}
                      {lesson.type === 'video' ? 'Video' : 'Assessment'}
                      <span className={styles.lessonAccessLabel}><FaLock /> Locked</span>
                    </div>
                  </div>
                </div>
              )
            })}
            {module.lessons.length === 0 && (
              <p className={styles.emptyModuleMessage}>No lessons in this module yet.</p>
            )}
              </div>
            </div>
          </div>
        </section>
        )
      })}
      {(!modules || modules.length === 0) && (
        <div className={styles.emptyModuleMessage}>No course modules are available yet.</div>
      )}
    </div>
  )
}
