import { createClient } from '@/lib/supabase/server'
import EnrollButton from '@/components/EnrollButton'
import Link from 'next/link'
import { FaPlayCircle, FaClipboardList, FaLock, FaCheckCircle, FaUserTie, FaBullseye, FaLightbulb, FaRocket, FaQuestionCircle, FaShieldAlt } from 'react-icons/fa'
import { notFound } from 'next/navigation'
import GalleryCarousel from '@/components/GalleryCarousel'
import FAQAccordion from '@/components/FAQAccordion'
import styles from './CourseDetails.module.css'

export async function generateMetadata({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: course } = await supabase.from('courses').select('title').eq('slug', slug).single()
  
  return {
    title: course ? `${course.title} | ZakTalks` : 'Course Details',
  }
}

export default async function CourseDetailPage({ params }) {
  const { slug } = await params
  const supabase = await createClient()
  
  // 1. Fetch Course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', slug)
    .single()

  if (courseError || !course) {
    return notFound()
  }

  // 2. Fetch Lessons
  const { data: lessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true })

  // 3. Fetch Enrollment Count
  const { count: enrollmentCount } = await supabase
    .from('user_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', course.id)
    .eq('payment_status', 'completed')

  // 4. Check Enrollment
  const { data: { user } } = await supabase.auth.getUser()
  let isEnrolled = false
  if (user) {
    const { data: enrollment } = await supabase
      .from('user_enrollments')
      .select('payment_status')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('payment_status', 'completed')
      .single()
    
    if (enrollment) isEnrolled = true
  }

  // 5. Fetch FAQs
  const { data: faqs } = await supabase
    .from('course_faqs')
    .select('*')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true })

  // 6. Fetch Gallery Images
  const { data: galleryImages } = await supabase
    .from('course_images')
    .select('*')
    .eq('course_id', course.id)
    .order('display_order', { ascending: true })

  return (
    <div className={styles.pageWrapper}>
      {/* Course Hero */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}></div>

        <div className={`container ${styles.heroContainer}`}>
          <div className={styles.heroGrid}>
            <div>
                <div className={styles.badgeWrapper}>
                    <span className={styles.premiumBadge}>PREMIUM</span>
                    <span className={styles.lessonsBadge}>{lessons?.length || 0} LESSONS</span>
                </div>
                <h1 className={styles.title}>{course.title}</h1>
                <p className={styles.heroDescription}>{course.description}</p>
                <div className={styles.tutorHeader}>
                    <FaUserTie />
                    <span>{course.tutor_name || 'Expert Tutor'}</span>
                </div>
            </div>

            <div className={styles.cardWrapper}>
                <div className={styles.detailsCard}>
                    <div className={styles.priceTag}>
                        ${(course.price_cents / 100).toFixed(2)}
                    </div>
                    <p className={styles.priceSub}>One-time payment. Lifetime access.</p>
                    
                    {isEnrolled ? (
                        <Link href={`/dashboard`} className={styles.enrolledBtn}>
                            Continue Learning
                        </Link>
                    ) : (
                        <EnrollButton courseId={course.id} courseName={course.title} price={course.price_cents} isLoggedIn={!!user} />
                    )}

                    <div className={styles.cardFeatures}>
                        {[
                            'Full lifetime access',
                            'Access on mobile and web',
                            'Official certificate',
                            'Self-paced learning'
                        ].map((item, idx) => (
                            <div key={idx} className={styles.featureItem}>
                                <FaCheckCircle style={{ color: 'var(--color-yellow)', flexShrink: 0 }} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section Under Hero */}
      {galleryImages?.length > 0 && (
          <section className={styles.gallerySection}>
              <div className="container">
                  <div className={styles.galleryContent}>
                      <div className={styles.galleryWrapper}>
                          <GalleryCarousel images={galleryImages} />
                      </div>
                  </div>
              </div>
          </section>
      )}

      {/* Main Content Sections */}
      <section className={styles.mainContent}>
        <div className="container">
            <div className={styles.mainGrid}>
                {/* Left Column: Course Details */}
                <div>
                    {/* Benefits Section */}
                    {course.course_benefits?.length > 0 && (
                        <div className={styles.infoBlock}>
                            <div className={styles.sectionHeader}>
                                <FaLightbulb style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                                <h2>Benefits</h2>
                            </div>
                            <div className={styles.benefitsGrid}>
                                {course.course_benefits.map((benefit, i) => (
                                    <div key={i} className={styles.benefitCard}>
                                        <FaCheckCircle style={{ color: 'var(--color-yellow)', marginTop: '0.2rem', flexShrink: 0 }} />
                                        <span className={styles.benefitText}>{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Course Offers */}
                    {course.course_offers?.length > 0 && (
                        <div className={styles.infoBlock}>
                             <div className={styles.sectionHeader}>
                                <FaCheckCircle style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                                <h2>This course offers:</h2>
                            </div>
                            <div className={styles.offersList}>
                                {course.course_offers.map((offer, i) => (
                                    <div key={i} className={styles.offerItem}>
                                        <FaCheckCircle style={{ color: 'var(--color-yellow)', opacity: 0.6 }} />
                                        <span style={{ opacity: 0.8 }}>{offer}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Target Audience */}
                    {course.target_audience && (
                        <div className={styles.infoBlock}>
                            <div className={styles.sectionHeader}>
                                <FaBullseye style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                                <h2>Target Audience</h2>
                            </div>
                            <p className={styles.paragraph}>{course.target_audience}</p>
                        </div>
                    )}

                    {/* Why Attend */}
                    {course.why_attend && (
                        <div className={styles.infoBlock}>
                             <div className={styles.sectionHeader}>
                                <FaRocket style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                                <h2>Why attend?</h2>
                            </div>
                            <p className={styles.paragraph}>{course.why_attend}</p>
                        </div>
                    )}

                    {/* Meet the Tutor */}
                    {course.meet_the_tutor && (
                        <div className={styles.tutorBlock}>
                            <div className={styles.sectionHeader}>
                                <FaUserTie style={{ color: 'var(--color-yellow)', fontSize: '2rem' }} />
                                <h2 style={{ color: 'white' }}>Meet Your Instructor</h2>
                            </div>
                            <h3 className={styles.instructorName}>{course.tutor_name}</h3>
                            <p className={styles.instructorBio}>{course.meet_the_tutor}</p>
                        </div>
                    )}

                    {/* FAQ Section */}
                    {faqs?.length > 0 && (
                        <div className={styles.faqSection}>
                            <div className={styles.sectionHeader}>
                                <FaQuestionCircle style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                                <h2>Frequently Asked Questions</h2>
                            </div>
                            <FAQAccordion faqs={faqs} />
                        </div>
                    )}

                    {/* Money Back Guarantee */}
                    {course.money_back_guarantee && (
                        <div className={styles.guaranteeBox}>
                            <div className={styles.guaranteeIcon}>
                                <FaShieldAlt />
                            </div>
                            <div>
                                <h3 className={styles.guaranteeTitle}>30-Day Money Back Guarantee</h3>
                                <p className={styles.guaranteeText}>
                                    Your investment is safe with us. If you're not completely satisfied with the course content within the first 30 days, we'll refund your entire payment—no questions asked.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Curriculum */}
                <div className={styles.curriculumColumn}>
                    <div className={styles.stickySide}>
                        <div className={styles.sectionHeader}>
                            <FaClipboardList style={{ color: 'var(--color-yellow)', fontSize: '1.5rem' }} />
                            <h2>Curriculum</h2>
                        </div>
                        
                        <div className={styles.curriculumList}>
                            {lessons?.map((lesson, idx) => (
                                <div key={lesson.id} className={styles.curriculumItem}>
                                    <div className={styles.itemIndex}>{idx + 1}</div>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemTitle}>{lesson.title}</div>
                                        <div className={styles.itemMeta}>
                                            {lesson.type === 'video' ? <FaPlayCircle /> : <FaClipboardList />}
                                            {lesson.type === 'video' ? 'Video Lesson' : 'Assessment'}
                                        </div>
                                    </div>
                                    {!isEnrolled && <FaLock style={{ opacity: 0.3, fontSize: '0.8rem' }} />}
                                </div>
                            ))}

                            {(!lessons || lessons.length === 0) && (
                                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>
                                    No lessons added yet.
                                </div>
                            )}
                        </div>

                        {!isEnrolled && (
                            <div className={styles.upsellBox}>
                                <p className={styles.upsellText}>Get full access today!</p>
                                <EnrollButton courseId={course.id} courseName={course.title} price={course.price_cents} isLoggedIn={!!user} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      </section>
    </div>
  )
}
