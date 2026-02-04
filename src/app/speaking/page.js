import { getChannelVideos } from './actions'
import VideoSlider from './VideoSlider'
import styles from './podcast.module.css'
import { FaYoutube } from 'react-icons/fa'

export const metadata = {
  title: 'The Podcast | ZakTalks',
  description: 'Listen to the latest episodes of the ZakTalks podcast on YouTube.',
}

export default async function PodcastPage() {
  const videos = await getChannelVideos()
  const CHANNEL_URL = 'https://www.youtube.com/channel/UC2iUjubjzFe3nZfvry6sAdA'

  return (
    <div className={styles.podcastContainer}>
      <div className={styles.contentWrapper}>
        {/* Header Section (Grid) */}
        <div className={styles.headerSection}>
          <div className={styles.headerContent}>
            <span className={styles.podcastLabel}>Official Channel</span>
            <h1 className={styles.title}>
              The <span className={styles.titleHighlight}>Podcast</span>
            </h1>
            <p className={styles.description}>
              This is where the elephant in the room finally speaks. Unfiltered conversations, untold truths, and the questions everyone avoids.
               Tune in if you’re ready for honesty that inspires change!
            </p>
          </div>
          <div className={styles.headerImageContainer}>
            <img 
              src="/podcast4.png" 
              alt="ZakTalks Podcast Waves" 
              className={styles.headerImage}
            />
          </div>
        </div>

        {/* Dynamic Video Slider */}
        <VideoSlider videos={videos} />

        {/* CTA Section */}
        <div className={styles.ctaSection}>
          <a 
            href={CHANNEL_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.channelBtn}
          >
            <FaYoutube style={{ fontSize: '1.5rem' }} />
            Visit Official Channel
          </a>
        </div>
      </div>
    </div>
  )
}
