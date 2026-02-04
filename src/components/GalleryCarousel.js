'use client'

import { useState, useEffect } from 'react'
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5'
import styles from './GalleryCarousel.module.css'

export default function GalleryCarousel({ images = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const [isPaused, setIsPaused] = useState(false)

useEffect(() => {
  if (!isPaused && images.length > 1) {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 4000)

    return () => clearInterval(interval)
  }
}, [isPaused, images.length])

  if (images.length === 0) return null

  const next = () => setCurrentIndex((currentIndex + 1) % images.length)
  const prev = () => setCurrentIndex((currentIndex - 1 + images.length) % images.length)

  return (
    <div className={styles.carouselContainer}
     onMouseEnter={() => setIsPaused(true)}
     onMouseLeave={() => setIsPaused(false)}>
      <div 
        className={styles.carouselTrack}
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((img, i) => (
          <div key={i} className={styles.carouselSlide}>
            <img 
              src={img.image_url} 
              alt={img.alt_text || `Gallery Image ${i}`}
              className={styles.carouselImage}
            />
          </div>
        ))}
      </div>

      {images.length > 1 && (
        <>
          <button 
            className={`${styles.carouselBtn} ${styles.prevBtn}`} 
            onClick={prev}
            aria-label="Previous image"
          >
            <IoChevronBackOutline />
          </button>
          <button 
            className={`${styles.carouselBtn} ${styles.nextBtn}`} 
            onClick={next}
            aria-label="Next image"
          >
            <IoChevronForwardOutline />
          </button>
          
          <div className={styles.carouselDots}>
            {images.map((_, i) => (
              <span 
                key={i} 
                className={`${styles.dot} ${i === currentIndex ? styles.activeDot : ''}`} 
                onClick={() => setCurrentIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}