import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import HeroSlider from '@/components/HeroSlider'
import CoachingProcess from '@/components/CoachingProcess'
import ForWhomSection from '@/components/ForWhomSection'
import SocialProofSection from '@/components/SocialProofSection'
import WhatIDoSection from '@/components/WhatIDoSection'
import PodcastFeatureSection from '@/components/PodcastFeatureSection'
import AboutTeaserSection from '@/components/AboutTeaserSection'
import TestimonialsSection from '@/components/TestimonialsSection'
import CoursePreviewCtaSection from '@/components/CoursePreviewCtaSection'
import NewsletterSection from '@/components/NewsletterSection'
import { MdOutlineHandshake, MdOutlineRecordVoiceOver, MdOutlineWavingHand, MdOutlineLightbulb, MdOutlineSchool, MdOutlineWatchLater, MdOutlineInsights, MdOutlineExplore, MdOutlineAutoAwesome  } from 'react-icons/md'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: latestCourses } = await supabase
    .from('courses')
    .select('*')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(3)

  const courses = latestCourses || []
  const displayCourses = [...courses]
  while (displayCourses.length < 3) {
    displayCourses.push({ id: `placeholder-${displayCourses.length}`, isPlaceholder: true })
  }
  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroGrid}>
            {/* Left Side */}
            <div className={styles.heroLeft}>
              <h1 className={styles.heroTitle}>
                Stop repeating the patterns that keep you stuck.
              </h1>
              <p className={styles.heroDescription}>
                Zak helps adults move from survival patterns into self-awareness, stronger communication, healthier relationships, and a more intentional life through coaching, courses, and honest conversations.
              </p>
              <div className={styles.heroActions}>
                <Link href="/courses/interpersonal-communication-dynamics" className={styles.primaryHeroCta}>
                  <span className={styles.ctaLabel}>Enroll in Interpersonal Communication Dynamics</span>
                </Link>
                <Link href="/coaching" className={styles.secondaryHeroCta}>
                  <span className={styles.ctaLabel}>Explore how I work</span>
                </Link>
              </div>
            </div>

            {/* Right Side */}
            <div className={styles.heroRight}>
              <div className={styles.heroImageWrapper}>
                <Image 
                  src="/hero.png" 
                  alt="Zak" 
                  width={800}
                  height={800}
                  priority
                  className={styles.heroImage}
                  sizes="(max-width: 700px) 94vw, (max-width: 1200px) 48vw, 42vw"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section with Slider */}
      {/* <div className={styles.heroBottom}>
          <div className="container">
            <div className={styles.heroBottomGrid}>
             
              <div className={styles.bottomLeft}>
                <h3 className={styles.bottomTitle}>Learn. Reflect. Evolve.</h3>
                
              </div>

             
              <div className={styles.bottomRight}>
                <HeroSlider />
              </div>
            </div>
          </div>
        </div>  */}
      </section>

      <ForWhomSection />
      <SocialProofSection />
      <WhatIDoSection />
      <PodcastFeatureSection />
      <AboutTeaserSection />
      <TestimonialsSection />
      <CoursePreviewCtaSection />

       {/* Coaching Process Section */}
      <CoachingProcess />

    {/* Services Section */}
      <section className={styles.servicesSection}>
        <div className="container">
          <h2 className={styles.servicesTitle}>
            Ways We Can <span className={styles.servicesHighlight}>Work Together</span>
          </h2>

          <div className={styles.servicesGrid}>
            {/* Service 1 */}
            <div className={styles.serviceCard}>
              <MdOutlineHandshake className={styles.serviceIcon} />
              <h3 className={styles.serviceTitle}>Consulting</h3>
              <p className={styles.serviceDescription}>
                Are you looking to take your business to the next level? Let me guide you step by step through my consulting sessions to achieve the results you desire.
              </p>
            </div>

            {/* Service 2 */}
            <div className={styles.serviceCard}>
              <MdOutlineRecordVoiceOver className={styles.serviceIcon} />
              <h3 className={styles.serviceTitle}>Speaking</h3>
              <p className={styles.serviceDescription}>
                Are you in search of a skilled speaker who can add immense value to your conference? Look no further, as I can deliver engaging and impactful speeches to captivate your audience.
              </p>
            </div>

            {/* Service 3 */}
            <div className={styles.serviceCard}>
              <MdOutlineSchool className={styles.serviceIcon} />
              <h3 className={styles.serviceTitle}>Online Course</h3>
              <p className={styles.serviceDescription}>
                Do you want practical courses that deliver tangible results? As an Educator/practitioner, I provide courses that are not only effective, but also tailored to your specific needs, helping you achieve practical results without any fluff.
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Zak Section */}
      <section className={styles.zakSection}>
        <div className="container">
          <div className={styles.zakGrid}>
            {/* Left Side */}
            <div className={styles.zakLeft}>
              <h2 className={styles.zakName}>ZAK DAKKASH</h2>
              <p className={styles.zakDescription}>
                My approach focuses on empowering clients to identify their purpose, set goals, and develop strategies to achieve them. I understand that everyone's journey is different, and I work collaboratively with my clients to create a customized plan that meets their specific needs. Whether you're seeking personal or professional growth, I am here to support you every step of the way.
              </p>
            </div>

            {/* Right Side - Logo */}
            <div className={styles.zakRight}>
              <Image 
                src="/logo.png" 
                alt="Zak Dakkash Logo" 
                width={300}
                height={150}
                className={styles.zakLogo}
              />
            </div>
          </div>
        </div>
      </section>
    {/* Latest Courses Section */}
      <section className={styles.coursesSection}>
        <div className="container">
          <div className={styles.coursesHeader}>
            <h2 className={styles.coursesTitle}>
              Let’s Move Forward <span className={styles.coursesHighlight}>Together</span>
            </h2>
            <Link href="/courses" className={styles.btnExplore}>
              Explore More
            </Link>
          </div>

          <div className={styles.coursesGrid}>
            {displayCourses.map((course) => (
              <div key={course.id} className={styles.courseCard}>
                {course.isPlaceholder ? (
  <div className={styles.coursePlaceholder}>
    <MdOutlineWatchLater className={styles.placeholderIcon} />
    <p className={styles.placeholderText}>Coming Soon</p>
  </div>
                ) : (
                  <>
                    <div className={styles.courseImageWrapper}>
                      {course.logo_url && (
                        <img 
                          src={course.logo_url} 
                          alt={course.title} 
                          className={styles.courseImage}
                        />
                      )}
                    </div>
                    <div className={styles.courseContent}>
                      <h3 className={styles.courseCardTitle}>{course.title}</h3>
                      <p className={styles.courseCardDescription}>
                        {course.description?.substring(0, 120)}...
                      </p>
                    </div>
                   <div className={styles.courseFooter}>
                    <Link href={`/courses/${course.slug}`} className={styles.btnBuyNow}>
                    <span className={styles.btnText}>Buy Now</span>
                    </Link>
                   </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Future sections will go here */}
      <NewsletterSection />
    </main>
  )
}
