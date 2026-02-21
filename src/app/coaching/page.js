import Image from 'next/image';
import Link from 'next/link';
import styles from './coaching.module.css';

export const metadata = {
  title: 'Becoming Again - Personal Leadership Program',
  description: 'A leadership coaching experience designed for conscious leading, intentional living, and purpose-driven impact.',
};

export default function CoachingPage() {
  return (
    <div className={styles.coachingPage}>
      {/* Hero Section */}
      <section className={`${styles.section} ${styles.heroSection}`}>
        <div className={styles.heroContent}>
          <div className={styles.logoContainer}>
            <Image 
              src="/vector11.png" 
              alt="Coaching Logo" 
              width={300} 
              height={80} 
              className={styles.logo}
            />
            <p className={styles.logoSubtext}>PERSONAL LEADERSHIP PROGRAM</p>
          </div>
          
          <h1 className={styles.heroTitle}>
            <span className={styles.titleRegular}>Welcome to</span>
            <br />
            <span className={styles.titleBold}>Becoming Again</span>
          </h1>
          
          <h2 className={styles.heroSubtitle}>
            AS A LEADER THINKS, SO HE BECOMES.<br></br>
            AS HE BECOMES, SO HE ACTS. <br></br>
            AS HE ACTS, SO HE RESULTS.
          </h2>
          
          <Link href="/courses" className={styles.ctaButton}>
            Start Learning
          </Link>
        </div>
        <div className={styles.heroImageContainer}>
          <Image 
            src="/coachingheroo.png" 
            alt="Hero Man" 
            width={700} 
            height={700} 
            className={styles.heroImage}
            priority
          />
        </div>
      </section>

      {/* Vision Banner */}
      <section className={styles.visionBanner}>
        <div className={styles.container}>
          <p>
            <strong>Becoming Again</strong> is a leadership coaching experience designed for executives, entrepreneurs, emerging leaders, and educators who want to lead consciously, live intentionally, and grow beyond titles into purpose-driven impact.
          </p>
        </div>
      </section>

      {/* Thought Philosophy & Results Section */}
      <section className={`${styles.section} ${styles.philosophySection}`}>
        <div className={styles.container}>
          <div className={styles.staggeredLeft}>
            <p>You are not shaped by circumstance.<br/>You are shaped by thought.</p>
          </div>
          <div className={styles.staggeredRight}>
            <p>Many attempts to improve results while preserving the thinking that produced them.</p>
          </div>
          
          <div className={styles.blueBoxCentered}>
            <ul className={styles.causeList}>
              <li>If your results are inconsistent, <strong>the cause is internal.</strong></li>
              <li>If your execution fluctuates, <strong>the cause is internal.</strong></li>
              <li>If your success feels unstable, <strong>the cause is internal.</strong></li>
            </ul>
          </div>
          <p className={styles.subtextItalicCentered}>This program addresses the cause.</p>
        </div>
      </section>

      {/* Methodology Section */}
      <section className={`${styles.section} ${styles.methodologySection}`}>
        <div className={styles.container}>
          <div className={styles.methodologyHeader}>
            <h2 className={styles.sectionTitle}>Methodology</h2>
            <p className={styles.sectionSubtitle}>Design life. Then lead from it.</p>
          </div>
          
          <div className={styles.methodologyGrid}>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>01</div>
              <h3 className={styles.methodTitle}>Expose Blind Spots</h3>
              <p className={styles.methodDesc}>You cannot change what you do not see.</p>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>02</div>
              <h3 className={styles.methodTitle}>Break Negative Conditioning Loops</h3>
              <p className={styles.methodDesc}>We interrupt the seed before it becomes fruit.</p>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>03</div>
              <h3 className={styles.methodTitle}>Strengthen Mental & Emotional Capacity</h3>
              <p className={styles.methodDesc}>Calmness is not a personality; it is a conditioned power.</p>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>04</div>
              <h3 className={styles.methodTitle}>Align Values with Purpose</h3>
              <p className={styles.methodDesc}>This is how leaders stop reacting and start creating meaning.</p>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>05</div>
              <h3 className={styles.methodTitle}>Change In Behavioral</h3>
              <p className={styles.methodDesc}>When inner structure changes, execution becomes natural.</p>
            </div>
            <div className={styles.methodCard}>
              <div className={styles.methodNumber}>06</div>
              <h3 className={styles.methodTitle}>Pinwheel Integration</h3>
              <p className={styles.methodDesc}>Your areas of life are expressions of one governing structure.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pinwheel of Life */}
      <section className={`${styles.section} ${styles.pinwheelSection}`}>
        <div className={styles.container}>
          <div className={styles.pinwheelContent}>
            <h2 className={styles.sectionTitle}>The Pinwheel of Life</h2>
            
            <div className={styles.blueBox}>
              <p>A man may rise in career and decline in health.<br/>
              He may accumulate wealth and erode integrity.<br/>
              He may command influence and lose harmony at home.<br/>
              This is imbalance.</p>
            </div>

            <div className={styles.pinwheelText}>
              <p>You scale revenue <strong>and neglect health.</strong></p>
              <p>You grow influence <strong>and weaken relationships.</strong></p>
              <p>You chase success <strong>and drift from meaning.</strong></p>
              
              <p className={styles.pinwheelList}><strong>Work. Wealth. Health. Character. Relationships. Growth.</strong></p>
              
              <p>If one area is weak, it's not a time issue.</p>
              <p>It's a blind spot. It's a pattern you've normalized.</p>
              
              <p className={styles.pinwheelEmphasis}><strong>If one blade of the Pinwheel is weak, the entire wheel becomes unstable.</strong></p>
              
              <p>You don't need more drive. You need structural correction.</p>
            </div>
          </div>
          <div className={styles.pinwheelImageContainer}>
            <Image 
              src="/coachingimg22.png" 
              alt="Pinwheel of Life" 
              width={600} 
              height={600} 
              className={styles.pinwheelImage}
            />
          </div>
        </div>
      </section>

      {/* Call to Action Banners */}
      <section className={`${styles.section} ${styles.ctaSection}`}>
        <div className={styles.container}>
          <div className={styles.ctaBannerLeft}>
            <h2>If nothing changes, where will your leadership be in 12 months?</h2>
          </div>
          <div className={styles.ctaBannerRight}>
            <h2>If your internal structure upgrades, what becomes possible?</h2>
          </div>
          <p className={styles.subtextItalicCentered}>Leaders don't guess. They engineer their growth.</p>
        </div>
      </section>

      {/* FAQs */}
      <section className={`${styles.section} ${styles.faqSection}`}>
        <div className={styles.container}>
          <div className={styles.faqGrid}>
            <div className={styles.faqCard}>
              <div className={styles.faqHeader}>
                <h3>How do I know if I'm a fit?</h3>
              </div>
              <div className={styles.faqBody}>
                <p>You are a leader who is tired of 'doing more' but seeing the same results. You are open to upgrading the mental structure that runs your life.</p>
              </div>
            </div>
            
            <div className={styles.faqCard}>
              <div className={styles.faqHeader}>
                <h3>Is this therapy?</h3>
              </div>
              <div className={styles.faqBody}>
                <p>No. Therapy focuses on healing the past. Coaching focuses on engineering the future. However, the work we do often resolves internal conflicts at the root.</p>
              </div>
            </div>

            <div className={styles.faqCard}>
              <div className={styles.faqHeader}>
                <h3>How much time is required?</h3>
              </div>
              <div className={styles.faqBody}>
                <p>We offer 3-month and 6-month cycles depending on the depth of the upgrade needed. One deep coaching session every two weeks, with micro-assignments in between.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Page Specific Footer */}
      <footer className={styles.pageFooter}>
        <div className={styles.footerGrid}>
          <div className={styles.footerImageContainer}>
            <Image 
              src="/coachingheroo.png" 
              alt="Footer Portrait" 
              width={1000} 
              height={800} 
              className={styles.footerImage}
            />
          </div>
          <div className={styles.footerContent}>
            <div className={styles.footerTitle}>
              <span className={styles.footerTitleBold}>We look forward</span>
              <span className={styles.footerTitleBlue}>to your Becoming</span>
            </div>
            
            <div className={styles.footerContact}>
              <p>FOR ANY QUESTIONS ABOUT THE</p>
              <p>PROGRAM, PLEASE REACH OUT TO</p>
              <Link href="mailto:hello@zaktalks.com" className={styles.contactButton}>
                hello@zaktalks.com
              </Link>
            </div>
            
            <div className={styles.footerLogoContainer}>
              <Image 
                src="/vector11.png" 
                alt="Coaching Logo" 
                width={300} 
                height={80} 
                className={styles.footerLogo}
              />
              <p className={styles.footerLogoSubtext}>PERSONAL LEADERSHIP PROGRAM</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
