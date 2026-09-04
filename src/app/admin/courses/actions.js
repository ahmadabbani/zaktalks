'use server'

import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth-utils'
import { normalizeYouTubeVideoUrl } from '@/lib/youtube-url'
import { PUBLIC_PAGE_PATHS } from '@/lib/course-content'
import { randomUUID } from 'node:crypto'

const LESSON_RESOURCE_BUCKET = 'lesson-resources'
const COURSE_IMAGE_BUCKET = 'course-images'
const CERTIFICATE_BUCKET = 'certificates'
const ONE_MEGABYTE = 1024 * 1024
const COURSE_ASSET_LIMITS = {
  logo: ONE_MEGABYTE,
  gallery: ONE_MEGABYTE,
  certificate: 10 * ONE_MEGABYTE,
}
const COURSE_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function safeAssetExtension(fileName, mimeType, kind) {
  if (kind === 'certificate') return mimeType === 'application/pdf' ? 'pdf' : null
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const fromMime = extensions[mimeType]
  if (!fromMime) return null
  const fromName = String(fileName || '').split('.').pop()?.toLowerCase()
  return fromName === 'jpeg' ? 'jpg' : (fromName && ['jpg', 'png', 'webp', 'gif'].includes(fromName) ? fromName : fromMime)
}

function validateAssetDescriptor(asset) {
  const kind = asset?.kind
  if (!Object.hasOwn(COURSE_ASSET_LIMITS, kind)) throw new Error('An unsupported course file was selected.')

  const size = Number(asset?.size)
  const mimeType = cleanText(asset?.type, 120).toLowerCase()
  const maxSize = COURSE_ASSET_LIMITS[kind]
  if (!Number.isFinite(size) || size <= 0 || size > maxSize) {
    const label = kind === 'certificate' ? 'Certificate PDF' : kind === 'logo' ? 'Course logo' : 'Gallery image'
    throw new Error(`${label} must be ${kind === 'certificate' ? '10 MB' : '1 MB'} or smaller.`)
  }
  if (kind === 'certificate' ? mimeType !== 'application/pdf' : !COURSE_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error(kind === 'certificate' ? 'Certificate template must be a PDF file.' : 'Course images must be JPG, PNG, WebP, or GIF files.')
  }

  const extension = safeAssetExtension(asset?.name, mimeType, kind)
  if (!extension) throw new Error('The selected file type is not supported.')
  return { kind, size, mimeType, extension, key: cleanText(asset?.key, 100) }
}

function assetLocation(kind, userId, extension) {
  if (kind === 'logo') return { bucket: COURSE_IMAGE_BUCKET, path: `logos/${userId}/${randomUUID()}.${extension}` }
  if (kind === 'gallery') return { bucket: COURSE_IMAGE_BUCKET, path: `gallery/${userId}/${randomUUID()}.${extension}` }
  return { bucket: CERTIFICATE_BUCKET, path: `templates/${userId}/${randomUUID()}.pdf` }
}

function parseUploadedAssets(formData, userId) {
  const assets = parseJsonArray(formData.get('uploaded_assets_json'), 'Uploaded files')
  if (assets.length > 62) throw new Error('Too many files were selected.')
  const seenPaths = new Set()

  const parsed = assets.map((asset) => {
    const kind = asset?.kind
    const bucket = cleanText(asset?.bucket, 80)
    const path = cleanText(asset?.path, 500)
    const key = cleanText(asset?.key, 100)
    const expectedBucket = kind === 'certificate' ? CERTIFICATE_BUCKET : COURSE_IMAGE_BUCKET
    const expectedPrefix = kind === 'logo'
      ? `logos/${userId}/`
      : kind === 'gallery'
        ? `gallery/${userId}/`
        : `templates/${userId}/`

    if (!Object.hasOwn(COURSE_ASSET_LIMITS, kind) || bucket !== expectedBucket || !path.startsWith(expectedPrefix) || seenPaths.has(`${bucket}:${path}`)) {
      throw new Error('Uploaded course file information is invalid. Please select the files again.')
    }
    seenPaths.add(`${bucket}:${path}`)
    return { kind, bucket, path, key }
  })

  if (parsed.filter((asset) => asset.kind === 'logo').length > 1 || parsed.filter((asset) => asset.kind === 'certificate').length > 1) {
    throw new Error('Only one logo and one certificate PDF can be uploaded for a course.')
  }
  return parsed
}

