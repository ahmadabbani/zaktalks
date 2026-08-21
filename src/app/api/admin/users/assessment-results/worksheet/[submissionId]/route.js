import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth-utils'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BUCKET = 'specific-assessments'

export async function GET(_request, { params }) {
  try {
    await requirePermission('users.assessments')
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { submissionId } = await params
  if (!UUID_PATTERN.test(submissionId || '')) {
    return NextResponse.json({ error: 'Invalid worksheet submission.' }, { status: 400 })
  }

  try {
    const supabase = await createAdminClient()
    const { data: submission, error: submissionError } = await supabase
      .from('specific_assessment_submissions')
      .select('generated_file_path')
      .eq('id', submissionId)
      .maybeSingle()

    if (submissionError) throw submissionError
    if (!submission?.generated_file_path) {
      return NextResponse.json({ error: 'Worksheet file not found.' }, { status: 404 })
    }

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(submission.generated_file_path, 5 * 60)
    if (error || !data?.signedUrl) throw error || new Error('Signed URL was not created.')

    return NextResponse.redirect(data.signedUrl, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Unable to open admin worksheet PDF:', error)
    return NextResponse.json({ error: 'Worksheet PDF could not be opened.' }, { status: 500 })
  }
}
