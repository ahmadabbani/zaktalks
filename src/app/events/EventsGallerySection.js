'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { FiArrowLeft, FiArrowRight, FiMaximize2, FiX } from 'react-icons/fi'
import styles from './events.module.css'

function useGalleryReveal() {
  const nodes = useRef(new Map())
  const [visible, setVisible] = useState(() => new Set())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const revealed = []

        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          revealed.push(entry.target.dataset.galleryReveal)
          observer.unobserve(entry.target)
        })

        if (!revealed.length) return

        setVisible((current) => {
          const next = new Set(current)
          revealed.forEach((id) => next.add(id))
          return next
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -7% 0px' }
    )

    nodes.current.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [])

  const register = useCallback((id) => (node) => {
    if (!node) {
      nodes.current.delete(id)
      return
    }

    node.dataset.galleryReveal = id
    nodes.current.set(id, node)
  }, [])

  const revealClass = useCallback(
    (id) => (visible.has(id) ? styles.galleryRevealed : ''),
    [visible]
  )

  return { register, revealClass }
}

function buildGalleryRows(images) {
  const preferredSizes = [2, 3, 4]
  const rowSizes = []
  let remaining = images.length
  let patternIndex = 0

  while (remaining > 0) {
    if (remaining <= 4) {
      if (remaining === 1 && rowSizes.length) {
        const previousSize = rowSizes.pop()
        rowSizes.push(previousSize - 1, 2)
      } else {
        rowSizes.push(remaining)
      }
      break
    }

    let rowSize = preferredSizes[patternIndex % preferredSizes.length]
    if (remaining - rowSize === 1) rowSize += 1
    rowSizes.push(rowSize)
    remaining -= rowSize
    patternIndex += 1
  }

  let cursor = 0
  return rowSizes.map((size, rowIndex) => {
    const row = images.slice(cursor, cursor + size)
    cursor += size
    return { id: `gallery-row-${rowIndex}`, images: row, rowIndex }
  })
}

function getRowClass(size, rowIndex) {
  return [
    styles.galleryRow,
    styles[`galleryRow${size}`],
    size === 2 && rowIndex % 2 === 1 ? styles.galleryRowReverse : '',
  ]
    .filter(Boolean)
    .join(' ')
}

function getTileImageSettings(rowSize, rowIndex, tileIndex) {
  if (rowSize === 1) {
    return {
      quality: 86,
      sizes: '(max-width: 640px) 92vw, (max-width: 1600px) 82vw, 82rem',
    }
  }

  if (rowSize === 2) {
    const isWide = rowIndex % 2 === 1 ? tileIndex === 1 : tileIndex === 0

    return {
      quality: isWide ? 86 : 74,
      sizes: isWide
        ? '(max-width: 640px) 46vw, (max-width: 1600px) 55vw, 55rem'
        : '(max-width: 640px) 46vw, (max-width: 1600px) 27vw, 27rem',
    }
  }

  if (rowSize === 3) {
    return {
      quality: 74,
      sizes:
        tileIndex === 2
          ? '(max-width: 640px) 92vw, (max-width: 1600px) 27vw, 27rem'
          : '(max-width: 640px) 46vw, (max-width: 1600px) 27vw, 27rem',
    }
  }

  return {
    quality: 74,
    sizes: '(max-width: 640px) 46vw, (max-width: 1600px) 20vw, 20rem',
  }
}

export default function EventsGallerySection({ images }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const closeButtonRef = useRef(null)
  const { register, revealClass } = useGalleryReveal()
  const hasImages = images.length > 0
  const galleryRows = buildGalleryRows(images)

  const closeLightbox = useCallback(() => setActiveIndex(null), [])

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => (current === null ? null : (current - 1 + images.length) % images.length))
  }, [images.length])

  const showNext = useCallback(() => {
    setActiveIndex((current) => (current === null ? null : (current + 1) % images.length))
  }, [images.length])

  useEffect(() => {
    if (activeIndex === null) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeLightbox()
      if (event.key === 'ArrowLeft') showPrevious()
      if (event.key === 'ArrowRight') showNext()
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [activeIndex, closeLightbox, showNext, showPrevious])

  const activeImage = activeIndex === null ? null : images[activeIndex]

  return (
    <section className={styles.workshopSection} aria-labelledby="workshop-gallery-heading">
      <div className={styles.contentWidth}>
        <div
          ref={register('workshop-heading')}
          className={`${styles.workshopHeader} ${revealClass('workshop-heading')}`}
        >
          <p className={styles.sectionLabel}>From the Workshop Room</p>
          <h2 id="workshop-gallery-heading" className={styles.sectionTitle}>
            Where the work has already begun
          </h2>
        </div>

        <div className={styles.workshopIntro}>
          <p
            ref={register('workshop-copy-1')}
            className={`${styles.workshopParagraph} ${revealClass('workshop-copy-1')}`}
          >
            Before stepping onto event stages, Zak has been facilitating conversations and
            workshops that invite people to look more closely at how they communicate, relate,
            make choices, and understand themselves.
          </p>

          <p
            ref={register('workshop-copy-2')}
            className={`${styles.workshopParagraph} ${revealClass('workshop-copy-2')}`}
          >
            <strong>Interpersonal Communication Dynamics</strong> and{' '}
            <strong>Unlock Your Financial Frequency</strong> are existing workshop experiences
            that bring Zak&rsquo;s work into the room through participation, reflection, dialogue,
            and practical insight.
          </p>
        </div>

        {hasImages && (
          <div className={styles.galleryGrid} aria-label="ZakTalks workshop gallery">
            {galleryRows.map((row) => (
              <div key={row.id} className={getRowClass(row.images.length, row.rowIndex)}>
                {row.images.map((image, tileIndex) => {
                  const imageIndex = images.findIndex((item) => item.id === image.id)
                  const revealId = `workshop-image-${image.id}`
                  const imageSettings = getTileImageSettings(
                    row.images.length,
                    row.rowIndex,
                    tileIndex
                  )

                  return (
                    <button
                      key={image.id}
                      ref={register(revealId)}
                      type="button"
                      className={`${styles.galleryTile} ${revealClass(revealId)}`}
                      onClick={() => setActiveIndex(imageIndex)}
                      aria-label={`Open ${image.alt} full screen`}
                    >
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        quality={imageSettings.quality}
                        sizes={imageSettings.sizes}
                        className={styles.galleryImage}
                      />
                      <span className={styles.galleryOpenIcon} aria-hidden="true">
                        <FiMaximize2 />
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {activeImage &&
        createPortal(
          <div
            className={styles.galleryLightbox}
            role="dialog"
            aria-modal="true"
            aria-label={`Viewing ${activeImage.alt}`}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeLightbox()
            }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className={styles.lightboxClose}
              onClick={closeLightbox}
              aria-label="Close gallery"
            >
              <FiX />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxPrevious}`}
                  onClick={showPrevious}
                  aria-label="Previous image"
                >
                  <FiArrowLeft />
                </button>
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxNext}`}
                  onClick={showNext}
                  aria-label="Next image"
                >
                  <FiArrowRight />
                </button>
              </>
            )}

            <div className={styles.lightboxImageFrame}>
              <img
                key={activeImage.id}
                src={activeImage.src}
                alt={activeImage.alt}
                width={activeImage.width}
                height={activeImage.height}
                className={styles.lightboxImage}
              />
            </div>

            <p className={styles.lightboxCounter}>
              {String(activeIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </p>
          </div>,
          document.body
        )}
    </section>
  )
}
