'use client'

import { useState, useEffect } from 'react'
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5'
import { FaQuoteLeft } from 'react-icons/fa'
import styles from './TestimonialsSlider.module.css'

const testimonials = [
  {
    text: "Zak is a hustler, builder and a go-getter. His drive and energy is dripping with inspiration.",
    author: "Melissa Bader",
    role: "Founder of Mella's"
  },
  {
    text: "The course adds a lot of new self-understanding of my ground. I loved that it's always related to my daily life and has a unique link between the past and the future.",
    author: "Joseph",
    role: "Course Participant"
  },
  {
    text: "Very well-organized course, Zak's facilitation is incredible, the information was delivered clearly, and it was a great refresh and added value to me. What got my interest the most was the part added about how the unmet needs during childhood affect the person during adulthood!",
    author: "Tia",
    role: "Workshop Attendee"
  },
  {
    text: "This course added a piece to my puzzle every time, and for the shock that after every workshop, critical actions are made by my surroundings when they see a 1% change in me (fa kif law kenit 100%). Thank you again for everything. God bless u.",
    author: "Joseph",
    role: "Course Participant"
  },
  {
    text: "What I appreciate the most about the workshop is that I understand my needs and know it's okay to have them!",
    author: "Jessy",
    role: "Workshop Participant"
  },
  {
    text: "I can't thank Zak enough for this course, it completely changed the way I see my life! I went from feeling lost and emotionally drained to self conscious about my feelings and emotions. I'm forever grateful!",
    author: "Lara",
    role: "Course Graduate"
  }
]

export default function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const [isPaused, setIsPaused] = useState(false)

useEffect(() => {
  if (!isPaused) {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, 4000)

    return () => clearInterval(interval)
  }
}, [isPaused])

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  return (
    <div className={styles.testimonialContainer}>
      <div className={styles.testimonialCard}
        key={currentIndex}
       onMouseEnter={() => setIsPaused(true)}
  onMouseLeave={() => setIsPaused(false)}>
        <FaQuoteLeft className={styles.quoteIcon} />
        <p className={styles.testimonialText}>
          {testimonials[currentIndex].text}
        </p>
        <div className={styles.testimonialAuthor}>
          <h4 className={styles.authorName}>{testimonials[currentIndex].author}</h4>
          <p className={styles.authorRole}>{testimonials[currentIndex].role}</p>
        </div>
      </div>

      <div className={styles.testimonialControls}>
        <button 
          onClick={handlePrev} 
          className={styles.testimonialBtn}
          aria-label="Previous testimonial"
        >
          <IoChevronBackOutline />
        </button>
        
        <div className={styles.testimonialDots}>
          {testimonials.map((_, index) => (
            <span
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>

        <button 
          onClick={handleNext} 
          className={styles.testimonialBtn}
          aria-label="Next testimonial"
        >
          <IoChevronForwardOutline />
        </button>
      </div>
    </div>
  )
}