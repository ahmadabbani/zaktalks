'use client'

import { useEffect } from 'react'

/*
 * Drives the pinned hero.
 *
 * The hero sits in a tall runway (.heroStage) with a sticky child (.heroPin).
 * While pinned, the background and the heading hold still and the foreground
 * planes drift upward at different rates, then the rest of the page slides up
 * over the top of it.
 *
 * JS owns exactly one number per frame (--pz-p / --pz-c). Every distance,
 * scale and fade lives in the CSS module so it can be retuned inside the same
 * breakpoint ladder the rest of the site uses.
 */

const DRIFT_TAIL = 0.35
const PIN_QUERY = '(min-width: 1025px) and (min-height: 621px)'
const MOTION_QUERY = '(prefers-reduced-motion: reduce)'

const clamp01 = (value) => (value <= 0 ? 0 : value >= 1 ? 1 : value)
const quantise = (value) => Math.round(value * 1000) / 1000

export default function useHeroPin(stageRef, pinRef) {
  useEffect(() => {
    const stage = stageRef.current
    const pin = pinRef.current
    if (!stage || !pin) return undefined

    const pinMedia = window.matchMedia(PIN_QUERY)
    const motionMedia = window.matchMedia(MOTION_QUERY)

    let enabled = false
    let inView = false
    let queued = false
    let frame = 0

    // Cached geometry. This is the only place layout is ever read.
    let stageTop = 0
    let pinHeight = 1
    let phase = 1
    let driftLength = 1

    let lastProgress = -1
    let lastCover = -1
    let lastCovered = null

    const measure = () => {
      stageTop = stage.getBoundingClientRect().top + window.scrollY
      pinHeight = pin.offsetHeight || 1
      const travel = Math.max(1, stage.offsetHeight - pinHeight)
      phase = Math.max(1, travel - pinHeight)
      driftLength = Math.max(1, phase + pinHeight * DRIFT_TAIL)
    }

    const paint = () => {
      queued = false

      // Read first: rAF runs before style/layout, so this never forces a sync layout.
      const scrolled = window.scrollY - stageTop

      const progress = quantise(clamp01(scrolled / driftLength))
      const coverRaw = clamp01((scrolled - phase) / pinHeight)
      // Position tracks the finger linearly; only the fade/scale gets eased.
      const cover = quantise(coverRaw * coverRaw * (3 - 2 * coverRaw))

      if (progress !== lastProgress) {
        pin.style.setProperty('--pz-p', String(progress))
        lastProgress = progress
      }

      if (cover !== lastCover) {
        pin.style.setProperty('--pz-c', String(cover))
        lastCover = cover
      }

      const covered = coverRaw >= 0.999
      if (covered !== lastCovered) {
        pin.dataset.pzCovered = covered ? 'true' : 'false'
        lastCovered = covered
      }
    }

    const request = () => {
      if (queued || !enabled || !inView) return
      queued = true
      frame = window.requestAnimationFrame(paint)
    }

    const remeasure = () => {
      if (!enabled) return
      measure()
      request()
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        if (inView) request()
      },
      { rootMargin: '0px' }
    )

    const resizeObserver = new ResizeObserver(remeasure)

    const reset = () => {
      pin.style.removeProperty('--pz-p')
      pin.style.removeProperty('--pz-c')
      delete pin.dataset.pzCovered
      lastProgress = -1
      lastCover = -1
      lastCovered = null
    }

    const sync = () => {
      const next = pinMedia.matches && !motionMedia.matches
      if (next === enabled) return

      enabled = next

      if (enabled) {
        inView = true
        measure()
        observer.observe(stage)
        resizeObserver.observe(stage)
        request()
      } else {
        observer.disconnect()
        resizeObserver.disconnect()
        window.cancelAnimationFrame(frame)
        queued = false
        reset()
      }
    }

    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', remeasure)
    window.addEventListener('orientationchange', remeasure)
    pinMedia.addEventListener('change', sync)
    motionMedia.addEventListener('change', sync)
    if (document.fonts?.ready) document.fonts.ready.then(remeasure).catch(() => {})

    sync()

    return () => {
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', remeasure)
      window.removeEventListener('orientationchange', remeasure)
      pinMedia.removeEventListener('change', sync)
      motionMedia.removeEventListener('change', sync)
      observer.disconnect()
      resizeObserver.disconnect()
      window.cancelAnimationFrame(frame)
      reset()
    }
  }, [stageRef, pinRef])
}
