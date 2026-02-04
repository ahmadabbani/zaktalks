'use client'

import { useRef } from 'react'
import { FaPlay, FaChevronLeft, FaChevronRight, FaYoutube, FaCalendarAlt } from 'react-icons/fa'
import { format } from 'date-fns'
import styles from './podcast.module.css'

export default function VideoSlider({ videos }) {
  const sliderRef = useRef(null)

  const scrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: -420, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 420, behavior: 'smooth' })
    }
  }

  // Handle different API response structures (search vs playlist items)
  const getVideoId = (video) => {
    if (typeof video.id === 'string') return video.id
    return video.id?.videoId || video.snippet?.resourceId?.videoId
  }

  const getThumbnail = (video) => {
    return video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url
  }

  return (
    <div className={styles.sliderSection}>
      <div className={styles.sliderControls}>
        <button 
          onClick={scrollLeft} 
          className={styles.navBtn}
          aria-label="Previous videos"
        >
          <FaChevronLeft />
        </button>
        <button 
          onClick={scrollRight} 
          className={styles.navBtn}
          aria-label="Next videos"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className={styles.sliderTrack} ref={sliderRef}>
        {videos.map((video) => {
          const videoId = getVideoId(video)
          if (!videoId) return null
          
          return (
            <a 
              key={videoId} 
              href={`https://www.youtube.com/watch?v=${videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.videoCard}
            >
              <div className={styles.thumbnailContainer}>
                <img 
                  src={getThumbnail(video)} 
                  alt={video.snippet.title} 
                  className={styles.thumbnail}
                  loading="lazy"
                />
                <div className={styles.playOverlay}>
                  <FaPlay className={styles.playIcon} />
                </div>
              </div>
              
              <div className={styles.cardContent}>
                <span className={styles.videoDate}>
                  <FaCalendarAlt style={{ marginRight: '6px', marginBottom: '2px' }} />
                  {video.snippet.publishedAt ? format(new Date(video.snippet.publishedAt), 'MMM d, yyyy') : 'Recently Added'}
                </span>
                <h3 className={styles.videoTitle}>{video.snippet.title}</h3>
                <p className={styles.videoDesc}>{video.snippet.description}</p>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
