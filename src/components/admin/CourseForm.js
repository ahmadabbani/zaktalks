'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { FaCheck, FaChevronDown, FaCloudUploadAlt, FaDatabase, FaExclamationCircle } from 'react-icons/fa'
import { PUBLIC_PAGE_OPTIONS, legacyDetailsToBlocks, normalizeContentBlocks, normalizeExploreMore } from '@/lib/course-content'
import { createClient } from '@/lib/supabase/client'
import { cleanupCourseAssetUploads, prepareCourseAssetUploads } from '@/app/admin/courses/actions'
import styles from './CourseForm.module.css'

const ONE_MEGABYTE = 1024 * 1024
const FILE_LIMITS = { logo: ONE_MEGABYTE, gallery: ONE_MEGABYTE, certificate: 10 * ONE_MEGABYTE }
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const COURSE_LEVEL_OPTIONS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
]

function SubmitButton({ buttonText, pending }) {
  return (
    <button 
      type="submit" 
      className={styles.submitButton}
      disabled={pending}
    >
      {pending ? 'Saving course' : buttonText}
    </button>
  )
}

function CustomSelect({ name, value, onChange, options, placeholder = 'Select an option', ariaLabel }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null

  useEffect(() => {
    if (!open) return undefined
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const choose = (option) => {
    if (option.disabled) return
    onChange(option.value)
    setOpen(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
    event.preventDefault()
    const available = options.filter((option) => !option.disabled)
    if (!available.length) return
    const currentIndex = available.findIndex((option) => option.value === value)
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : available.length - 1)
      : (currentIndex + direction + available.length) % available.length
    onChange(available[nextIndex].value)
    setOpen(true)
  }

  return (
    <div className={styles.customSelect} ref={rootRef} onKeyDown={handleKeyDown}>
      {name && <input type="hidden" name={name} value={value || ''} />}
      <button
        type="button"
        className={`${styles.customSelectTrigger} ${open ? styles.customSelectTriggerOpen : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selected ? '' : styles.customSelectPlaceholder}>{selected?.label || placeholder}</span>
        <FaChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.customSelectMenu} id={menuId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              disabled={option.disabled}
              className={option.value === value ? styles.customSelectOptionSelected : ''}
              onClick={() => choose(option)}
              key={option.value}
            >
              <span>{option.label}</span>
              {option.value === value && <FaCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FieldError({ message }) {
  if (!message) return null
  return <p className={styles.fieldError}><FaExclamationCircle /> {message}</p>
}

function SaveProgress({ progress }) {
  if (!progress.visible) return null
  const steps = [
    { key: 'validate', label: 'Check details', icon: FaCheck },
    { key: 'upload', label: 'Upload files', icon: FaCloudUploadAlt },
    { key: 'save', label: 'Save course', icon: FaDatabase },
  ]
  const order = { validate: 0, upload: 1, save: 2, done: 3 }
  const activeIndex = order[progress.stage] ?? 0

  return (
    <div className={styles.saveProgress} role="status" aria-live="polite">
      <div className={styles.progressHeader}>
        <div>
          <strong>{progress.label}</strong>
          <span>{progress.detail}</span>
        </div>
        <b>{progress.percent}%</b>
      </div>
      <div className={styles.progressTrack} aria-label={`${progress.percent}% complete`}>
        <span style={{ width: `${progress.percent}%` }} />
      </div>
      <div className={styles.progressSteps}>
        {steps.map((step, index) => {
          const Icon = step.icon
          const complete = index < activeIndex
          const active = index === activeIndex
          return (
            <span key={step.key} className={`${complete ? styles.progressStepComplete : ''} ${active ? styles.progressStepActive : ''}`}>
              {complete ? <FaCheck /> : <Icon />}
              {step.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function toList(value) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function emptyContentBlock() {
  return { title: '', content_type: 'text', text: '', items: [] }
}

function isYouTubeUrl(value) {
  if (!value) return true
  try {
    const url = new URL(value)
    return ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtu.be'].includes(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

function validateFile(file, kind) {
  if (!file || file.size === 0) return null
  const label = kind === 'certificate' ? 'Certificate PDF' : kind === 'logo' ? 'Course logo' : 'Gallery image'
  if (file.size > FILE_LIMITS[kind]) return `${label} must be ${kind === 'certificate' ? '10 MB' : '1 MB'} or smaller.`
  if (kind === 'certificate' && file.type !== 'application/pdf') return 'Certificate template must be a PDF file.'
  if (kind !== 'certificate' && !IMAGE_TYPES.has(file.type)) return `${label} must be a JPG, PNG, WebP, or GIF file.`
  return null
}

function assetLabel(kind) {
  if (kind === 'logo') return 'course logo'
  if (kind === 'certificate') return 'certificate PDF'
  return 'gallery image'
}

function StructuredContentEditor({ title, description, items, setItems, titleLabel = 'Title', error, errorKey }) {
  const insertBlockAfter = (index) => {
    const nextItems = [...items]
    nextItems.splice(index + 1, 0, emptyContentBlock())
    setItems(nextItems)
  }

  const updateBlock = (index, field, value) => {
    setItems(items.map((item, itemIndex) => itemIndex === index
      ? {
          ...item,
          [field]: value,
          items: field === 'content_type' && value === 'list' && item.items.length === 0 ? [''] : item.items,
        }
      : item))
  }

  const updateListItem = (blockIndex, itemIndex, value) => {
    setItems(items.map((block, currentBlockIndex) => currentBlockIndex === blockIndex
      ? { ...block, items: block.items.map((item, currentItemIndex) => currentItemIndex === itemIndex ? value : item) }
      : block))
  }

  const addListItem = (blockIndex) => {
    setItems(items.map((block, currentBlockIndex) => currentBlockIndex === blockIndex
      ? { ...block, items: [...block.items, ''] }
      : block))
  }

  const removeListItem = (blockIndex, itemIndex) => {
    setItems(items.map((block, currentBlockIndex) => currentBlockIndex === blockIndex
      ? { ...block, items: block.items.length <= 1 ? [''] : block.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex) }
      : block))
  }

  return (
    <section className={styles.builderSection} data-error-key={errorKey} tabIndex={-1}>
      <div className={styles.builderHeader}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {items.length === 0 && <button type="button" onClick={() => setItems([emptyContentBlock()])} className={styles.addButton}>+ Add Item</button>}
      </div>

      <div className={styles.builderItems}>
        <FieldError message={error} />
        {items.map((item, index) => (
          <article className={styles.builderItem} key={index}>
            <div className={styles.builderItemTopline}>
              <strong>Item {index + 1}</strong>
              <button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className={styles.removeItemButton}>Remove</button>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label>{titleLabel}</label>
                <input type="text" value={item.title} onChange={(event) => updateBlock(index, 'title', event.target.value)} placeholder="Add a clear title" required />
              </div>
              <div className={styles.formGroup}>
                <label>Information format</label>
                <CustomSelect
                  value={item.content_type}
                  onChange={(value) => updateBlock(index, 'content_type', value)}
                  options={[
                    { value: 'text', label: 'Paragraph' },
                    { value: 'list', label: 'List of items' },
                  ]}
                  ariaLabel={`Information format for ${title} item ${index + 1}`}
                />
              </div>
            </div>

            {item.content_type === 'list' ? (
              <div className={styles.nestedList}>
                <div className={styles.nestedListHeader}>
                  <label>Information</label>
                  <button type="button" onClick={() => addListItem(index)} className={styles.secondaryAddButton}>+ Add List Item</button>
                </div>
                {item.items.map((listItem, itemIndex) => (
                  <div className={styles.listItem} key={itemIndex}>
                    <input type="text" value={listItem} onChange={(event) => updateListItem(index, itemIndex, event.target.value)} placeholder="Add information" required />
                    <button type="button" onClick={() => removeListItem(index, itemIndex)} className={styles.deleteSlotButton} aria-label="Remove list item">&times;</button>
                  </div>
                ))}
                {item.items.length === 0 && <p className={styles.emptyState}>Add the first list item.</p>}
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label>Information</label>
                <textarea rows="4" value={item.text} onChange={(event) => updateBlock(index, 'text', event.target.value)} placeholder="Add the supporting information..." required />
              </div>
            )}
            {index === items.length - 1 && (
              <div className={styles.builderItemFooter}>
                <button type="button" onClick={() => insertBlockAfter(index)} className={styles.addButton}>+ Add Another Item</button>
              </div>
            )}
          </article>
        ))}
        {items.length === 0 && <p className={styles.builderEmpty}>No items added yet.</p>}
      </div>
    </section>
  )
}

function ExploreMoreEditor({ items, setItems, availableCourses, error }) {
  const updateItem = (index, field, value) => {
    setItems(items.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      if (field === 'target_type') {
        return {
          ...item,
          target_type: value,
          course_id: value === 'course' ? (availableCourses[0]?.id || '') : '',
          page_path: value === 'page' ? PUBLIC_PAGE_OPTIONS[0].path : '',
        }
      }
      return { ...item, [field]: value }
    }))
  }

  const newItem = () => {
    const useCourse = availableCourses.length > 0
    return {
      target_type: useCourse ? 'course' : 'page',
      course_id: useCourse ? availableCourses[0].id : '',
      page_path: useCourse ? '' : PUBLIC_PAGE_OPTIONS[0].path,
      description: '',
      cta_text: '',
    }
  }

  const addItem = () => {
    setItems([...items, newItem()])
  }

  const insertItemAfter = (index) => {
    const nextItems = [...items]
    nextItems.splice(index + 1, 0, newItem())
    setItems(nextItems)
  }

  return (
    <section className={styles.builderSection} data-error-key="explore_more" tabIndex={-1}>
      <div className={styles.builderHeader}>
        <div>
          <h2>Explore More</h2>
          <p>Connect this course to other courses or public pages. The destination link is saved automatically.</p>
        </div>
        {items.length === 0 && <button type="button" onClick={addItem} className={styles.addButton}>+ Add Recommendation</button>}
      </div>
      <div className={styles.builderItems}>
        <FieldError message={error} />
        {items.map((item, index) => (
          <article className={styles.builderItem} key={index}>
            <div className={styles.builderItemTopline}>
              <strong>Recommendation {index + 1}</strong>
              <button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className={styles.removeItemButton}>Remove</button>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label>Destination type</label>
                <CustomSelect
                  value={item.target_type}
                  onChange={(value) => updateItem(index, 'target_type', value)}
                  options={[
                    { value: 'course', label: 'Course', disabled: availableCourses.length === 0 },
                    { value: 'page', label: 'Website page' },
                  ]}
                  ariaLabel={`Destination type for recommendation ${index + 1}`}
                />
              </div>
              <div className={styles.formGroup}>
                <label>{item.target_type === 'course' ? 'Course' : 'Website page'}</label>
                {item.target_type === 'course' ? (
                  <CustomSelect
                    value={item.course_id}
                    onChange={(value) => updateItem(index, 'course_id', value)}
                    options={availableCourses.map((course) => ({ value: course.id, label: course.title }))}
                    placeholder="Select a course"
                    ariaLabel={`Course for recommendation ${index + 1}`}
                  />
                ) : (
                  <CustomSelect
                    value={item.page_path}
                    onChange={(value) => updateItem(index, 'page_path', value)}
                    options={PUBLIC_PAGE_OPTIONS.map((page) => ({ value: page.path, label: page.label }))}
                    placeholder="Select a website page"
                    ariaLabel={`Website page for recommendation ${index + 1}`}
                  />
                )}
              </div>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea rows="3" value={item.description} onChange={(event) => updateItem(index, 'description', event.target.value)} placeholder="Explain why learners may want to explore this next..." required />
              </div>
              <div className={styles.formGroup}>
                <label>CTA text</label>
                <input type="text" value={item.cta_text} onChange={(event) => updateItem(index, 'cta_text', event.target.value)} placeholder="e.g. Explore this course" required />
              </div>
            </div>
            {index === items.length - 1 && (
              <div className={styles.builderItemFooter}>
                <button type="button" onClick={() => insertItemAfter(index)} className={styles.addButton}>+ Add Another Recommendation</button>
              </div>
            )}
          </article>
        ))}
        {items.length === 0 && <p className={styles.builderEmpty}>No recommendations added yet.</p>}
      </div>
    </section>
  )
}

export default function CourseForm({ initialData = {}, action, buttonText = "Save Course", availableCourses = [] }) {
  const formRef = useRef(null)
  const [learningOutcomes, setLearningOutcomes] = useState(initialData.what_youll_learn || [])
  const [skills, setSkills] = useState(initialData.skills_youll_gain || [])
  const [targetAudience, setTargetAudience] = useState(toList(initialData.target_audience))
  const [notForAudience, setNotForAudience] = useState(toList(initialData.who_this_is_not_for))
  const [detailsItems, setDetailsItems] = useState(legacyDetailsToBlocks(initialData.details_to_know_items, initialData.details_to_know))
  const [exploreItems, setExploreItems] = useState(normalizeContentBlocks(initialData.what_youll_explore))
  const [exploreMore, setExploreMore] = useState(normalizeExploreMore(initialData.explore_more))
  const [faqs, setFaqs] = useState(initialData.faqs || [])
  const [existingImages, setExistingImages] = useState(initialData.images || [])
  const [deletedImageUrls, setDeletedImageUrls] = useState([])
  const [newImageSlots, setNewImageSlots] = useState([]) // Array of objects: { id, preview }
  const [imagePreviews, setImagePreviews] = useState({}) // Map of slot id to preview URL
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoRemoved, setLogoRemoved] = useState(false)
  const [courseLevel, setCourseLevel] = useState(initialData.course_level || '')
  const [isSaving, setIsSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [saveNotice, setSaveNotice] = useState(null)
  const [progress, setProgress] = useState({ visible: false, stage: 'validate', percent: 0, label: '', detail: '' })

  const addItem = (setter, list) => {
    setter([...list, ""])
  }

  const removeItem = (setter, list, index) => {
    const newList = [...list]
    newList.splice(index, 1)
    setter(newList)
  }

  const updateItem = (setter, list, index, value) => {
    const newList = [...list]
    newList[index] = value
    setter(newList)
  }

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }])
  }

  const updateFaq = (index, field, value) => {
    const newFaqs = [...faqs]
    newFaqs[index][field] = value
    setFaqs(newFaqs)
  }

  const removeFaq = (index) => {
    const newFaqs = [...faqs]
    newFaqs.splice(index, 1)
    setFaqs(newFaqs)
  }

  const removeExistingImage = (index) => {
    const img = existingImages[index]
    setDeletedImageUrls([...deletedImageUrls, img.image_url])
    const newImgs = [...existingImages]
    newImgs.splice(index, 1)
    setExistingImages(newImgs)
  }

  const addNewImageSlot = () => {
    setNewImageSlots([...newImageSlots, Date.now()])
  }

  const removeNewImageSlot = (id) => {
    setNewImageSlots(newImageSlots.filter(slotId => slotId !== id))
    // Clean up preview
    const newPreviews = { ...imagePreviews }
    delete newPreviews[id]
    setImagePreviews(newPreviews)
  }

  const handleImageChange = (e, slotId) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => ({
          ...prev,
          [slotId]: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
        setLogoRemoved(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setLogoRemoved(true)
    setLogoPreview(null)
  }

  const validateForm = (formData) => {
    const errors = {}
    const title = String(formData.get('title') || '').trim()
    const tutor = String(formData.get('tutor_name') || '').trim()
    const slug = String(formData.get('slug') || '').trim()
    const priceValue = String(formData.get('price') || '').trim()
    const price = Number(priceValue)
    const videoUrl = String(formData.get('introduction_video_url') || '').trim()

    if (!title) errors.title = 'Enter the course title.'
    if (!tutor) errors.tutor_name = 'Enter the tutor name.'
    if (!priceValue || !Number.isFinite(price) || price < 0) errors.price = 'Enter a valid course price of zero or more.'
    if (!slug) errors.slug = 'Enter the course URL slug.'
    if (videoUrl && !isYouTubeUrl(videoUrl)) errors.introduction_video_url = 'Enter a valid YouTube video link.'

    const incompleteDetails = detailsItems.some((item) => !String(item.title || '').trim()
      || (item.content_type === 'text' ? !String(item.text || '').trim() : !item.items.some((entry) => String(entry || '').trim())))
    if (incompleteDetails) errors.details = 'Complete the title and information for every Details to Know item.'

    const incompleteExplore = exploreItems.some((item) => !String(item.title || '').trim()
      || (item.content_type === 'text' ? !String(item.text || '').trim() : !item.items.some((entry) => String(entry || '').trim())))
    if (incompleteExplore) errors.explore = 'Complete the title and content for every What You’ll Explore item.'

    const incompleteRecommendation = exploreMore.some((item) =>
      !(item.target_type === 'course' ? item.course_id : item.page_path) || !String(item.description || '').trim() || !String(item.cta_text || '').trim())
    if (incompleteRecommendation) errors.explore_more = 'Choose a destination and complete the description and CTA for every recommendation.'

    const incompleteFaq = faqs.some((faq) => !String(faq.question || '').trim() || !String(faq.answer || '').trim())
    if (incompleteFaq) errors.faqs = 'Complete both the question and answer for every FAQ, or remove the unfinished FAQ.'

    const logoFile = formData.get('logo')
    const logoError = validateFile(logoFile, 'logo')
    if (logoError) errors.logo = logoError

    const certificateFile = formData.get('certificate_template')
    const certificateError = validateFile(certificateFile, 'certificate')
    if (certificateError) errors.certificate_template = certificateError

    const galleryFiles = formData.getAll('gallery_images').filter((file) => file?.size > 0)
    const invalidGallery = galleryFiles.map((file) => validateFile(file, 'gallery')).find(Boolean)
    if (invalidGallery) errors.gallery_images = invalidGallery

    return errors
  }

  const focusFirstError = (errors) => {
    const firstKey = Object.keys(errors)[0]
    if (!firstKey) return
    window.requestAnimationFrame(() => {
      const target = formRef.current?.querySelector(`[name="${firstKey}"], [data-error-key="${firstKey}"]`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus?.({ preventScroll: true })
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSaving) return

    const form = event.currentTarget
    const formData = new FormData(form)
    const errors = validateForm(formData)
    setFieldErrors(errors)
    setSaveNotice(null)

    if (Object.keys(errors).length > 0) {
      setSaveNotice({ type: 'error', message: `Please correct ${Object.keys(errors).length} highlighted ${Object.keys(errors).length === 1 ? 'item' : 'items'}. Everything you entered has been kept.` })
      focusFirstError(errors)
      return
    }

    setIsSaving(true)
    setProgress({ visible: true, stage: 'validate', percent: 5, label: 'Checking course details', detail: 'Your entered information is ready.' })

    const files = []
    const logoFile = formData.get('logo')
    const certificateFile = formData.get('certificate_template')
    const galleryFiles = formData.getAll('gallery_images').filter((file) => file?.size > 0)
    if (logoFile?.size > 0) files.push({ key: 'logo', kind: 'logo', file: logoFile })
    if (certificateFile?.size > 0) files.push({ key: 'certificate', kind: 'certificate', file: certificateFile })
    galleryFiles.forEach((file, index) => files.push({ key: `gallery-${index}`, kind: 'gallery', file }))

    const mode = initialData?.id ? 'edit' : 'create'
    let preparedUploads = []
    let saveStarted = false
    try {
      if (files.length > 0) {
        setProgress({ visible: true, stage: 'upload', percent: 10, label: 'Preparing secure uploads', detail: `${files.length} ${files.length === 1 ? 'file' : 'files'} selected.` })
        const prepared = await prepareCourseAssetUploads(mode, files.map(({ key, kind, file }) => ({
          key,
          kind,
          name: file.name,
          size: file.size,
          type: file.type,
        })))
        if (prepared?.error || !prepared?.uploads) throw new Error(prepared?.error || 'The uploads could not be prepared.')
        preparedUploads = prepared.uploads

        const supabase = createClient()
        const totalBytes = files.reduce((sum, item) => sum + item.file.size, 0)
        let completedBytes = 0
        let completedFiles = 0

        const settledUploads = await Promise.allSettled(files.map(async (item) => {
          const preparedFile = preparedUploads.find((upload) => upload.key === item.key)
          if (!preparedFile) throw new Error(`The ${assetLabel(item.kind)} upload could not be prepared.`)
          const { error } = await supabase.storage
            .from(preparedFile.bucket)
            .uploadToSignedUrl(preparedFile.path, preparedFile.token, item.file, {
              contentType: item.file.type,
              cacheControl: '3600',
            })
          if (error) throw new Error(`The ${assetLabel(item.kind)} could not be uploaded. Please try again.`)
          completedBytes += item.file.size
          completedFiles += 1
          const uploadPercent = totalBytes > 0 ? completedBytes / totalBytes : completedFiles / files.length
          setProgress({
            visible: true,
            stage: 'upload',
            percent: Math.min(82, Math.round(12 + uploadPercent * 70)),
            label: 'Uploading course files',
            detail: `${completedFiles} of ${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded.`,
          })
          return { key: preparedFile.key, kind: preparedFile.kind, bucket: preparedFile.bucket, path: preparedFile.path }
        }))
        const failedUpload = settledUploads.find((result) => result.status === 'rejected')
        if (failedUpload) throw failedUpload.reason
        const results = settledUploads.map((result) => result.value)

        formData.set('uploaded_assets_json', JSON.stringify(results))
      } else {
        formData.set('uploaded_assets_json', '[]')
      }

      // Large files have already gone directly to Storage and must not pass through Vercel.
      formData.delete('logo')
      formData.delete('certificate_template')
      formData.delete('gallery_images')

      setProgress({ visible: true, stage: 'save', percent: 90, label: 'Saving course', detail: 'Writing the course details and connecting its files.' })
      saveStarted = true
      const result = await action(formData)
      if (result?.error) {
        throw new Error(result.error)
      }

      setProgress({ visible: true, stage: 'done', percent: 100, label: 'Course saved', detail: 'Everything was saved successfully.' })
      setSaveNotice({ type: 'success', message: 'Course saved successfully.' })
      setIsSaving(false)
    } catch (error) {
      if (error?.digest?.startsWith?.('NEXT_REDIRECT')) throw error
      // Before the database save begins, cleanup is unambiguous. Once it has
      // begun, the server action owns cleanup so a lost response cannot delete
      // files that may already be attached to a successfully saved course.
      if (!saveStarted && preparedUploads.length > 0) await cleanupCourseAssetUploads(mode, preparedUploads)
      setProgress({ visible: false, stage: 'validate', percent: 0, label: '', detail: '' })
      setSaveNotice({ type: 'error', message: error?.message || 'The course could not be saved. Everything you entered has been kept.' })
      setIsSaving(false)
    }
  }

  const courseLevelOptions = courseLevel && !COURSE_LEVEL_OPTIONS.some((option) => option.value === courseLevel)
    ? [{ value: courseLevel, label: `${courseLevel} (current)` }, ...COURSE_LEVEL_OPTIONS]
    : COURSE_LEVEL_OPTIONS

  return (
    <form ref={formRef} onSubmit={handleSubmit} className={styles.form} noValidate aria-busy={isSaving}>
      <input type="hidden" name="details_to_know_items_json" value={JSON.stringify(detailsItems)} />
      <input type="hidden" name="what_youll_explore_json" value={JSON.stringify(exploreItems)} />
      <input type="hidden" name="explore_more_json" value={JSON.stringify(exploreMore)} />

      <div className={styles.note}>
        Note: Lessons (videos / assessments) are managed separately after creating the course.
      </div>

      {saveNotice && (
        <div className={saveNotice.type === 'success' ? styles.successNotice : styles.errorNotice} role={saveNotice.type === 'error' ? 'alert' : 'status'}>
          {saveNotice.type === 'success' ? <FaCheck /> : <FaExclamationCircle />}
          <span>{saveNotice.message}</span>
        </div>
      )}

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <span>Hero</span>
          <div>
            <h2>Course Hero</h2>
            <p>The first message learners see on the course page.</p>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Course Title</label>
          <input type="text" name="title" defaultValue={initialData.title} required placeholder="e.g. Master ZakTalks" aria-invalid={Boolean(fieldErrors.title)} />
          <FieldError message={fieldErrors.title} />
        </div>
        <div className={styles.formGroup}>
          <label>Promise</label>
          <textarea name="promise" rows="4" defaultValue={initialData.promise ?? initialData.description ?? ''} placeholder="State the main promise of this course..."></textarea>
        </div>
        <div className={styles.formGroup}>
          <label>Short introduction</label>
          <textarea name="short_introduction" rows="3" defaultValue={initialData.short_introduction ?? initialData.subheadline ?? ''} placeholder="Add a concise introduction shown in the hero..."></textarea>
        </div>
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label>Tutor Name</label>
            <input type="text" name="tutor_name" defaultValue={initialData.tutor_name} required placeholder="Zak" aria-invalid={Boolean(fieldErrors.tutor_name)} />
            <FieldError message={fieldErrors.tutor_name} />
          </div>
          <div className={styles.formGroup}>
            <label>Price ($)</label>
            <input type="number" name="price" min="0" step="0.01" defaultValue={(initialData.price_cents || 0) / 100} required placeholder="49.99" aria-invalid={Boolean(fieldErrors.price)} />
            <FieldError message={fieldErrors.price} />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Primary CTA text</label>
          <input type="text" name="primary_cta_text" defaultValue={initialData.primary_cta_text || ''} placeholder="e.g. Enroll now" />
        </div>
      </section>

      <div className={styles.formGroup}>
        <label>URL Slug</label>
        <input type="text" name="slug" defaultValue={initialData.slug} required placeholder="e.g. master-zaktalks" aria-invalid={Boolean(fieldErrors.slug)} />
        <FieldError message={fieldErrors.slug} />
      </div>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <span>Quick facts</span>
          <div>
            <h2>Course Info Bar</h2>
            <p>Use short, clear values for the course summary.</p>
          </div>
        </div>
        <div className={styles.infoBarGrid}>
          <div className={styles.formGroup}><label>Modules</label><input type="text" name="course_info_modules" defaultValue={initialData.course_info_modules || ''} placeholder="e.g. 6 guided modules" /></div>
          <div className={styles.formGroup}>
            <label>Course Level</label>
            <CustomSelect
              name="course_level"
              value={courseLevel}
              onChange={setCourseLevel}
              options={courseLevelOptions}
              placeholder="Select course level"
              ariaLabel="Course level"
            />
          </div>
          <div className={styles.formGroup}><label>Language</label><input type="text" name="course_language" defaultValue={initialData.course_language || ''} placeholder="e.g. English" /></div>
          <div className={styles.formGroup}><label>Flexible Schedule</label><input type="text" name="flexible_schedule" defaultValue={initialData.flexible_schedule || ''} placeholder="e.g. Learn at your pace" /></div>
          <div className={styles.formGroup}><label>Support</label><input type="text" name="course_support" defaultValue={initialData.course_support || ''} placeholder="e.g. Guided support included" /></div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <span>Description</span>
          <div>
            <h2>Course Description</h2>
            <p>The full introduction shown at the beginning of the course content.</p>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Description</label>
          <textarea name="description" rows="5" defaultValue={initialData.description || ''} placeholder="Add the full course description..."></textarea>
        </div>
      </section>

      <div className={styles.formGroup} data-error-key="gallery_images" tabIndex={-1}>
        <label>Course Gallery Images</label>
        <p className={styles.fileHint}>JPG, PNG, WebP, or GIF. Maximum 1 MB per image.</p>
        <FieldError message={fieldErrors.gallery_images} />
        
        {/* Existing Gallery Images */}
        <div className={styles.galleryGrid}>
          {existingImages.map((img, i) => (
            <div key={img.id} className={styles.galleryItem}>
              <img src={img.image_url} alt={`Gallery ${i}`} />
              <button 
                type="button" 
                onClick={() => removeExistingImage(i)} 
                className={styles.removeButton}
              >&times;</button>
              {/* Tell the server which existing images to keep */}
              <input type="hidden" name="keep_image_ids" value={img.id} />
            </div>
          ))}
        </div>

        {/* Track deleted images for storage cleanup */}
        {deletedImageUrls.map((url, i) => (
          <input key={i} type="hidden" name="deleted_image_urls" value={url} />
        ))}

        {/* New Gallery Slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {newImageSlots.map((id) => (
            <div key={id} className={styles.imageSlot}>
              {imagePreviews[id] && (
                <img src={imagePreviews[id]} alt="Preview" className={styles.imagePreview} />
              )}
              <input 
                type="file" 
                name="gallery_images" 
                accept="image/*" 
                className={styles.fileInput}
                style={{ flex: 1 }}
                onChange={(e) => handleImageChange(e, id)}
              />
              <button type="button" onClick={() => removeNewImageSlot(id)} className={styles.deleteSlotButton}>x</button>
            </div>
          ))}
        </div>

        <button type="button" onClick={addNewImageSlot} className={styles.addButton}>+ Add New Gallery Image</button>
      </div>

      {/* Learning outcomes */}
      <div className={`${styles.listSection} ${styles.contentListSection}`}>
        <div className={styles.listHeader}>
          <label>What you&apos;ll learn</label>
          <button type="button" onClick={() => addItem(setLearningOutcomes, learningOutcomes)} className={styles.addButton}>+ Add Item</button>
        </div>
        <div className={styles.listItems}>
          {learningOutcomes.map((item, index) => (
            <div key={index} className={styles.listItem}>
              <input 
                type="text" 
                name="what_youll_learn"
                value={item} 
                onChange={(e) => updateItem(setLearningOutcomes, learningOutcomes, index, e.target.value)}
                placeholder="e.g. Recognize the patterns shaping your choices"
              />
              <button type="button" onClick={() => removeItem(setLearningOutcomes, learningOutcomes, index)} className={styles.deleteSlotButton}>&times;</button>
            </div>
          ))}
          {learningOutcomes.length === 0 && <p className={styles.emptyState}>No learning outcomes added yet.</p>}
        </div>
      </div>

      {/* Skills */}
      <div className={`${styles.listSection} ${styles.contentListSection}`}>
        <div className={styles.listHeader}>
          <label>Skills you&apos;ll gain</label>
          <button type="button" onClick={() => addItem(setSkills, skills)} className={styles.addButton}>+ Add Item</button>
        </div>
        <div className={styles.listItems}>
          {skills.map((item, index) => (
            <div key={index} className={styles.listItem}>
              <input 
                type="text" 
                name="skills_youll_gain"
                value={item} 
                onChange={(e) => updateItem(setSkills, skills, index, e.target.value)}
                placeholder="e.g. Clearer communication"
              />
              <button type="button" onClick={() => removeItem(setSkills, skills, index)} className={styles.deleteSlotButton}>&times;</button>
            </div>
          ))}
          {skills.length === 0 && <p className={styles.emptyState}>No skills added yet.</p>}
        </div>
      </div>

      <StructuredContentEditor
        title="Details to Know"
        description="Add practical details as a paragraph or a list. Each item has its own title."
        titleLabel="Details"
        items={detailsItems}
        setItems={setDetailsItems}
        error={fieldErrors.details}
        errorKey="details"
      />

      <div className={`${styles.formGroup} ${styles.sectionCtaField}`}>
        <label>Details CTA text</label>
        <input type="text" name="details_cta_text" defaultValue={initialData.details_cta_text || ''} placeholder="e.g. Start the course" />
      </div>

      <div className={styles.gridTwo}>
        <div className={`${styles.listSection} ${styles.contentListSection}`}>
          <div className={styles.formGroup}>
            <label>Main title</label>
            <input type="text" name="target_audience_title" defaultValue={initialData.target_audience_title || 'Who this is for'} placeholder="Who this is for" />
          </div>
          <div className={styles.listHeader}>
            <label>Who This Is For (List)</label>
            <button type="button" onClick={() => addItem(setTargetAudience, targetAudience)} className={styles.addButton}>+ Add Item</button>
          </div>
          <div className={styles.listItems}>
            {targetAudience.map((item, index) => (
              <div key={index} className={styles.listItem}>
                <input
                  type="text"
                  name="target_audience"
                  value={item}
                  onChange={(e) => updateItem(setTargetAudience, targetAudience, index, e.target.value)}
                  placeholder="e.g. Professionals ready to improve..."
                />
                <button type="button" onClick={() => removeItem(setTargetAudience, targetAudience, index)} className={styles.deleteSlotButton}>&times;</button>
              </div>
            ))}
            {targetAudience.length === 0 && <p className={styles.emptyState}>No audience items added yet.</p>}
          </div>
        </div>

        <div className={`${styles.listSection} ${styles.contentListSection}`}>
          <div className={styles.formGroup}>
            <label>Main title</label>
            <input type="text" name="who_this_is_not_for_title" defaultValue={initialData.who_this_is_not_for_title || 'Who this is not for'} placeholder="Who this is not for" />
          </div>
          <div className={styles.listHeader}>
            <label className={styles.notForLabel}>Who This Is Not For (List)</label>
            <button type="button" onClick={() => addItem(setNotForAudience, notForAudience)} className={styles.addButton}>+ Add Item</button>
          </div>
          <div className={styles.listItems}>
            {notForAudience.map((item, index) => (
              <div key={index} className={styles.listItem}>
                <input
                  type="text"
                  name="who_this_is_not_for"
                  value={item}
                  onChange={(e) => updateItem(setNotForAudience, notForAudience, index, e.target.value)}
                  placeholder="e.g. Anyone looking for a quick fix..."
                />
                <button type="button" onClick={() => removeItem(setNotForAudience, notForAudience, index)} className={styles.deleteSlotButton}>&times;</button>
              </div>
            ))}
            {notForAudience.length === 0 && <p className={styles.emptyState}>No not-for items added yet.</p>}
          </div>
        </div>
      </div>

      <div className={`${styles.formGroup} ${styles.audienceSupportField}`}>
        <label>Audience supporting text</label>
        <textarea name="audience_supporting_text" rows="3" defaultValue={initialData.audience_supporting_text || ''} placeholder="Add one supporting paragraph beneath both audience lists..." />
      </div>

      <section className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <span>Perspective</span>
          <div>
            <h2>Course Subheadline</h2>
            <p>The emphasized introduction shown after the audience sections.</p>
          </div>
        </div>
        <fieldset className={styles.compositeField}>
          <legend>Course subheadline</legend>
          <p className={styles.compositeHint}>Build the subheadline with an emphasized opening followed by its supporting text.</p>
          <div className={styles.formGroup}>
            <label>Bold part</label>
            <input type="text" name="bold_introduction" defaultValue={initialData.bold_introduction || ''} placeholder="Add the bold opening part" />
          </div>
          <div className={styles.formGroup}>
            <label>Supporting text</label>
            <textarea name="subheadline" rows="3" defaultValue={initialData.subheadline || ''} placeholder="Add the normal supporting text..."></textarea>
          </div>
        </fieldset>
      </section>

      <div className={`${styles.formGroup} ${styles.featuredField}`}>
        <label>Introduction Video (YouTube)</label>
        <input
          type="url"
          name="introduction_video_url"
          maxLength="500"
          defaultValue={initialData.introduction_video_url || ''}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={Boolean(fieldErrors.introduction_video_url)}
        />
        <FieldError message={fieldErrors.introduction_video_url} />
      </div>

      <StructuredContentEditor
        title="What You’ll Explore"
        description="Build ordered topic blocks using either a paragraph or a list."
        items={exploreItems}
        setItems={setExploreItems}
        error={fieldErrors.explore}
        errorKey="explore"
      />

      <div className={styles.formGroup}>
        <label>Meet the Tutor (Description)</label>
        <textarea name="meet_the_tutor" rows="4" defaultValue={initialData.meet_the_tutor} placeholder="Introduce the instructor..."></textarea>
      </div>

      {/* Course FAQs Array */}
      <div className={styles.listSection} data-error-key="faqs" tabIndex={-1}>
        <div className={styles.listHeader}>
          <label>Frequently Asked Questions</label>
          <button type="button" onClick={addFaq} className={styles.addButton}>+ Add FAQ</button>
        </div>
        <div className={styles.listItems}>
          <FieldError message={fieldErrors.faqs} />
          {faqs.map((faq, index) => (
            <div key={index} className={styles.faqItem}>
              <input 
                type="text" 
                name="faq_questions" 
                value={faq.question} 
                onChange={(e) => updateFaq(index, 'question', e.target.value)}
                placeholder="Question"
              />
              <textarea 
                name="faq_answers" 
                value={faq.answer} 
                onChange={(e) => updateFaq(index, 'answer', e.target.value)}
                placeholder="Answer"
                rows="2"
              />
              <button 
                type="button" 
                onClick={() => removeFaq(index)} 
                className={styles.removeButton}
              >&times;</button>
            </div>
          ))}
          {faqs.length === 0 && <p className={styles.emptyState}>No FAQs added yet.</p>}
        </div>
      </div>

      <ExploreMoreEditor items={exploreMore} setItems={setExploreMore} availableCourses={availableCourses} error={fieldErrors.explore_more} />

      <div className={styles.formGroup} data-error-key="logo" tabIndex={-1}>
        <label>Course Logo</label>
        <p className={styles.fileHint}>Optional. JPG, PNG, WebP, or GIF, up to 1 MB.</p>
        <FieldError message={fieldErrors.logo} />
        {(initialData.logo_url && !logoRemoved && !logoPreview) && (
          <div className={styles.currentImage} style={{ position: 'relative', display: 'inline-block' }}>
             <img src={initialData.logo_url} alt="Current logo" />
             <button
               type="button"
               onClick={removeLogo}
               className={styles.removeButton}
             >&times;</button>
          </div>
        )}
        {logoPreview && (
          <div className={styles.currentImage} style={{ position: 'relative', display: 'inline-block' }}>
             <img src={logoPreview} alt="New logo preview" />
             <button
               type="button"
               onClick={removeLogo}
               className={styles.removeButton}
             >&times;</button>
          </div>
        )}
        <input
          type="file"
          name="logo"
          accept="image/*"
          className={styles.fileInput}
          onChange={handleLogoChange}
        />
      </div>

      <div className={styles.formGroup} data-error-key="certificate_template" tabIndex={-1}>
        <label>Certificate Template (PDF)</label>
        <p className={styles.fileHint}>Optional. PDF only, up to 10 MB.</p>
        <FieldError message={fieldErrors.certificate_template} />
        {initialData.certificate_template_url && (
          <div style={{ marginBottom: 'var(--space-sm)', padding: '0.5rem', background: 'var(--color-gray-light)', borderRadius: '0.5rem' }}>
             <a href={initialData.certificate_template_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-black)', fontWeight: 'bold' }}>📄 View Current Template</a>
          </div>
        )}
        <input type="file" name="certificate_template" accept="application/pdf" className={styles.fileInput} />
      </div>

      {/* Toggle Switches */}
      <div className={styles.toggleGroup}>
        <div className={styles.toggleItem}>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" name="is_published" defaultChecked={initialData.is_published} />
            <span className={styles.slider}></span>
          </label>
          <span className={styles.toggleLabel}>Published</span>
        </div>

        <div className={styles.toggleItem}>
          <label className={styles.toggleSwitch}>
            <input type="checkbox" name="money_back_guarantee" defaultChecked={initialData.money_back_guarantee} />
            <span className={styles.slider}></span>
          </label>
          <span className={styles.toggleLabel}>Money Back Guarantee</span>
        </div>
      </div>

      <div className={styles.formActions}>
        <SaveProgress progress={progress} />
        <div className={styles.actionButtons}>
          <SubmitButton buttonText={buttonText} pending={isSaving} />
          <a href="/admin/dashboard?view=courses" className={`${styles.cancelButton} ${isSaving ? styles.cancelButtonDisabled : ''}`} aria-disabled={isSaving}>Cancel</a>
        </div>
      </div>
    </form>
  )
}
