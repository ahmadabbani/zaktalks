'use client'

import { useState } from 'react'
import { generateCertificate } from '@/app/courses/certificate.actions'
import { FaCertificate, FaSpinner } from 'react-icons/fa'

export default function DownloadCertificateBtn({
  courseId,
  buttonClassName,
  controlClassName,
  errorClassName,
  spinnerClassName,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDownload = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await generateCertificate(courseId)
      
      if (result.success && result.pdf) {
        const linkSource = `data:application/pdf;base64,${result.pdf}`
        const downloadLink = document.createElement('a')
        downloadLink.href = linkSource
        downloadLink.download = result.fileName
        downloadLink.click()
      } else {
        setError(result.error || 'Could not generate certificate. Please try again.')
      }
    } catch (error) {
      console.error('Download error:', error)
      setError('Could not download the certificate. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={controlClassName}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={loading}
        className={buttonClassName}
        aria-busy={loading}
      >
        {loading ? (
          <><FaSpinner className={spinnerClassName} /> Preparing certificate...</>
        ) : (
          <><FaCertificate /> Download Certificate</>
        )}
      </button>
      {error && <p role="alert" className={errorClassName}>{error}</p>}
    </div>
  )
}
