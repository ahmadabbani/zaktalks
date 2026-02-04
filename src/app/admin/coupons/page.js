import { getCoupons, getAllCourses } from './coupons.actions'
import CouponsTable from './CouponsTable'
import Link from 'next/link'
import { FaTag, FaArrowLeft } from 'react-icons/fa'
import styles from './admin-coupons.module.css'

export const metadata = {
  title: 'Coupon Management | Admin',
}

export default async function AdminCouponsPage() {
  const [coupons, courses] = await Promise.all([
    getCoupons(),
    getAllCourses()
  ])
  
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/admin/dashboard" className={styles.backLink}>
          <FaArrowLeft /> Back to Dashboard
        </Link>

        <div className={styles.header}>
          <FaTag className={styles.headerIcon} />
          <h1 className={styles.pageTitle}>Coupon Management</h1>
        </div>
        
        <p className={styles.description}>
          Create and manage discount coupons. Coupons can apply to specific courses or all courses.
        </p>
        
        <CouponsTable coupons={coupons} courses={courses} />
      </div>
    </div>
  )
}
