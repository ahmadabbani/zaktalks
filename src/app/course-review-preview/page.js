import { notFound } from 'next/navigation'
import ReviewPreview from './ReviewPreview'

export const dynamic = 'force-dynamic'

export default function CourseReviewPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return <ReviewPreview />
}
