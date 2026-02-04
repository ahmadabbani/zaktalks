'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'

export async function createCourse(formData) {
  await requireAdmin()
  const supabase = await createClient()

  const title = formData.get('title')
  let slug = formData.get('slug')
  
  // Normalize slug
  slug = slug ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') 
              : title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')

  const description = formData.get('description')
  const tutor_name = formData.get('tutor_name')
  const target_audience = formData.get('target_audience')
  const why_attend = formData.get('why_attend')
  const meet_the_tutor = formData.get('meet_the_tutor')
  const money_back_guarantee = formData.get('money_back_guarantee') === 'on'
  const price_cents = Math.round(parseFloat(formData.get('price')) * 100)
  const course_offers = formData.getAll('course_offers').filter(Boolean)
  const course_benefits = formData.getAll('course_benefits').filter(Boolean)
  const is_published = formData.get('is_published') === 'on'
  
  // Handle Logo Upload
  const logoFile = formData.get('logo')
  let logo_url = null

  if (logoFile && logoFile.size > 0) {
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${slug}-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, logoFile)

    if (uploadError) {
      console.error('Logo Upload Error:', uploadError)
    } else {
      const { data } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath)
      logo_url = data.publicUrl
    }
  }

  // Handle Certificate Template Upload
  const certFile = formData.get('certificate_template')
  let certificate_template_url = null

  if (certFile && certFile.size > 0) {
    const fileExt = certFile.name.split('.').pop()
    const fileName = `${slug}-cert-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, certFile)

    if (uploadError) {
      console.error('Cert Upload Error:', uploadError)
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
      description,
      target_audience,
      why_attend,
      meet_the_tutor,
      money_back_guarantee,
      tutor_name,
      price_cents,
      is_published,
      logo_url,
      certificate_template_url,
      course_offers,
      course_benefits
    }])
    .select()
    .single()

  if (error) {
    return { error: error.message }
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

  revalidatePath('/admin/courses')
  redirect('/admin/courses?success=true')
}

export async function updateCourse(id, formData) {
  await requireAdmin()
  const supabase = await createClient()

  const title = formData.get('title')
  let slug = formData.get('slug')
  
  // Normalize slug
  slug = slug ? slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '') 
              : title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '')

  const description = formData.get('description')
  const tutor_name = formData.get('tutor_name')
  const target_audience = formData.get('target_audience')
  const why_attend = formData.get('why_attend')
  const meet_the_tutor = formData.get('meet_the_tutor')
  const money_back_guarantee = formData.get('money_back_guarantee') === 'on'
  const price_cents = Math.round(parseFloat(formData.get('price')) * 100)
  const is_published = formData.get('is_published') === 'on'
  const course_offers = formData.getAll('course_offers').filter(Boolean)
  const course_benefits = formData.getAll('course_benefits').filter(Boolean)
  
  const updateData = {
    title,
    slug,
    description,
    target_audience,
    why_attend,
    meet_the_tutor,
    money_back_guarantee,
    tutor_name,
    price_cents,
    is_published,
    course_offers,
    course_benefits,
    updated_at: new Date().toISOString()
  }

  // Handle Logo Upload (only if new file provided)
  const logoFile = formData.get('logo')
  if (logoFile && logoFile.size > 0) {
    const fileExt = logoFile.name.split('.').pop()
    const fileName = `${slug}-${Date.now()}.${fileExt}`
    const filePath = `logos/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('course-images')
      .upload(filePath, logoFile)

    if (!uploadError) {
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
  if (certFile && certFile.size > 0) {
    const fileExt = certFile.name.split('.').pop()
    const fileName = `${slug}-cert-${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('certificates')
      .upload(filePath, certFile)

    if (!uploadError) {
      const { data } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath)
      updateData.certificate_template_url = data.publicUrl
    }
  }

  const { error } = await supabase
    .from('courses')
    .update(updateData)
    .eq('id', id)

  if (error) {
    return { error: error.message }
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

  // Handle New Gallery Images
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

  revalidatePath('/admin/courses')
  revalidatePath(`/admin/courses/${id}/edit`)
  revalidatePath(`/courses/${slug}`)
  redirect('/admin/courses?success=true')
}

export async function deleteCourse(id) {
  await requireAdmin()
  const supabase = await createClient()

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

  // Delete lessons
  await supabase.from('lessons').delete().eq('course_id', id)

  // Finally, delete the course (soft delete)
  const { error } = await supabase
    .from('courses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/courses')
  redirect('/admin/courses?deleted=true')
}
