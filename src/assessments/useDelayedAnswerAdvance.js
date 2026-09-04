'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const ANSWER_FEEDBACK_DELAY_MS = 180

/**
 * Keeps the selected answer visible briefly before changing questions and
 * prevents rapid clicks from advancing more than once.
 */
export default function useDelayedAnswerAdvance() {
  const timerRef = useRef(null)
  const lockedRef = useRef(false)
  const [isAdvancing, setIsAdvancing] = useState(false)

  const advanceAfterFeedback = useCallback((callback) => {
    if (lockedRef.current) return false

    lockedRef.current = true
    setIsAdvancing(true)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      callback()
      lockedRef.current = false
      setIsAdvancing(false)
    }, ANSWER_FEEDBACK_DELAY_MS)

    return true
  }, [])

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
  }, [])

  return { isAdvancing, advanceAfterFeedback }
}