async function removeUploadedAssets(supabase, assets) {
  const byBucket = new Map()
  for (const asset of assets) {
    if (!byBucket.has(asset.bucket)) byBucket.set(asset.bucket, [])
    byBucket.get(asset.bucket).push(asset.path)
  }
  await Promise.all([...byBucket.entries()].map(([bucket, paths]) => supabase.storage.from(bucket).remove(paths)))
}

function publicAssetUrl(supabase, asset) {
  return supabase.storage.from(asset.bucket).getPublicUrl(asset.path).data.publicUrl
}

export async function prepareCourseAssetUploads(mode, assets) {
  const permission = mode === 'edit' ? 'courses.edit' : 'courses.create'
  const access = await requirePermission(permission)
  const supabase = await createAdminClient()
  if (!Array.isArray(assets) || assets.length > 62) return { error: 'Too many files were selected.' }
  if (assets.filter((asset) => asset?.kind === 'logo').length > 1 || assets.filter((asset) => asset?.kind === 'certificate').length > 1) {
    return { error: 'Only one logo and one certificate PDF can be uploaded for a course.' }
  }

  try {
    const prepared = []
    for (const rawAsset of assets) {
      const asset = validateAssetDescriptor(rawAsset)
      const location = assetLocation(asset.kind, access.user.id, asset.extension)
      const { data, error } = await supabase.storage
        .from(location.bucket)
        .createSignedUploadUrl(location.path)
      if (error || !data?.token) throw new Error('A secure upload could not be prepared. Please try again.')
      prepared.push({ ...location, kind: asset.kind, key: asset.key, token: data.token })
    }
    return { uploads: prepared }
  } catch (error) {
    return { error: error.message || 'The files could not be prepared for upload.' }
  }
}

export async function cleanupCourseAssetUploads(mode, assets) {
  const permission = mode === 'edit' ? 'courses.edit' : 'courses.create'
  const access = await requirePermission(permission)
  const supabase = await createAdminClient()
  try {
    const formData = new FormData()
    formData.set('uploaded_assets_json', JSON.stringify(Array.isArray(assets) ? assets : []))
    const safeAssets = parseUploadedAssets(formData, access.user.id)
    await removeUploadedAssets(supabase, safeAssets)
  } catch (error) {
    console.error('Unable to clean up pending course assets:', error)
  }
}

function cleanText(value, maxLength = 5000) {
  return String(value || '').trim().slice(0, maxLength)
}

function cleanList(values, maxItems = 60, maxLength = 1000) {
  return values
    .slice(0, maxItems)
    .map((value) => cleanText(value, maxLength))
    .filter(Boolean)
}

function parseJsonArray(value, fieldName) {
  try {
    const parsed = JSON.parse(String(value || '[]'))
    if (!Array.isArray(parsed)) throw new Error()
    return parsed
  } catch {
    throw new Error(`${fieldName} contains invalid data. Please refresh the page and try again.`)
  }
}

