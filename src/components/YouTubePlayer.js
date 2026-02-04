'use client'

import React, { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { updateLessonProgress } from '@/app/courses/actions'

export default function YouTubePlayer({ videoId, lessonId, userId, isCompleted: initialIsCompleted }) {
  const playerRef = useRef(null)
  const [isApiLoaded, setIsApiLoaded] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted)
  const trackRef = useRef(0) // Use ref for tracking to avoid side-effects in render
  const watchTimer = useRef(null)
  const lastState = useRef(-1) // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued

  // Load YouTube API
  useEffect(() => {
    if (window.YT) {
      setIsApiLoaded(true)
    } else {
      window.onYouTubeIframeAPIReady = () => setIsApiLoaded(true)
    }
  }, [])

  // Helper to extract YouTube ID from various URL formats or return as-is
  const getYouTubeId = (url) => {
    if (!url) return ''
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : url
  }

  const cleanVideoId = getYouTubeId(videoId)
  const [error, setError] = useState(null)

  // Initialize Player
  useEffect(() => {
    if (!isApiLoaded || !cleanVideoId || playerRef.current) return

    try {
      const player = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: cleanVideoId,
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onStateChange: (event) => {
              const state = event.data
              lastState.current = state
              
              if (state === window.YT.PlayerState.PLAYING) {
                  startTracking(event.target)
              } else {
                  stopTracking()
              }
          },
          onError: (e) => {
              console.error('YouTube Player Error:', e.data)
              setError(`YouTube Error Code: ${e.data}`)
          }
        },
      })

      playerRef.current = player
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err)
      setError(err.message)
    }

    return () => {
      stopTracking()
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [isApiLoaded, videoId])

  const startTracking = (player) => {
      if (watchTimer.current) return
      
      watchTimer.current = setInterval(() => {
          if (lastState.current === window.YT.PlayerState.PLAYING) {
              trackRef.current += 1
              checkMilestones(trackRef.current, player.getDuration())
          }
      }, 1000)
  }

  const stopTracking = () => {
      if (watchTimer.current) {
          clearInterval(watchTimer.current)
          watchTimer.current = null
      }
      
      // Save progress whenever stopped
      if (trackRef.current > 0) {
          saveCurrentProgress()
      }
  }

  const checkMilestones = (watched, duration) => {
      if (!duration) return
      
      const percent = (watched / duration) * 100
      
      // If 50% threshold reached, we can save progress info
      // If 30s threshold reached, save progress to avoid heavy UI refreshes
      if (watched % 30 === 0) { 
          saveCurrentProgress(watched, false)
      }

      // If 90% threshold reached, mark as complete
      if (percent >= 90 && !isCompleted) {
          setIsCompleted(true)
          saveCurrentProgress(watched, true)
      }
  }

  const saveCurrentProgress = async (watched = trackRef.current, completed = isCompleted) => {
      try {
          await updateLessonProgress({
              lessonId,
              userId,
              watchTime: watched,
              isCompleted: completed
          })
      } catch (err) {
          console.error('Failed to save progress:', err)
      }
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#000', position: 'relative' }}>
      <Script src="https://www.youtube.com/iframe_api" strategy="afterInteractive" />
      {error && (
          <div style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'white', 
              padding: '2rem',
              textAlign: 'center',
              backgroundColor: 'rgba(0,0,0,0.8)',
              zIndex: 2
          }}>
              <h3 style={{ color: 'var(--color-error)', marginBottom: '1rem' }}>Video Playback Error</h3>
              <p style={{ opacity: 0.8, marginBottom: '0.5rem' }}>{error}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Video ID: {cleanVideoId || 'Missing'}</p>
          </div>
      )}
      <div id="yt-player" style={{ width: '100%', height: '100%' }}></div>
    </div>
  )
}
