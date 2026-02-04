'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaPlayCircle, FaClipboardList, FaCheckCircle } from 'react-icons/fa'
import styles from './player-layout.module.css'

export default function LessonList({ lessons, slug, completedMap }) {
  const pathname = usePathname()
  
  return (
    <div className={styles.lessonList}>
      {lessons?.map((lesson, idx) => {
        const isCompleted = completedMap[lesson.id]
        const isActive = pathname.includes(`/player/${lesson.id}`)
        
        return (
          <Link 
            key={lesson.id} 
            href={`/courses/${slug}/player/${lesson.id}`}
            className={`${styles.lessonItem} ${isActive ? styles.lessonItemActive : ''}`}
          >
            <div className={`${styles.lessonNumber} ${isCompleted ? styles.lessonNumberComplete : styles.lessonNumberIncomplete}`}>
              {isCompleted ? <FaCheckCircle /> : idx + 1}
            </div>
            <div className={styles.lessonContent}>
              <div className={styles.lessonTitle}>{lesson.title}</div>
              <div className={styles.lessonMeta}>
                {lesson.type === 'video' ? <FaPlayCircle /> : <FaClipboardList />}
                {lesson.type === 'video' ? 'Video' : 'Assessment'}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
