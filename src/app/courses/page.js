import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import styles from './page.module.css'

export const metadata = {
  title: 'Course Catalog | ZakTalks',
  description: 'Explore our expert-led courses and start your learning journey today.',
}

export default async function CoursesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const isNew = (date) => {
    const now = new Date()
    const created = new Date(date)
    const diff = now - created
    return diff < 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  return (
    <div className={`container ${styles.coursesContainer}`}>
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
            <h1 className={styles.title}>
              Unlock Your <span className={styles.highlight}>Potential</span> with Expert Guidance
            </h1>
            <p className={styles.subtitle}>
              Start your journey today with our curated selection of professional courses designed to help you grow and succeed.
            </p>
        </header>

        <div className={styles.grid}>
          {courses?.map((course) => (
            <div key={course.id} className={styles.courseCard}>
              {isNew(course.created_at) && (
                <div className={styles.badge}>NEW</div>
              )}
              
              <Link href={`/courses/${course.slug}`} className={styles.linkWrapper}>
                {course.logo_url && (
                    <div className={styles.imageWrapper}>
                        <img 
                          src={course.logo_url} 
                          alt={course.title} 
                          className={styles.courseImage} 
                        />
                    </div>
                )}
                <div className={styles.cardContent}>
                    <h3 className={styles.courseTitle}>{course.title}</h3>
                    <p className={styles.tutorName}>
                        with {course.tutor_name || 'Expert Tutor'}
                    </p>
                    <p className={styles.description}>
                        {course.description?.substring(0, 140)}...
                    </p>
                </div>
              </Link>

              <div className={styles.cardFooter}>
                <div className={styles.footerInner}>
                    <Link href={`/courses/${course.slug}`} className={styles.viewBtn}>
                        Enroll Now - ${(course.price_cents / 100).toFixed(2)}
                    </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!courses || courses.length === 0) && (
          <div className={styles.emptyState}>
            <p className={styles.emptyText}>No courses available yet. Come back soon!</p>
          </div>
        )}
      </div>
    </div>
  )
}
