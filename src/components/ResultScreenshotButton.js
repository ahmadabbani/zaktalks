'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import { FaCamera, FaFilePdf } from 'react-icons/fa'
import styles from '@/assessments/assessment.module.css'

function safeFileName(value) {
  return String(value || 'assessment-result')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const nextPaint = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

async function captureResult(target) {
  await document.fonts?.ready
  await nextPaint()

  return toPng(target, {
    cacheBust: true,
    pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
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
}

async function downloadPdf(dataUrl, fileName) {
  const { PDFDocument } = await import('pdf-lib')
  const pdf = await PDFDocument.create()
  const image = await pdf.embedPng(dataUrl)
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 28
  const contentWidth = pageWidth - margin * 2
  const contentHeight = pageHeight - margin * 2
  const renderedHeight = image.height * (contentWidth / image.width)
  const pageCount = Math.max(1, Math.ceil(renderedHeight / contentHeight))

  pdf.setTitle(fileName || 'Assessment Result')
  pdf.setSubject('Personal assessment result')
  pdf.setCreator('ZakTalks')
  pdf.setProducer('ZakTalks')

  for (let index = 0; index < pageCount; index += 1) {
    const page = pdf.addPage([pageWidth, pageHeight])
    page.drawImage(image, {
      x: margin,
      y: pageHeight - margin - renderedHeight + (index * contentHeight),
      width: contentWidth,
      height: renderedHeight,
    })
  }

  const bytes = await pdf.save()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `${safeFileName(fileName)}.pdf`
  link.href = url
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ResultScreenshotButton({ targetId, fileName, label, format = 'png' }) {
  const [isPending, setIsPending] = useState(false)
  const isPdf = format === 'pdf'
  const buttonLabel = label || (isPdf ? 'Download Result' : 'Download Result Screenshot')

  const handleDownload = async () => {
    if (isPending) return
    const target = document.getElementById(targetId)
    if (!target) {
      toast.error('The result could not be prepared. Please try again.')
      return
    }

    setIsPending(true)
    try {
      const dataUrl = await captureResult(target)
      if (isPdf) {
        await downloadPdf(dataUrl, fileName)
      } else {
        const link = document.createElement('a')
        link.download = `${safeFileName(fileName)}.png`
        link.href = dataUrl
        link.click()
      }
    } catch (error) {
      console.error('Unable to download assessment result:', error)
      toast.error('The result could not be downloaded. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button
      type="button"
      className={`${styles.screenshotBtn} ${isPdf ? styles.resultDownloadBtn : ''}`}
      onClick={handleDownload}
      disabled={isPending}
      data-screenshot-exclude="true"
    >
      {isPdf ? <FaFilePdf /> : <FaCamera />} {isPending ? (isPdf ? 'Preparing PDF...' : 'Preparing...') : buttonLabel}
    </button>
  )
}
