import Link from 'next/link'
import { getExternalAssessmentByToken } from '../external-assessment.actions'
import ExternalAssessmentRunner from '../ExternalAssessmentRunner'
import styles from '@/assessments/assessment.module.css'

export default async function ExternalAssessmentPage({ params }) {
  const { token } = await params
  const result = await getExternalAssessmentByToken(token)

  if (!result.success) {
    const isExpired = result.reason === 'expired'
    return (
      <main className={styles.externalAssessmentPage}>
        <div className={styles.externalAssessmentMessage}>
          <h1>{isExpired ? 'This link has expired' : 'Invalid assessment link'}</h1>
          <p>
            {isExpired
              ? 'Please ask the admin to generate a fresh assessment link.'
              : 'Please check the link or ask the admin to send a new one.'}
          </p>
          <Link href="/">Back to website</Link>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.externalAssessmentPage}>
      <ExternalAssessmentRunner assessmentKey={result.assessmentKey} />
    </main>
  )
}
