'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { PUBLIC_PAGE_OPTIONS, legacyDetailsToBlocks, normalizeContentBlocks, normalizeExploreMore } from '@/lib/course-content'
import styles from './CourseForm.module.css'

function SubmitButton({ buttonText }) {
  const { pending } = useFormStatus()
  
  return (
    <button 
      type="submit" 
      className={styles.submitButton}
      disabled={pending}
      style={{ opacity: pending ? 0.6 : 1, cursor: pending ? 'not-allowed' : 'pointer' }}
    >
      {pending ? 'Saving...' : buttonText}
    </button>
  )
}

function toList(value) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function emptyContentBlock() {
  return { title: '', content_type: 'text', text: '', items: [] }
}

function StructuredContentEditor({ title, description, items, setItems, titleLabel = 'Title' }) {
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
    <section className={styles.builderSection}>
      <div className={styles.builderHeader}>
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {items.length === 0 && <button type="button" onClick={() => setItems([emptyContentBlock()])} className={styles.addButton}>+ Add Item</button>}
      </div>

      <div className={styles.builderItems}>
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
                <select value={item.content_type} onChange={(event) => updateBlock(index, 'content_type', event.target.value)}>
                  <option value="text">Paragraph</option>
                  <option value="list">List of items</option>
                </select>
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

function ExploreMoreEditor({ items, setItems, availableCourses }) {
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
    <section className={styles.builderSection}>
      <div className={styles.builderHeader}>
        <div>
          <h2>Explore More</h2>
          <p>Connect this course to other courses or public pages. The destination link is saved automatically.</p>
        </div>
        {items.length === 0 && <button type="button" onClick={addItem} className={styles.addButton}>+ Add Recommendation</button>}
      </div>
      <div className={styles.builderItems}>
        {items.map((item, index) => (
          <article className={styles.builderItem} key={index}>
            <div className={styles.builderItemTopline}>
              <strong>Recommendation {index + 1}</strong>
              <button type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} className={styles.removeItemButton}>Remove</button>
            </div>
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label>Destination type</label>
                <select value={item.target_type} onChange={(event) => updateItem(index, 'target_type', event.target.value)}>
                  <option value="course" disabled={availableCourses.length === 0}>Course</option>
                  <option value="page">Website page</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>{item.target_type === 'course' ? 'Course' : 'Website page'}</label>
                {item.target_type === 'course' ? (
                  <select value={item.course_id} onChange={(event) => updateItem(index, 'course_id', event.target.value)} required>
                    <option value="" disabled>Select a course</option>
                    {availableCourses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
                  </select>
                ) : (
                  <select value={item.page_path} onChange={(event) => updateItem(index, 'page_path', event.target.value)} required>
                    {PUBLIC_PAGE_OPTIONS.map((page) => <option value={page.path} key={page.path}>{page.label}</option>)}
                  </select>
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

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="details_to_know_items_json" value={JSON.stringify(detailsItems)} />
      <input type="hidden" name="what_youll_explore_json" value={JSON.stringify(exploreItems)} />
      <input type="hidden" name="explore_more_json" value={JSON.stringify(exploreMore)} />

      <div className={styles.note}>
        Note: Lessons (videos / assessments) are managed separately after creating the course.
      </div>

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
          <input type="text" name="title" defaultValue={initialData.title} required placeholder="e.g. Master ZakTalks" />
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
            <input type="text" name="tutor_name" defaultValue={initialData.tutor_name} required placeholder="Zak" />
          </div>
          <div className={styles.formGroup}>
            <label>Price ($)</label>
            <input type="number" name="price" step="0.01" defaultValue={(initialData.price_cents || 0) / 100} required placeholder="49.99" />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Primary CTA text</label>
          <input type="text" name="primary_cta_text" defaultValue={initialData.primary_cta_text || ''} placeholder="e.g. Enroll now" />
        </div>
      </section>

      <div className={styles.formGroup}>
        <label>URL Slug</label>
        <input type="text" name="slug" defaultValue={initialData.slug} required placeholder="e.g. master-zaktalks" />
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
          <div className={styles.formGroup}><label>Course Level</label><input type="text" name="course_level" defaultValue={initialData.course_level || ''} placeholder="e.g. All levels" /></div>
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

      <div className={`${styles.formGroup} ${styles.featuredField}`}>
        <label>Introduction Video (YouTube)</label>
        <input
          type="url"
          name="introduction_video_url"
          maxLength="500"
          defaultValue={initialData.introduction_video_url || ''}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>

      <div className={styles.formGroup}>
        <label>Course Gallery Images</label>
        
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

      <StructuredContentEditor
        title="What You’ll Explore"
        description="Build ordered topic blocks using either a paragraph or a list."
        items={exploreItems}
        setItems={setExploreItems}
      />

      <div className={styles.formGroup}>
        <label>Meet the Tutor (Description)</label>
        <textarea name="meet_the_tutor" rows="4" defaultValue={initialData.meet_the_tutor} placeholder="Introduce the instructor..."></textarea>
      </div>

      {/* Course FAQs Array */}
      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <label>Frequently Asked Questions</label>
          <button type="button" onClick={addFaq} className={styles.addButton}>+ Add FAQ</button>
        </div>
        <div className={styles.listItems}>
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

      <ExploreMoreEditor items={exploreMore} setItems={setExploreMore} availableCourses={availableCourses} />

      <div className={styles.formGroup}>
        <label>Course Logo</label>
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

      <div className={styles.formGroup}>
        <label>Certificate Template (PDF)</label>
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
        <SubmitButton buttonText={buttonText} />
        <a href="/admin/dashboard?view=courses" className={styles.cancelButton}>Cancel</a>
      </div>
    </form>
  )
}
