import styles from './admin-users.module.css'

export function AdminDashboardLoading({ label = 'Loading dashboard data' }) {
  return (
    <div className={styles.adminDashboardLoading} role="status" aria-live="polite">
      <div className={styles.adminDashboardLoadingLabel}>
        <span className={styles.adminLoadingSpinner} aria-hidden="true" />
        <strong>{label}</strong>
      </div>
      <div className={styles.adminLoadingMetrics}>{Array.from({ length: 4 }, (_, index) => <span key={index} />)}</div>
      <div className={styles.adminLoadingPanels}><span /><span /></div>
      <div className={styles.adminLoadingRows}>{Array.from({ length: 5 }, (_, index) => <span key={index} />)}</div>
    </div>
  )
}

export function AdminDashboardUpdate({ label = 'Refreshing data' }) {
  return <div className={styles.adminDashboardUpdate} role="status" aria-live="polite"><span className={styles.adminLoadingSpinner} aria-hidden="true" /><strong>{label}</strong></div>
}
