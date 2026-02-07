import styles from './about.module.css'
import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
  title: 'About Zak | ZakTalks',
  description: 'Unfiltered, honest, and powerful coaching for those ready to dive deep.',
}

export default function AboutPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        
        {/* Intro */}
        <section className={styles.animateUp}>
          <h1 className={styles.bigTitle}>
            Hi<span style={{fontStyle: 'italic', marginRight: '1.3rem'}}>!</span> <span className={styles.highlightText}> I am Zak</span>
          </h1>
          <p className={styles.topParagraph} style={{ marginTop: '0.5rem' }}>
            I don't have all the answers, and I'm far from perfect. I'm not
            enlightened at all. Definitely not even fucking close.
          </p>
          <div className={styles.funkyBox}>
            AND I’M OK
          </div>
        </section>

        {/* Philosophy 1 */}
        <section className={styles.animateUp}>
          <h2 className={styles.sectionTitle}>HERE'S WHY THAT'S A GOOD THING</h2>
          <div className={styles.textBlock} style={{ marginTop: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}>I’m not here to be your <span className={styles.highlightText} style={{textTransform: 'uppercase'}}>Guru</span></p>
            <p>I’m here to be your <span className={styles.highlightText}>Powerful Supporter</span></p>
            <p className={styles.highlightText} style={{ marginTop: '2.3rem', marginBottom: '1rem' }}>Let’s agree on one thing:</p>
            <p>Enough with putting coaches on pedestals.</p>
          </div>
        </section>

        {/* Image */}
        <div className={styles.imgContainer}>
          <Image 
            src="/aboutpage.png" 
            alt="About Zak" 
            width={600} 
            height={600} 
            className={styles.centerImg}
          />
        </div>

        {/* Philosophy 2 */}
        <section className={styles.animateUp}>
          <p className={styles.paragraph}>
            I’m not here for bullshit buzzwords that have no practical impact on your life.
          </p>
          <div className={styles.textBlock} style={{ marginTop: '2rem' }}>
            <p style={{ marginBottom: '1rem' }}><span className={styles.highlightText}>“Self-love”</span> makes me want to barf.</p>
            <p><span className={styles.highlightText}>“Be your best self”</span> makes me grind my teeth.</p>
          </div>
        </section>

        {/* Deep End Section */}
        <section className={styles.animateUp}>
          <h2 className={styles.bigTitle} style={{ fontSize: 'clamp(1.8rem, 5vw, 4rem)' }}>
            I COACH ON THE <span className={styles.highlightText}>DEEP END</span>
          </h2>
          <p className={styles.paragraph} style={{ marginTop: '0rem' }}>
            Before you can jump in you have to be able to swim.
          </p>
        </section>

        {/* Checklist */}
        <section className={styles.listContainer}>
          <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', marginBottom: '1rem', textTransform: 'initial' }}>
            Here’s how to know you’re ready:
          </h3>
          <ul style={{ listStyle: 'none' }}>
            <li className={styles.listItem}>
              You’re self-aware, but you can’t seem to stop repeating patterns you know you’ve mentally outgrown
            </li>
            <li className={styles.listItem}>
              You’re not looking to resist change, escape your problems, or avoid them. You know the only way out is through.
            </li>
            <li className={styles.listItem}>
              You’re ready to be held accountable, to hear the hard truths, and to be open to the idea that you might be wrong
            </li>
            <li className={styles.listItem}>
              You don’t expect this to be slow. You want a faster pace of work that will disrupt your life and hurtle you into change
            </li>
          </ul>
        </section>

        {/* Hard Conversations */}
        <section className={styles.animateUp}>
          <p className={styles.hardconvo}>
            When the conversation gets hard, it means we’re getting somewhere.
          </p>
        </section>

        {/* Booking Button */}
        <div className={styles.ctaSection}>
          <Link href="https://calendly.com/zaktalks/1-1-session-with-zak" target="_blank" className={styles.bookButton}>
            Book your first One-On-One session here
          </Link>
        </div>

        {/* Footer Grid */}
        <div className={styles.footerGrid}>
          <div className={styles.footerLeft}>
            Lets dive in!
          </div>
        </div>

      </div>
    </div>
  )
}
