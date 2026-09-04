'use client'

import Link from 'next/link'
import { FaBookOpen, FaCompass, FaLayerGroup, FaPlayCircle } from 'react-icons/fa'
import styles from './dashboard.module.css'

function formatPrice(priceCents) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number(priceCents) % 100 === 0 ? 0 : 2,
  }).format(Number(priceCents || 0) / 100)
}

function isNewCourse(createdAt) {
  if (!createdAt) return false
  const created = new Date(createdAt)
  return !Number.isNaN(created.getTime()) && Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000
}

function CourseCard({ course }) {
  const description = course.short_introduction || course.promise || course.description || course.subheadline || 'A guided learning experience designed to support meaningful, lasting change.'

  return <article className={styles.learnerDiscoverCard}>
    <Link href={`/courses/${course.slug}`} className={styles.learnerDiscoverVisual} aria-label={`View ${course.title}`}>
      {course.logo_url
        ? <img src={course.logo_url} alt={course.title} />
        : <span><FaBookOpen /></span>}
      {isNewCourse(course.created_at) && <small>New</small>}
    </Link>

    <div className={styles.learnerDiscoverCardBody}>
      <div className={styles.learnerDiscoverCardTopline}>
        <span>Course</span>
        <strong>{formatPrice(course.price_cents)}</strong>
      </div>
      <div className={styles.learnerDiscoverCardCopy}>
        <h2>{course.title}</h2>
        <p>{description}</p>
        <small>With {course.tutor_name || 'Zak Dakkash'}</small>
      </div>

      <div className={styles.learnerDiscoverFacts}>
        <span><FaLayerGroup /><strong>{course.module_count}</strong> module{course.module_count === 1 ? '' : 's'}</span>
        <span><FaPlayCircle /><strong>{course.lesson_count}</strong> lesson{course.lesson_count === 1 ? '' : 's'}</span>
        <span>Lifetime access</span>
      </div>

      <div className={styles.learnerDiscoverActions}>
        <Link href={`/courses/${course.slug}`} className={styles.learnerDiscoverBuyButton}>
          View course details
        </Link>
      </div>
    </div>
  </article>
}

export default function DiscoverCoursesDashboard({ courses = [] }) {
  return <section className={styles.learnerDiscoverDashboard}>
    <header className={styles.learnerDiscoverIntro}>
      <div>
        <span>Discover courses</span>
        <h1>Choose what feels useful now</h1>
        <p>Explore learning experiences available to you. Courses you already own stay in My Courses and are automatically removed from this list.</p>
      </div>
      {courses.length > 0 && <div className={styles.learnerDiscoverCount}>
        <FaCompass />
        <span><strong>{courses.length}</strong><small>available course{courses.length === 1 ? '' : 's'}</small></span>
      </div>}
    </header>

    {courses.length > 0
      ? <div className={styles.learnerDiscoverGrid}>{courses.map((course) => <CourseCard course={course} key={course.id} />)}</div>
      : <div className={styles.learnerDiscoverEmpty}>
        <span><FaCompass /></span>
        <h2>You’re all caught up</h2>
        <p>You already have access to every published course. New learning experiences will appear here when they become available.</p>
        <button type="button" disabled>Nothing new right now</button>
      </div>}
  </section>
}
