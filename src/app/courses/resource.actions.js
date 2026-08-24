'use server'

import { createClient } from '@/lib/supabase/server'

const LESSON_RESOURCE_BUCKET = 'lesson-resources'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function getAuthenticatedClient() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) throw new Error('Sign in to access this lesson resource.')
  return supabase
}

export async function getCompletedLessonResource(lessonId) {
  if (!UUID_PATTERN.test(String(lessonId || ''))) throw new Error('Invalid lesson resource request.')

  const supabase = await getAuthenticatedClient()
  const { data, error } = await supabase
    .from('lesson_resources')
    .select('resource_type, text_content, external_url, original_file_name')
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) {
    console.error('Unable to load completed lesson resource:', error.message)
    throw new Error('The lesson resource could not be loaded.')
  }

  return data || null
}

export async function getCompletedLessonResourceDownloadUrl(lessonId) {
  if (!UUID_PATTERN.test(String(lessonId || ''))) throw new Error('Invalid lesson resource request.')

  const supabase = await getAuthenticatedClient()
  const { data: resource, error: resourceError } = await supabase
    .from('lesson_resources')
    .select('storage_path, original_file_name')
    .eq('lesson_id', lessonId)
    .eq('resource_type', 'pdf')
    .maybeSingle()

  if (resourceError) {
    console.error('Unable to authorize lesson resource download:', resourceError.message)
    throw new Error('The PDF could not be prepared for download.')
  }
  if (!resource?.storage_path) throw new Error('Complete this lesson before downloading its PDF.')

  const { data, error } = await supabase.storage
    .from(LESSON_RESOURCE_BUCKET)
    .createSignedUrl(resource.storage_path, 120, { download: true })

  if (error || !data?.signedUrl) {
    console.error('Unable to sign lesson resource PDF:', error?.message || 'Missing signed URL')
    throw new Error('The PDF could not be prepared for download.')
  }

  return {
    url: data.signedUrl,
    fileName: resource.original_file_name || 'lesson-resource.pdf'
  }
}
