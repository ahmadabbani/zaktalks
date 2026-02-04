'use client'

import { useState } from 'react'
import { generateCertificate } from '@/app/courses/certificate.actions'
import { FaCertificate, FaSpinner } from 'react-icons/fa'
import styles from '@/app/dashboard/dashboard.module.css'

export default function DownloadCertificateBtn({ courseId, courseTitle }) {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    try {
      const result = await generateCertificate(courseId)
      
      if (result.success && result.pdf) {
        // Create download link
        const linkSource = `data:application/pdf;base64,${result.pdf}`
        const downloadLink = document.createElement("a")
        downloadLink.href = linkSource
        downloadLink.download = result.fileName
        downloadLink.click()
      } else {
        alert(result.error || 'Failed to generate certificate')
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button 
      onClick={handleDownload} 
      disabled={loading}
      className={styles.certificateBtn}
    >
      {loading ? (
        <FaSpinner className="animate-spin" />
      ) : (
        <><FaCertificate /> Download Certificate</>
      )}
    </button>
  )
}