function parseContentBlocks(value, fieldName) {
  const blocks = parseJsonArray(value, fieldName)
    .slice(0, 30)
    .map((item) => {
      const title = cleanText(item?.title, 180)
      const contentType = item?.content_type === 'list' ? 'list' : 'text'
      const text = contentType === 'text' ? cleanText(item?.text, 8000) : ''
      const items = contentType === 'list' ? cleanList(Array.isArray(item?.items) ? item.items : [], 60, 1200) : []
      return { title, content_type: contentType, text, items }
    })
    .filter((item) => item.title || item.text || item.items.length > 0)

  for (const item of blocks) {
    if (!item.title) throw new Error(`Add a title for every ${fieldName} item.`)
    if (item.content_type === 'text' && !item.text) throw new Error(`Add information for every ${fieldName} item.`)
    if (item.content_type === 'list' && item.items.length === 0) throw new Error(`Add at least one list entry for every ${fieldName} list item.`)
  }

  return blocks
}

function parseExploreMore(value) {
  return parseJsonArray(value, 'Explore More')
    .slice(0, 30)
    .map((item) => ({
      target_type: item?.target_type === 'page' ? 'page' : 'course',
      course_id: cleanText(item?.course_id, 80),
      page_path: cleanText(item?.page_path, 120),
      description: cleanText(item?.description, 3000),
      cta_text: cleanText(item?.cta_text, 120),
    }))
    .filter((item) => item.course_id || item.page_path || item.description || item.cta_text)
}

function legacyDetailsText(items) {
  return items.map((item) => {
    const content = item.content_type === 'list' ? item.items.join(', ') : item.text
    return [item.title, content].filter(Boolean).join(': ')
  }).filter(Boolean).join('\n')
}

async function buildCourseContent(formData, supabase, currentCourseId = null) {
  const detailsToKnowItems = parseContentBlocks(formData.get('details_to_know_items_json'), 'Details to Know')
  const whatYoullExplore = parseContentBlocks(formData.get('what_youll_explore_json'), 'What You’ll Explore')
  const exploreMore = parseExploreMore(formData.get('explore_more_json'))

  for (const item of exploreMore) {
    if (item.target_type === 'page' && !PUBLIC_PAGE_PATHS.has(item.page_path)) {
      throw new Error('Choose a valid public page in Explore More.')
    }
    if (item.target_type === 'course' && !item.course_id) {
      throw new Error('Choose a course for every course recommendation.')
    }
    if (!item.cta_text) {
      throw new Error('Add CTA text for every Explore More recommendation.')
    }
    if (!item.description) {
      throw new Error('Add a description for every Explore More recommendation.')
    }
  }

  const referencedCourseIds = [...new Set(exploreMore.filter((item) => item.target_type === 'course').map((item) => item.course_id))]
  if (currentCourseId && referencedCourseIds.includes(currentCourseId)) {
    throw new Error('A course cannot recommend itself in Explore More.')
  }
  if (referencedCourseIds.length > 0) {
    const { data: referencedCourses, error } = await supabase
      .from('courses')
      .select('id')
      .in('id', referencedCourseIds)
      .is('deleted_at', null)

    if (error || (referencedCourses || []).length !== referencedCourseIds.length) {
      throw new Error('One of the selected Explore More courses is no longer available.')
    }
  }

  const price = Number.parseFloat(String(formData.get('price') || '0'))
  if (!Number.isFinite(price) || price < 0) throw new Error('Enter a valid non-negative course price.')

  return {
    promise: cleanText(formData.get('promise'), 8000),
    short_introduction: cleanText(formData.get('short_introduction'), 4000),
    primary_cta_text: cleanText(formData.get('primary_cta_text'), 120),
    bold_introduction: cleanText(formData.get('bold_introduction'), 1000),
    subheadline: cleanText(formData.get('subheadline'), 4000),
    description: cleanText(formData.get('description'), 12000),
    course_info_modules: cleanText(formData.get('course_info_modules'), 240),
    course_level: cleanText(formData.get('course_level'), 240),
    course_language: cleanText(formData.get('course_language'), 240),
    flexible_schedule: cleanText(formData.get('flexible_schedule'), 240),
    course_support: cleanText(formData.get('course_support'), 240),
    target_audience_title: cleanText(formData.get('target_audience_title'), 240) || 'Who this is for',
    who_this_is_not_for_title: cleanText(formData.get('who_this_is_not_for_title'), 240) || 'Who this is not for',
    audience_supporting_text: cleanText(formData.get('audience_supporting_text'), 5000),
    details_to_know: legacyDetailsText(detailsToKnowItems),
    details_to_know_items: detailsToKnowItems,
    details_cta_text: cleanText(formData.get('details_cta_text'), 120),
    what_youll_explore: whatYoullExplore,
    explore_more: exploreMore,
    target_audience: cleanList(formData.getAll('target_audience')),
    who_this_is_not_for: cleanList(formData.getAll('who_this_is_not_for')),
    what_youll_learn: cleanList(formData.getAll('what_youll_learn')),
    skills_youll_gain: cleanList(formData.getAll('skills_youll_gain')),
    price_cents: Math.round(price * 100),
  }
}

