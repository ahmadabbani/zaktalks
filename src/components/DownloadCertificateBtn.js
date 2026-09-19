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
        const binary = window.atob(result.pdf)
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
        const objectUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
        const downloadLink = document.createElement('a')
        downloadLink.href = objectUrl
        downloadLink.download = result.fileName
        document.body.appendChild(downloadLink)
        downloadLink.click()
        downloadLink.remove()
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
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
        aria-describedby={error ? `certificate-error-${courseId}` : undefined}
      >
        {loading ? (
          <><FaSpinner className={spinnerClassName} /> Preparing certificate...</>
        ) : (
          <><FaCertificate /> Download Certificate</>
        )}
      </button>
      {error && <p id={`certificate-error-${courseId}`} role="alert" className={errorClassName}>{error}</p>}
    </div>
  )
}
