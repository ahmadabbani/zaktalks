'use client'

import { FaDownload } from 'react-icons/fa'
import styles from './email-previews.module.css'

export default function DownloadPdfButton() {
  return (
    <button type="button" className={styles.downloadButton} onClick={() => window.print()}>
      <span>Download as PDF</span>
      <FaDownload aria-hidden="true" />
    </button>
  )
}