export async function createCourse(formData) {
  const access = await requirePermission('courses.create')
  const supabase = await createAdminClient()

  let uploadedAssets = []
  try {
    uploadedAssets = parseUploadedAssets(formData, access.user.id)
  } catch (error) {
    return { error: error.message }
  }
  const fail = async (message) => {
    await removeUploadedAssets(supabase, uploadedAssets)
    return { error: message }
  }

  const title = cleanText(formData.get('title'), 240)
  const rawSlug = cleanText(formData.get('slug'), 240)
  let slug = rawSlug
  if (!title) return fail('Course title is required.')
  if (!rawSlug) return fail('Course URL slug is required.')
  
  // Normalize slug
  slug = slug ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') 
              : title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')

  const introductionVideoValue = String(formData.get('introduction_video_url') || '').trim()
  const introduction_video_url = normalizeYouTubeVideoUrl(introductionVideoValue)
  const tutor_name = cleanText(formData.get('tutor_name'), 240)
  const meet_the_tutor = cleanText(formData.get('meet_the_tutor'), 8000)
  const money_back_guarantee = formData.get('money_back_guarantee') === 'on'
  const is_published = formData.get('is_published') === 'on'

  if (!tutor_name) return fail('Tutor name is required.')

  if (introductionVideoValue && !introduction_video_url) {
    return fail('Enter a valid YouTube video link for the course introduction.')
  }

  let courseContent
  try {
    courseContent = await buildCourseContent(formData, supabase)
  } catch (error) {
    return fail(error.message)
  }
  
  // Handle Logo Upload
  const logoFile = formData.get('logo')
  const uploadedLogo = uploadedAssets.find((asset) => asset.kind === 'logo')
  let logo_url = uploadedLogo ? publicAssetUrl(supabase, uploadedLogo) : null

  if (!uploadedLogo && logoFile && logoFile.size > 0) {
    try {
      validateAssetDescriptor({ kind: 'logo', name: logoFile.name, size: logoFile.size, type: logoFile.type })
    } catch (error) {
      return fail(error.message)
    }
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${slug}-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, logoFile)

    if (uploadError) {
      console.error('Logo Upload Error:', uploadError)
      return fail('The course logo could not be uploaded. Please try again.')
    } else {
      const { data } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath)
      logo_url = data.publicUrl
    }
  }

  // Handle Certificate Template Upload
  const certFile = formData.get('certificate_template')
  const uploadedCertificate = uploadedAssets.find((asset) => asset.kind === 'certificate')
  let certificate_template_url = uploadedCertificate ? publicAssetUrl(supabase, uploadedCertificate) : null

  if (!uploadedCertificate && certFile && certFile.size > 0) {
    try {
      validateAssetDescriptor({ kind: 'certificate', name: certFile.name, size: certFile.size, type: certFile.type })
    } catch (error) {
      return fail(error.message)
    }
    const fileExt = certFile.name.split('.').pop()
    const fileName = `${slug}-cert-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, certFile)

    if (uploadError) {
      console.error('Cert Upload Error:', uploadError)
      return fail('The certificate PDF could not be uploaded. Please try again.')
    } else {
      const { data } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath)
      certificate_template_url = data.publicUrl
    }
  }

  const { data, error } = await supabase
    .from('courses')
    .insert([{
      title,
      slug,
      ...courseContent,
      introduction_video_url,
      meet_the_tutor,
      money_back_guarantee,
      tutor_name,
      is_published,
      logo_url,
      certificate_template_url
    }])
    .select()
    .single()

  if (error) {
    return fail(error.message)
  }

  // Handle FAQs
  const faqQuestions = formData.getAll('faq_questions')
  const faqAnswers = formData.getAll('faq_answers')
  const faqsToInsert = faqQuestions.map((q, i) => ({
    course_id: data.id,
    question: q,
    answer: faqAnswers[i],
    display_order: i
  })).filter(faq => faq.question && faq.answer)

  if (faqsToInsert.length > 0) {
    await supabase.from('course_faqs').insert(faqsToInsert)
  }

  // Handle Gallery Images
  const uploadedGallery = uploadedAssets.filter((asset) => asset.kind === 'gallery')
  if (uploadedGallery.length > 0) {
    const { error: galleryInsertError } = await supabase.from('course_images').insert(uploadedGallery.map((asset, index) => ({
      course_id: data.id,
      image_url: publicAssetUrl(supabase, asset),
      display_order: index,
    })))
    if (galleryInsertError) {
      console.error('Gallery Insert Error:', galleryInsertError)
      await supabase.from('courses').delete().eq('id', data.id)
      return fail('The course gallery could not be saved. Your entries are still here; please try again.')
    }
  }

  const galleryFiles = formData.getAll('gallery_images')
  for (let i = 0; i < galleryFiles.length; i++) {
    const file = galleryFiles[i]
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${slug}-gallery-${Date.now()}-${i}.${fileExt}`
      const filePath = `gallery/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('course-images')
        .upload(filePath, file)

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('course-images')
          .getPublicUrl(filePath)
        
        await supabase.from('course_images').insert({
          course_id: data.id,
          image_url: urlData.publicUrl,
          display_order: i
        })
      }
    }
  }

  revalidatePath('/admin/dashboard')
  redirect(`/admin/courses/${data.id}/lessons?created=true`)
}

export async function updateCourse(id, formData) {
  const access = await requirePermission('courses.edit')
  const supabase = await createAdminClient()

  let uploadedAssets = []
  try {
    uploadedAssets = parseUploadedAssets(formData, access.user.id)
  } catch (error) {
    return { error: error.message }
  }
  const fail = async (message) => {
    await removeUploadedAssets(supabase, uploadedAssets)
    return { error: message }
  }

  const title = cleanText(formData.get('title'), 240)
  const rawSlug = cleanText(formData.get('slug'), 240)
  let slug = rawSlug
  if (!title) return fail('Course title is required.')
  if (!rawSlug) return fail('Course URL slug is required.')
  
  // Normalize slug
  slug = slug ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') 
              : title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')

  const introductionVideoValue = String(formData.get('introduction_video_url') || '').trim()
  const introduction_video_url = normalizeYouTubeVideoUrl(introductionVideoValue)
  const tutor_name = cleanText(formData.get('tutor_name'), 240)
  const meet_the_tutor = cleanText(formData.get('meet_the_tutor'), 8000)
  const money_back_guarantee = formData.get('money_back_guarantee') === 'on'
  const is_published = formData.get('is_published') === 'on'

  if (!tutor_name) return fail('Tutor name is required.')

  if (introductionVideoValue && !introduction_video_url) {
    return fail('Enter a valid YouTube video link for the course introduction.')
  }

  let courseContent
  try {
    courseContent = await buildCourseContent(formData, supabase, id)
  } catch (error) {
    return fail(error.message)
  }
  
  const updateData = {
    title,
    slug,
    ...courseContent,
    introduction_video_url,
    meet_the_tutor,
    money_back_guarantee,
    tutor_name,
    is_published,
    updated_at: new Date().toISOString()
  }

  // Handle Logo Upload (only if new file provided)
  const logoFile = formData.get('logo')
  const uploadedLogo = uploadedAssets.find((asset) => asset.kind === 'logo')
  if (uploadedLogo) {
    updateData.logo_url = publicAssetUrl(supabase, uploadedLogo)
  } else if (logoFile && logoFile.size > 0) {
    try {
      validateAssetDescriptor({ kind: 'logo', name: logoFile.name, size: logoFile.size, type: logoFile.type })
    } catch (error) {
      return fail(error.message)
    }
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${slug}-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, logoFile)

    if (uploadError) {
      return fail('The course logo could not be uploaded. Please try again.')
    } else {
      const { data } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath)
      
      if (data?.publicUrl) {
          updateData.logo_url = data.publicUrl
      }
    }
  }

  // Handle Certificate Template Upload
  const certFile = formData.get('certificate_template')
  const uploadedCertificate = uploadedAssets.find((asset) => asset.kind === 'certificate')
  if (uploadedCertificate) {
    updateData.certificate_template_url = publicAssetUrl(supabase, uploadedCertificate)
  } else if (certFile && certFile.size > 0) {
    try {
      validateAssetDescriptor({ kind: 'certificate', name: certFile.name, size: certFile.size, type: certFile.type })
    } catch (error) {
      return fail(error.message)
    }
    const fileExt = certFile.name.split('.').pop()
    const fileName = `${slug}-cert-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, certFile)

    if (uploadError) {
      return fail('The certificate PDF could not be uploaded. Please try again.')
    } else {
      const { data } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath)
      updateData.certificate_template_url = data.publicUrl
    }
  }

  // Attach newly uploaded gallery files before changing course metadata. If the
  // metadata update fails, these rows and files can be removed cleanly.
  const uploadedGallery = uploadedAssets.filter((asset) => asset.kind === 'gallery')
  const uploadedGalleryUrls = uploadedGallery.map((asset) => publicAssetUrl(supabase, asset))
  if (uploadedGallery.length > 0) {
    const { error: galleryInsertError } = await supabase.from('course_images').insert(uploadedGallery.map((asset, index) => ({
      course_id: id,
      image_url: uploadedGalleryUrls[index],
      display_order: 99,
    })))
    if (galleryInsertError) {
      console.error('Gallery Insert Error:', galleryInsertError)
      return fail('The new gallery images could not be saved. Your entries are still here; please try again.')
    }
  }

  const { error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', id)

  if (error) {
    if (uploadedGalleryUrls.length > 0) {
      await supabase.from('course_images').delete().eq('course_id', id).in('image_url', uploadedGalleryUrls)
    }
    return fail(error.message)
  }

  // Handle FAQs (Sync strategy: delete and re-insert)
  await supabase.from('course_faqs').delete().eq('course_id', id)
  const faqQuestions = formData.getAll('faq_questions')
  const faqAnswers = formData.getAll('faq_answers')
  const faqsToInsert = faqQuestions.map((q, i) => ({
    course_id: id,
    question: q,
    answer: faqAnswers[i],
    display_order: i
  })).filter(faq => faq.question && faq.answer)

  if (faqsToInsert.length > 0) {
    await supabase.from('course_faqs').insert(faqsToInsert)
  }

  // Handle Gallery Images (Individual Deletions)
  const deletedUrls = formData.getAll('deleted_image_urls')
  for (const url of deletedUrls) {
      // 1. Delete from DB
      await supabase.from('course_images').delete().eq('course_id', id).eq('image_url', url)
      
      // 2. Delete from Storage
      const pathPart = url.split('/course-images/')[1]
      if (pathPart) {
          const filePath = decodeURIComponent(pathPart)
          await supabase.storage.from('course-images').remove([filePath])
      }
  }

  // Handle New Gallery Images submitted through the legacy server-upload path.
  const galleryFiles = formData.getAll('gallery_images')
  for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i]
      if (file && file.size > 0) {
          const fileExt = file.name.split('.').pop()
          const fileName = `${slug}-gallery-${Date.now()}-${i}.${fileExt}`
          const filePath = `gallery/${fileName}`

          const { error: uploadError } = await supabase.storage
              .from('course-images')
              .upload(filePath, file)

          if (!uploadError) {
              const { data: urlData } = supabase.storage
                  .from('course-images')
                  .getPublicUrl(filePath)
              
              await supabase.from('course_images').insert({
                  course_id: id,
                  image_url: urlData.publicUrl,
                  display_order: 99 // Or fetch max and increment
              })
          }
      }
  }

  revalidatePath('/admin/dashboard')
  revalidatePath(`/admin/courses/${id}/edit`)
  revalidatePath(`/courses/${slug}`)
  redirect('/admin/dashboard?view=courses&success=true')
}

