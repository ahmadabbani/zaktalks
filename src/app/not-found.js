import Image from 'next/image'
import Link from 'next/link'
import { FiArrowUpRight } from 'react-icons/fi'
import styles from './not-found.module.css'

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.content} aria-labelledby="not-found-heading">
        <div className={styles.copy}>
          <span className={styles.code}>404</span>
          <h1 id="not-found-heading">This Page Drifted Out Of Reach</h1>
          <p>
            The page you are looking for may have moved, changed, or is not available right now.
            Let&apos;s bring you back somewhere familiar.
          </p>
          <div className={styles.actions}>
            <Link href="/" className={styles.primaryAction}>
              <span>Back to home</span>
              <i aria-hidden="true"><FiArrowUpRight /></i>
            </Link>
            <Link href="/contact" className={styles.secondaryAction}>Contact Zak</Link>
          </div>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <span className={styles.orbit} />
          <Image
            src="/images/404-astronaut.png"
            alt=""
            fill
            sizes="(max-width: 760px) 78vw, (max-width: 1400px) 42vw, 620px"
            quality={86}
            priority
          />
        </div>
      </section>
    </main>
  )
}
