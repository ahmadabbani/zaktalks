'use client'

import Link from 'next/link'
import { FaArrowRight, FaCertificate, FaCheckCircle } from 'react-icons/fa'
import DownloadCertificateBtn from '@/components/DownloadCertificateBtn'
import styles from './certificates.module.css'

function CertificateArtwork() {
  return (
    <svg
      className={styles.certificateArtwork}
      viewBox="0 0 180 140"
      role="img"
      aria-label="Course certificate"
    >
      <rect className={styles.certificatePaper} x="22" y="14" width="136" height="96" rx="11" />
      <path className={styles.certificateAccent} d="M34 27h112" />
      <path className={styles.certificateLineStrong} d="M42 44h69" />
      <path className={styles.certificateLine} d="M42 57h91M42 69h77M42 81h52" />
      <circle className={styles.certificateSeal} cx="126" cy="91" r="22" />
      <path className={styles.certificateCheck} d="m116 91 7 7 14-17" />
      <path className={styles.certificateRibbon} d="m114 109-4 23 16-9 16 9-4-23" />
    </svg>
  )
}

function completedCertificateCourses(courses) {
  return courses.flatMap((course) => {
    if (!course.hasCertificate) return []

    const lessons = [
      ...(course.introductionLesson ? [course.introductionLesson] : []),
      ...course.modules.flatMap((module) => module.lessons || []),
    ]
    if (!lessons.length || !lessons.every((lesson) => lesson.progress?.is_completed)) return []

    const completionDates = lessons
      .map((lesson) => lesson.progress?.completed_at)
      .filter(Boolean)
      .map((date) => new Date(date))
      .filter((date) => !Number.isNaN(date.getTime()))
    const completedAt = completionDates.length
      ? new Date(Math.max(...completionDates.map((date) => date.getTime())))
      : null

    return [{ ...course, completedAt }]
  })
}

export default function CertificatesDashboard({ courses = [] }) {
  const certificates = completedCertificateCourses(courses)

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>Certificates</span>
          <h1>Your certificates</h1>
          <p>Download a certificate for each eligible course you have completed.</p>
        </div>
        <div className={styles.count} aria-label={`${certificates.length} certificates ready`}>
          <strong>{certificates.length}</strong>
          <small>ready</small>
        </div>
      </header>

      {certificates.length ? (
        <div className={styles.grid}>
          {certificates.map((course) => (
            <article key={course.id} className={styles.card}>
              <div className={styles.artwork}>
                {course.logo_url ? (
                  // Course artwork is managed remotely and may not match Next image host rules.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.logo_url} alt="" loading="lazy" />
                ) : <CertificateArtwork />}
              </div>
              <div className={styles.cardBody}>
                <span className={styles.ready}><FaCheckCircle aria-hidden="true" /> Ready to download</span>
                <h2>{course.title}</h2>
                {course.completedAt && (
                  <p>Completed {new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(course.completedAt)}</p>
                )}
                <div className={styles.cardActions}>
                  <DownloadCertificateBtn
                    courseId={course.id}
                    buttonClassName={styles.downloadButton}
                    controlClassName={styles.downloadControl}
                    errorClassName={styles.downloadError}
                    spinnerClassName={styles.spinner}
                  />
                  <Link href={`/courses/${course.slug}`} className={styles.courseLink}>
                    View course <FaArrowRight aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}><FaCertificate aria-hidden="true" /></span>
          <h2>No certificates yet</h2>
          <p>When you complete a course with a certificate, it will appear here.</p>
          <Link href="/dashboard" className={styles.emptyLink}>Back to my courses <FaArrowRight aria-hidden="true" /></Link>
        </div>
      )}
    </section>
  )
}
