'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import {
  FaCheck,
  FaCompress,
  FaExpand,
  FaLock,
  FaPause,
  FaPlay,
  FaVolumeMute,
  FaVolumeUp
} from 'react-icons/fa'
import { saveVideoProgress } from '@/app/courses/actions'
import { useCourseProgress } from '@/app/courses/[slug]/player/CourseProgressContext'
import styles from './YouTubePlayer.module.css'

const SAVE_INTERVAL_SECONDS = 10
const COMPLETION_THRESHOLD = 97
const REVIEW_TOLERANCE_SECONDS = 2

function extractVideoId(value) {
  const input = String(value || '').trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  const match = input.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:embed\/|shorts\/|watch\?(?:.*&)?v=))([a-zA-Z0-9_-]{11})/)
  return match?.[1] || ''
}

function formatTime(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}

function initialResumePosition(progress) {
  const lastPosition = Number(progress?.last_position_seconds) || 0
  if (lastPosition > 0) return lastPosition

  const verifiedPosition = Number(progress?.max_position_reached_seconds) || 0
  if (verifiedPosition > 0) return verifiedPosition

  return progress?.is_completed ? 0 : Number(progress?.watch_time_seconds) || 0
}

function initialProgressPercent(progress, duration) {
  if (progress?.is_completed) return 100
  if (!duration) return 0
  const verified = Math.max(
    Number(progress?.max_position_reached_seconds) || 0,
    Number(progress?.watch_time_seconds) || 0
  )
  return Math.min(95, Math.floor(((verified / duration) * 100) / 5) * 5)
}