export async function deleteCourse(id) {
  await requirePermission('courses.edit')
  const supabase = await createAdminClient()

  // First, get the course data to find all files that need to be deleted
  const { data: course, error: fetchError } = await supabase
    .from('courses')
    .select('*, images:course_images(*)')
    .eq('id', id)
    .single()

  if (fetchError || !course) {
    return { error: 'Course not found' }
  }

  // Delete logo from storage if exists
  if (course.logo_url) {
    const pathPart = course.logo_url.split('/course-images/')[1]
    if (pathPart) {
      const filePath = decodeURIComponent(pathPart)
      await supabase.storage.from('course-images').remove([filePath])
    }
  }

  // Delete certificate PDF from storage if exists
  if (course.certificate_template_url) {
    const pathPart = course.certificate_template_url.split('/certificates/')[1]
    if (pathPart) {
      const filePath = decodeURIComponent(pathPart)
      await supabase.storage.from('certificates').remove([filePath])
    }
  }

  // Delete all gallery images from storage
  if (course.images && course.images.length > 0) {
    for (const img of course.images) {
      const pathPart = img.image_url.split('/course-images/')[1]
      if (pathPart) {
        const filePath = decodeURIComponent(pathPart)
        await supabase.storage.from('course-images').remove([filePath])
      }
    }
  }

  // Delete gallery images from database
  await supabase.from('course_images').delete().eq('course_id', id)

  // Delete FAQs
  await supabase.from('course_faqs').delete().eq('course_id', id)

  // Capture private lesson PDF paths before lesson deletion cascades their metadata.
  const { data: lessonResources, error: resourceLookupError } = await supabase
    .from('lesson_resources')
    .select('storage_path, lesson:lessons!inner(course_id)')
    .eq('lesson.course_id', id)
    .eq('resource_type', 'pdf')

  if (resourceLookupError) {
    console.error('Unable to load lesson resources before course deletion:', resourceLookupError.message)
  }

  // Delete lessons
  await supabase.from('lessons').delete().eq('course_id', id)

  const lessonResourcePaths = (lessonResources || []).map((resource) => resource.storage_path).filter(Boolean)
  for (let index = 0; index < lessonResourcePaths.length; index += 100) {
    const { error: resourceDeleteError } = await supabase.storage
      .from(LESSON_RESOURCE_BUCKET)
      .remove(lessonResourcePaths.slice(index, index + 100))
    if (resourceDeleteError) console.error('Unable to remove some lesson resource PDFs:', resourceDeleteError.message)
  }

  // Delete user enrollments for this course so it no longer appears in user dashboards
  await supabase.from('user_enrollments').delete().eq('course_id', id)

  // Finally, delete the course (soft delete)
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/dashboard')
  redirect('/admin/dashboard?view=courses&deleted=true')
}
