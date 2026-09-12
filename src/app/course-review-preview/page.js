import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAccessContext } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import ReviewPreview from './ReviewPreview'

export const dynamic = 'force-dynamic'

export default async function CourseReviewPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()

  const access = await getAccessContext()
  if (access.role !== 'admin') {
    return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Admin sign-in required</h1>
        <Link href="/login">Sign in</Link>
      </div>
    </main>
  }

  const supabase = await createAdminClient()
  const { data: courseRows, error } = await supabase
    .from('courses')
    .select('id, title, certificate_template_url')
    .eq('is_published', true)
    .is('deleted_at', null)
    .order('title')

  if (error) console.error('Unable to load preview courses:', error)

  const courses = (courseRows || []).map((course) => ({
    id: course.id,
    title: course.title,
    hasCertificate: Boolean(course.certificate_template_url),
  }))
  const learnerName = [access.profile?.first_name, access.profile?.last_name].filter(Boolean).join(' ') || 'Admin'

  return <ReviewPreview courses={courses} learnerName={learnerName} />
}
