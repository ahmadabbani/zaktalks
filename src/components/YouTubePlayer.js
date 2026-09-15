'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import {
  FaCheck,
  FaChevronDown,
  FaCompress,
  FaExpand,
  FaLock,
  FaPause,
  FaPlay,
  FaUnlock,
  FaVolumeMute,
  FaVolumeUp
} from 'react-icons/fa'
import { saveVideoProgress } from '@/app/courses/actions'
import { useCourseProgress } from '@/app/courses/[slug]/player/CourseProgressContext'
import {
  formatPlaybackRate,
  getAvailablePlaybackRates,
  normalizePlaybackRate,
} from '@/lib/video-playback-rate'
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

export default function YouTubePlayer({
  videoId,
  lessonId,
  durationSeconds,
  initialProgress,
  allowUnrestrictedSeeking = false
}) {
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
  const speedControlRef = useRef(null)
  const durationRef = useRef(Number(durationSeconds) || 0)
  const isPlayingRef = useRef(false)
  const speedChangeRef = useRef(false)
  const rateConfirmationRef = useRef(null)
  const confirmedRateRef = useRef(1)

  const [isApiReady, setIsApiReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.YT?.Player)
  )
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [availablePlaybackRates, setAvailablePlaybackRates] = useState([1])
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false)
  const [isSpeedChanging, setIsSpeedChanging] = useState(false)
  const [speedError, setSpeedError] = useState('')
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

  }, [lessonId, markLessonCompleted, updateLessonWatchedProgress])

  const queueCheckpoint = useCallback((event, positionOverride = null, playbackRateOverride = null) => {
    // Completion is final. Replays are intentionally local-only so seeking,
    // pausing, or rewatching cannot rewrite resume/activity analytics.
    if (completedRef.current) {
      return Promise.resolve({ skipped: true, isCompleted: true })
    }

    const player = playerRef.current
    if (!player?.getCurrentTime || !player?.getDuration) return Promise.resolve(null)

    const hasPositionOverride = positionOverride !== null
      && positionOverride !== undefined
      && Number.isFinite(Number(positionOverride))
    const positionSeconds = hasPositionOverride
      ? Math.max(0, Number(positionOverride))
      : player.getCurrentTime()
    const currentPlaybackRate = normalizePlaybackRate(
      playbackRateOverride ?? player.getPlaybackRate?.()
    )

    // Rewatching an already verified section must not move the learner's saved
    // resume point backwards. Saving resumes automatically at the frontier.
    if (
      event !== 'rate_change_paused' &&
      positionSeconds + REVIEW_TOLERANCE_SECONDS < verifiedMaxRef.current
    ) {
      return Promise.resolve({ skipped: true })
    }

    const reportedDuration = player.getDuration() || durationRef.current
    saveQueueRef.current = saveQueueRef.current
      .catch(() => null)
      .then(() => saveVideoProgress({
        lessonId,
        positionSeconds,
        durationSeconds: reportedDuration,
        event,
        playbackRate: currentPlaybackRate,
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
            const playerRates = getAvailablePlaybackRates(event.target.getAvailablePlaybackRates?.())
            const playerRate = normalizePlaybackRate(event.target.getPlaybackRate?.())
            confirmedRateRef.current = playerRate
            setAvailablePlaybackRates(playerRates)
            setPlaybackRate(playerRates.includes(playerRate) ? playerRate : 1)
            if (resumeAt > 0 && !completedRef.current) event.target.seekTo(resumeAt, true)
            durationRef.current = playerDuration
            setDuration(playerDuration)
            setIsPlayerReady(true)
            updateTimeDisplay(resumeAt, playerDuration)
          },
          onStateChange: (event) => {
            const state = event.data
            if (speedChangeRef.current) {
              if (state === window.YT.PlayerState.PLAYING) event.target.pauseVideo()
              isPlayingRef.current = false
              setIsPlaying(false)
              stopPolling()
              return
            }
            if (state === window.YT.PlayerState.PLAYING) {
              isPlayingRef.current = true
              setIsPlaying(true)
              setAvailablePlaybackRates(getAvailablePlaybackRates(event.target.getAvailablePlaybackRates?.()))
              secondsSinceSaveRef.current = 0
              queueCheckpoint('start')
              startPolling()
            } else {
              isPlayingRef.current = false
              setIsPlaying(false)
              stopPolling()
              if (state === window.YT.PlayerState.PAUSED) queueCheckpoint('pause')
              if (state === window.YT.PlayerState.ENDED) queueCheckpoint('ended')
            }
          },
          onPlaybackRateChange: (event) => {
            const nextRate = normalizePlaybackRate(event.data)
            setPlaybackRate(nextRate)
            setAvailablePlaybackRates(getAvailablePlaybackRates(event.target.getAvailablePlaybackRates?.()))
            const confirmation = rateConfirmationRef.current
            if (confirmation) {
              clearTimeout(confirmation.timeout)
              rateConfirmationRef.current = null
              confirmation.resolve(nextRate === confirmation.rate)
            } else if (!speedChangeRef.current && nextRate !== confirmedRateRef.current) {
              event.target.setPlaybackRate(confirmedRateRef.current)
            }
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
      if (rateConfirmationRef.current) {
        clearTimeout(rateConfirmationRef.current.timeout)
        rateConfirmationRef.current.resolve(false)
        rateConfirmationRef.current = null
      }
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
    if (!isSpeedMenuOpen) return undefined

    const closeMenu = (event) => {
      if (!speedControlRef.current?.contains(event.target)) setIsSpeedMenuOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsSpeedMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeMenu)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeMenu)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isSpeedMenuOpen])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const togglePlayback = () => {
    const player = playerRef.current
    if (!player || speedChangeRef.current) return
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

  const setConfirmedPlaybackRate = (player, rate) => new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      rateConfirmationRef.current = null
      resolve(false)
    }, 2000)

    rateConfirmationRef.current = { rate, resolve, timeout }
    try {
      player.setPlaybackRate(rate)
    } catch {
      clearTimeout(timeout)
      rateConfirmationRef.current = null
      resolve(false)
    }
  })

  const selectPlaybackRate = async (rate) => {
    const nextRate = normalizePlaybackRate(rate)
    const player = playerRef.current
    if (
      !player?.setPlaybackRate ||
      !availablePlaybackRates.includes(nextRate) ||
      speedChangeRef.current
    ) return

    setIsSpeedMenuOpen(false)
    setSpeedError('')
    if (nextRate === normalizePlaybackRate(player.getPlaybackRate?.())) return

    const wasPlaying = isPlayingRef.current
    const position = player.getCurrentTime?.() || 0
    const previousRate = normalizePlaybackRate(player.getPlaybackRate?.())
    speedChangeRef.current = true
    setIsSpeedChanging(true)

    try {
      if (wasPlaying) {
        player.pauseVideo()
        isPlayingRef.current = false
        setIsPlaying(false)
        stopPolling()
      }

      // Freeze the old interval before asking YouTube to change speed.
      const result = await queueCheckpoint('rate_change_paused', position, previousRate)
      if (!result?.success && !result?.skipped) {
        throw new Error('The playback speed could not be saved.')
      }

      if (playerRef.current !== player) return
      const changed = await setConfirmedPlaybackRate(player, nextRate)
      if (!changed) throw new Error('YouTube did not apply the selected speed.')

      const newRateResult = await queueCheckpoint('rate_change_paused', position, nextRate)
      if (!newRateResult?.success && !newRateResult?.skipped) {
        throw new Error('The new playback speed could not be saved.')
      }

      if (playerRef.current !== player) return
      confirmedRateRef.current = nextRate
      speedChangeRef.current = false
      if (wasPlaying) player.playVideo()
    } catch (changeError) {
      console.error('Failed to change playback speed:', changeError)
      setSpeedError('Speed could not be changed. Please try again.')
      if (playerRef.current === player && normalizePlaybackRate(player.getPlaybackRate?.()) !== previousRate) {
        await setConfirmedPlaybackRate(player, previousRate)
      }
      speedChangeRef.current = false
      if (wasPlaying && playerRef.current === player) player.playVideo()
    } finally {
      speedChangeRef.current = false
      setIsSpeedChanging(false)
    }
  }

  const handleSeek = (event) => {
    const requestedPosition = Number(event.target.value)
    const position = isCompleted || allowUnrestrictedSeeking
      ? requestedPosition
      : Math.min(requestedPosition, verifiedMaxRef.current)

    event.target.value = String(Math.max(0, Math.floor(position)))
    playerRef.current?.seekTo?.(position, true)
    updateTimeDisplay(position, duration)

    if (allowUnrestrictedSeeking && !completedRef.current) {
      queueCheckpoint('seek', position)
    }
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
        <span className={`${styles.progressState} ${isCompleted ? styles.progressStateComplete : ''} ${!isCompleted && !allowUnrestrictedSeeking ? styles.progressStateRestricted : ''}`}>
          {isCompleted
            ? <><FaCheck /> Complete</>
          : allowUnrestrictedSeeking
              ? <><FaUnlock /> Seeking enabled</>
              : <><FaLock /> Seeking unlocks at 97%</>}
        </span>
      </div>
      <div className={styles.videoStage}>
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
          className={`${styles.seek} ${!isCompleted && !allowUnrestrictedSeeking ? styles.seekRestricted : ''}`}
          type="range"
          min="0"
          max={Math.max(1, Math.floor(duration || 1))}
          defaultValue="0"
          onChange={handleSeek}
          disabled={!isPlayerReady || Boolean(error)}
          aria-label={isCompleted || allowUnrestrictedSeeking ? 'Seek through video' : 'Seek within watched video'}
        />

        <button type="button" className={styles.iconControl} onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        <div className={styles.speedControl} ref={speedControlRef}>
          <button
            type="button"
            className={styles.speedTrigger}
            onClick={() => setIsSpeedMenuOpen((open) => !open)}
            disabled={!isPlayerReady || Boolean(error) || isSpeedChanging}
            aria-label={`Playback speed: ${formatPlaybackRate(playbackRate)}`}
            aria-expanded={isSpeedMenuOpen}
            aria-haspopup="listbox"
          >
            <span>{formatPlaybackRate(playbackRate)}</span>
            <FaChevronDown aria-hidden="true" />
          </button>
          {isSpeedMenuOpen && (
            <div className={styles.speedMenu} role="listbox" aria-label="Playback speed">
              {availablePlaybackRates.map((rate) => (
                <button
                  type="button"
                  key={rate}
                  role="option"
                  aria-selected={playbackRate === rate}
                  className={playbackRate === rate ? styles.speedOptionActive : ''}
                  onClick={() => selectPlaybackRate(rate)}
                >
                  {formatPlaybackRate(rate)}
                </button>
              ))}
            </div>
          )}
        </div>
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
      {speedError && <p className={styles.speedError} role="status">{speedError}</p>}
    </div>
  )
}
