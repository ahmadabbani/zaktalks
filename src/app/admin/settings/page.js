import { getAdminSettings } from './settings.actions'
import SettingsForm from './SettingsForm'
import Link from 'next/link'
import { FaCog, FaArrowLeft } from 'react-icons/fa'
import styles from './admin-settings.module.css'

export const metadata = {
  title: 'Discount Settings | Admin',
}

export default async function AdminSettingsPage() {
  const settings = await getAdminSettings()
  
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/dashboard" className={styles.backLink}>
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <div className={styles.header}>
          <FaCog className={styles.headerIcon} />
          <h1 className={styles.pageTitle}>Discount Settings</h1>
        </div>
        
        <p className={styles.description}>
          Configure the discount values for your platform. These settings affect all future checkouts.
        </p>
        
        <SettingsForm initialSettings={settings} />
      </div>
    </div>
  )
}
