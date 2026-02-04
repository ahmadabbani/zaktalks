'use client'

import { useState, useEffect } from 'react'
import { MdOutlineKeyboardArrowLeft, MdOutlineKeyboardArrowRight, MdOutlineRocket, MdOutlineGroups, MdOutlineLightbulb, MdOutlineFavoriteBorder, MdOutlineEmojiEvents } from 'react-icons/md'
import styles from './HeroSlider.module.css'

const widgets = [
     { icon: <MdOutlineLightbulb />, text: 'Unlock Your Potential' },
  { icon: <MdOutlineGroups />, text: 'Build Strong Relationships' },
   { icon: <MdOutlineRocket />, text: 'Accelerate Your Growth' },
  { icon: <MdOutlineFavoriteBorder />, text: 'Find Inner Balance' },
  { icon: <MdOutlineEmojiEvents />, text: 'Achieve Your Goals' }
]

export default function HeroSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [itemsPerView, setItemsPerView] = useState(3)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setItemsPerView(1)
      } else if (window.innerWidth < 1024) {
        setItemsPerView(2)
      } else {
        setItemsPerView(3)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + widgets.length) % widgets.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % widgets.length)
  }

  const getVisibleWidgets = () => {
    const visible = []
    for (let i = 0; i < itemsPerView; i++) {
      visible.push(widgets[(currentIndex + i) % widgets.length])
    }
    return visible
  }

  return (
    <div className={styles.sliderContainer}>
 <button 
  onClick={handlePrev} 
  className={styles.sliderBtn}
  aria-label="Previous slide"
>
  <MdOutlineKeyboardArrowLeft />
</button>

      <div className={styles.sliderTrack}>
        {getVisibleWidgets().map((widget, index) => (
          <div key={index} className={styles.widget}>
            <div className={styles.widgetIcon}>{widget.icon}</div>
            <p className={styles.widgetText}>{widget.text}</p>
          </div>
        ))}
      </div>

 <button 
  onClick={handleNext} 
  className={styles.sliderBtn}
  aria-label="Next slide"
>
  <MdOutlineKeyboardArrowRight />
</button>
    </div>
  )
}