export default function YouTubePlayer({ videoId, lessonId, durationSeconds, initialProgress }) {
  const cleanVideoId = extractVideoId(videoId)
  const initiallyCompleted = Boolean(initialProgress?.is_completed)
  const { markLessonCompleted, updateLessonWatchedProgress } = useCourseProgress()
  const playerHostRef = useRef(null)
  const playerRef = useRef(null)
  const shellRef = useRef(null)
  const pollTimerRef = useRef(null)
  const secondsSinceSaveRef = useRef(0)
  const saveQueueRef = useRef(Promise.resolve())
  const completedRef = useRef(initiallyCompleted)
  const verifiedMaxRef = useRef(Math.max(
    Number(initialProgress?.max_position_reached_seconds) || 0,
    initiallyCompleted ? 0 : Number(initialProgress?.watch_time_seconds) || 0
  ))
  const completionAttemptAtRef = useRef(0)
  const currentTimeRef = useRef(null)
  const durationTimeRef = useRef(null)
  const seekRef = useRef(null)
  const durationRef = useRef(Number(durationSeconds) || 0)

  const [isApiReady, setIsApiReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.YT?.Player)
  )
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initiallyCompleted)
  const [duration, setDuration] = useState(Number(durationSeconds) || 0)
  const [progressPercent, setProgressPercent] = useState(
    initialProgressPercent(initialProgress, Number(durationSeconds) || 0)
  )
  const [error, setError] = useState('')

  const updateTimeDisplay = useCallback((position, total) => {
    if (currentTimeRef.current) currentTimeRef.current.textContent = formatTime(position)
    if (durationTimeRef.current) durationTimeRef.current.textContent = formatTime(total)
    if (seekRef.current) {
      seekRef.current.max = String(Math.max(1, Math.floor(total || 1)))
      seekRef.current.value = String(Math.max(0, Math.floor(position || 0)))
    }
  }, [])

  const applyCheckpointResult = useCallback((result) => {
    if (!result?.success) return

    verifiedMaxRef.current = Math.max(
      verifiedMaxRef.current,
      Number(result.acceptedPosition) || 0
    )
    const resolvedDuration = Number(result.durationSeconds) || durationRef.current
    durationRef.current = resolvedDuration
    setDuration(resolvedDuration)
    setProgressPercent((current) => result.isCompleted
      ? 100
      : Math.max(current, Number(result.progressPercent) || 0))
    updateLessonWatchedProgress(lessonId, result.isCompleted ? 100 : result.progressPercent)

    if (result.isCompleted && !completedRef.current) {
      completedRef.current = true
      setIsCompleted(true)
      markLessonCompleted(lessonId)
    }

    const player = playerRef.current
    if (!result.isCompleted && player?.getCurrentTime) {
      const currentPosition = player.getCurrentTime()
      if (currentPosition > Number(result.acceptedPosition) + 4) {
        player.seekTo(Number(result.acceptedPosition), true)
      }
    }
  }, [lessonId, markLessonCompleted, updateLessonWatchedProgress])

  const queueCheckpoint = useCallback((event) => {
    // Completion is final. Replays are intentionally local-only so seeking,
    // pausing, or rewatching cannot rewrite resume/activity analytics.
    if (completedRef.current) {
      return Promise.resolve({ skipped: true, isCompleted: true })
    }

    const player = playerRef.current
    if (!player?.getCurrentTime || !player?.getDuration) return Promise.resolve(null)

    const positionSeconds = player.getCurrentTime()

    // Rewatching an already verified section must not move the learner's saved
    // resume point backwards. Saving resumes automatically at the frontier.
    if (positionSeconds + REVIEW_TOLERANCE_SECONDS < verifiedMaxRef.current) {
      return Promise.resolve({ skipped: true })
    }

    const reportedDuration = player.getDuration() || durationRef.current
    saveQueueRef.current = saveQueueRef.current
      .catch(() => null)
      .then(() => saveVideoProgress({
        lessonId,
        positionSeconds,
        durationSeconds: reportedDuration,
        event
      }))
      .then((result) => {
        applyCheckpointResult(result)
        return result
      })
      .catch((checkpointError) => {
        console.error('Failed to save video progress:', checkpointError)
        return null
      })

    return saveQueueRef.current
  }, [applyCheckpointResult, lessonId])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return

    pollTimerRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player?.getCurrentTime || !player?.getDuration) return

      const position = player.getCurrentTime()
      const total = player.getDuration() || durationRef.current
      updateTimeDisplay(position, total)
      secondsSinceSaveRef.current += 1

      if (secondsSinceSaveRef.current >= SAVE_INTERVAL_SECONDS) {
        secondsSinceSaveRef.current = 0
        queueCheckpoint('heartbeat')
      }

      const rawPercent = total > 0 ? (position / total) * 100 : 0
      const now = Date.now()
      if (
        !completedRef.current &&
        rawPercent >= COMPLETION_THRESHOLD &&
        now - completionAttemptAtRef.current >= 5000
      ) {
        completionAttemptAtRef.current = now
        queueCheckpoint('heartbeat')
      }
    }, 1000)
  }, [queueCheckpoint, updateTimeDisplay])

  useEffect(() => {
    if (window.YT?.Player) return

    const previousCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.()
      setIsApiReady(true)
    }
  }, [])

  useEffect(() => {
    if (!isApiReady || !cleanVideoId || !playerHostRef.current || playerRef.current) return

    try {
      playerRef.current = new window.YT.Player(playerHostRef.current, {
        width: '100%',
        height: '100%',
        videoId: cleanVideoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event) => {
            const playerDuration = event.target.getDuration() || durationRef.current
            const resumeAt = Math.min(
              initialResumePosition(initialProgress),
              Math.max(0, playerDuration - 1)
            )
            event.target.setPlaybackRate?.(1)
            if (resumeAt > 0 && !completedRef.current) event.target.seekTo(resumeAt, true)
            durationRef.current = playerDuration
            setDuration(playerDuration)
            setIsPlayerReady(true)
            updateTimeDisplay(resumeAt, playerDuration)
          },
          onStateChange: (event) => {
            const state = event.data
            if (state === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true)
              secondsSinceSaveRef.current = 0
              queueCheckpoint('start')
              startPolling()
            } else {
              setIsPlaying(false)
              stopPolling()
              if (state === window.YT.PlayerState.PAUSED) queueCheckpoint('pause')
              if (state === window.YT.PlayerState.ENDED) queueCheckpoint('ended')
            }
          },
          onPlaybackRateChange: (event) => {
            if (event.data !== 1) event.target.setPlaybackRate(1)
          },
          onError: () => setError('This video could not be loaded. Please try again shortly.')
        }
      })
    } catch (playerError) {
      console.error('Failed to initialize YouTube player:', playerError)
      queueMicrotask(() => setError('The lesson player could not be initialized.'))
    }

    return () => {
      stopPolling()
      playerRef.current?.destroy?.()
      playerRef.current = null
    }
  }, [cleanVideoId, initialProgress, isApiReady, queueCheckpoint, startPolling, stopPolling, updateTimeDisplay])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isPlaying) queueCheckpoint('pause')
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isPlaying, queueCheckpoint])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const togglePlayback = () => {
    const player = playerRef.current
    if (!player) return
    if (isPlaying) player.pauseVideo()
    else player.playVideo()
  }

  const toggleMute = () => {
    const player = playerRef.current
    if (!player) return
    if (player.isMuted()) {
      player.unMute()
      setIsMuted(false)
    } else {
      player.mute()
      setIsMuted(true)
    }
  }

  const handleSeek = (event) => {
    const requestedPosition = Number(event.target.value)
    const position = isCompleted
      ? requestedPosition
      : Math.min(requestedPosition, verifiedMaxRef.current)

    event.target.value = String(Math.max(0, Math.floor(position)))
    playerRef.current?.seekTo?.(position, true)
    updateTimeDisplay(position, duration)
  }

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.()
      } else {
        await shellRef.current?.requestFullscreen?.()
      }
    } catch (fullscreenError) {
      console.error('Failed to toggle fullscreen:', fullscreenError)
    }
  }

  return (
    <div className={styles.playerExperience} ref={shellRef}>
      <Script
        src="https://www.youtube.com/iframe_api"
        strategy="afterInteractive"
        onLoad={() => window.YT?.Player && setIsApiReady(true)}
      />

      <div className={styles.progressHeader}>
        <div>
          <span className={styles.progressEyebrow}>Lesson progress</span>
          <strong>{progressPercent}% watched</strong>
        </div>
        <span className={`${styles.progressState} ${isCompleted ? styles.progressStateComplete : ''}`}>
          {isCompleted ? <><FaCheck /> Complete</> : <><FaLock /> Seeking unlocks at 97%</>}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Verified lesson progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progressPercent}
      >
        <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
      </div>

      <div className={styles.videoStage}>
        <div className={styles.playerBrand}>ZAKTALKS · COURSE PLAYER</div>
        <div className={styles.iframeFrame}>
          <div ref={playerHostRef} className={styles.iframeHost} />
        </div>
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.primaryControl}
          onClick={togglePlayback}
          disabled={!isPlayerReady || Boolean(error)}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>

        <span className={styles.time}>
          <span ref={currentTimeRef}>0:00</span>
          <span aria-hidden="true">/</span>
          <span ref={durationTimeRef}>{formatTime(duration)}</span>
        </span>

        <input
          ref={seekRef}
          className={`${styles.seek} ${!isCompleted ? styles.seekRestricted : ''}`}
          type="range"
          min="0"
          max={Math.max(1, Math.floor(duration || 1))}
          defaultValue="0"
          onChange={handleSeek}
          disabled={!isPlayerReady || Boolean(error)}
          aria-label={isCompleted ? 'Seek through video' : 'Seek within watched video'}
        />

        <button type="button" className={styles.iconControl} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <button
          type="button"
          className={styles.iconControl}
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <FaCompress /> : <FaExpand />}
        </button>
      </div>
    </div>
  )
}
