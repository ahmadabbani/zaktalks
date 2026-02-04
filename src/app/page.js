import Image from 'next/image'
import Link from 'next/link'
import styles from './page.module.css'
import HeroSlider from '@/components/HeroSlider'
import TestimonialsSlider from '@/components/TestimonialsSlider'
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
        <div className="container">
          <div className={styles.heroGrid}>
            {/* Left Side */}
            <div className={styles.heroLeft}>
              <h1 className={styles.heroTitle}>
                Do you feel like there's <span className={styles.highlight}>more to life</span>, but you're not sure how to get there?
              </h1>
              <p className={styles.heroDescription}>
                Would you like to develop effective communication skills and set healthy boundaries to enhance the quality of your relationships?
              </p>
              <Link href="/courses" className={styles.btnCourses}>
                Get Started
              </Link>
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
       {/* Coaching Process Section */}
      <section className={styles.processSection}>
        <div className="container">
          <h2 className={styles.processTitle}>
            Your Journey to <span className={styles.processHighlight}>Growth</span>
          </h2>

          <div className={styles.processFlow}>
            {/* Step 1 */}
            <div className={`${styles.processStep} ${styles.step1}`}>
              <div className={styles.processCircle}>
                <MdOutlineWavingHand   className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Getting In</p>
            </div>

            {/* Connector 1 */}
            <svg className={`${styles.connector} ${styles.connector1}`} viewBox="0 0 200 100">
              <path d="M 0 50 Q 100 0, 200 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            </svg>

            {/* Step 2 */}
            <div className={`${styles.processStep} ${styles.step2}`}>
              <div className={styles.processCircle}>
                <MdOutlineSchool className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Guided Learning</p>
            </div>

            {/* Connector 2 */}
            <svg className={`${styles.connector} ${styles.connector2}`} viewBox="0 0 200 100">
              <path d="M 0 50 Q 100 100, 200 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            </svg>

            {/* Step 3 */}
            <div className={`${styles.processStep} ${styles.step3}`}>
              <div className={styles.processCircle}>
                <MdOutlineInsights className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>See Your Progress</p>
            </div>

            {/* Connector 3 */}
            <svg className={`${styles.connector} ${styles.connector3}`} viewBox="0 0 200 100">
              <path d="M 0 50 Q 100 0, 200 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            </svg>

            {/* Step 4 */}
            <div className={`${styles.processStep} ${styles.step4}`}>
              <div className={styles.processCircle}>
                <MdOutlineLightbulb   className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>New Perspectives</p>
            </div>

            {/* Connector 4 */}
            <svg className={`${styles.connector} ${styles.connector4}`} viewBox="0 0 200 100">
              <path d="M 0 50 Q 100 100, 200 50" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
            </svg>

            {/* Step 5 */}
            <div className={`${styles.processStep} ${styles.step5}`}>
              <div className={`${styles.processCircle} ${styles.finalCircle}`}>
                <MdOutlineAutoAwesome className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Personal Improvement</p>
            </div>
          </div>
        </div>
      </section>
{/* About Me Section */}
      <section className={styles.aboutSection}>
        <div className="container">
          <div className={styles.aboutGrid}>
            {/* Left Side */}
            <div className={styles.aboutLeft}>
              <h2 className={styles.aboutTitle}>
                A Little About <span className={styles.aboutHighlight}>Me</span>
              </h2>
              <p className={styles.aboutText}>
                I am Zak, a Purpose-Driven Coach, passionate about helping individuals and groups discover and achieve their full potential. My coaching services are tailored to meet the unique needs of each client, whether it be through private one-on-one sessions, group coaching, or workshops.
              </p>
              <Link href="/about" className={styles.btnAbout}>
                About Zak
              </Link>
            </div>

            {/* Right Side - Testimonials */}
            <div className={styles.aboutRight}>
              <TestimonialsSlider />
            </div>
          </div>
        </div>
      </section>
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
{/* Podcast Section */}
      <section className={styles.podcastSection}>
        <div className={styles.podcastGrid}>
          {/* Left Side */}
          <div className={styles.podcastLeft}>
            <div className={styles.podcastContent}>
              <h2 className={styles.podcastTitle}>
                The Elephant <span className={styles.podcastHighlight}>Speaks</span>
              </h2>
              <p className={styles.podcastDescription}>
                This is where the elephant in the room finally speaks. Unfiltered conversations, untold truths, and the questions everyone avoids. Tune in if you're ready for honesty that inspires change!
              </p>
              <Link 
                href="/speaking" 
                className={styles.btnPodcast}
              >
                Listen to Podcast
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className={styles.podcastRight}>
            <Image 
              src="/podcast.png" 
              alt="Podcast" 
              width={800}
              height={800}
              className={styles.podcastImage}
            />
          </div>
        </div>
      </section>
    {/* Latest Courses Section */}
      <section className={styles.coursesSection}>
        <div className="container">
          <div className={styles.coursesHeader}>
            <h2 className={styles.coursesTitle}>
              Let’s Move Forward<br></br><span className={styles.coursesHighlight}>Together</span>
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
    </main>
  )
}