'use client'

import { useTransition } from 'react'
import { toPng } from 'html-to-image'
import { FaCamera } from 'react-icons/fa'
import styles from '@/assessments/assessment.module.css'

function safeFileName(value) {
  return String(value || 'assessment-result')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function ResultScreenshotButton({ targetId, fileName }) {
  const [isPending, startTransition] = useTransition()

  const handleDownload = () => {
    startTransition(async () => {
      const target = document.getElementById(targetId)
      if (!target) return

      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: target.scrollWidth,
        height: target.scrollHeight,
        style: {
          margin: '0',
          transform: 'none',
          width: `${target.scrollWidth}px`,
          maxWidth: `${target.scrollWidth}px`
        },
        filter: (node) => node.dataset?.screenshotExclude !== 'true'
      })

      const link = document.createElement('a')
      link.download = `${safeFileName(fileName)}.png`
      link.href = dataUrl
      link.click()
    })
  }

  return (
    <button
      type="button"
      className={styles.screenshotBtn}
      onClick={handleDownload}
      disabled={isPending}
      data-screenshot-exclude="true"
    >
      <FaCamera /> {isPending ? 'Preparing...' : 'Download Result Screenshot'}
    </button>
  )
}
