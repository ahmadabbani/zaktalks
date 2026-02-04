'use client'

import { useState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
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

export default function CourseForm({ initialData = {}, action, buttonText = "Save Course" }) {
  const [offers, setOffers] = useState(initialData.course_offers || [])
  const [benefits, setBenefits] = useState(initialData.course_benefits || [])
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
      <div className={styles.note}>
        Note: Lessons (videos / assessments) are managed separately after creating the course.
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label>Course Title</label>
          <input type="text" name="title" defaultValue={initialData.title} required placeholder="e.g. Master ZakTalks" />
        </div>

        <div className={styles.formGroup}>
          <label>URL Slug</label>
          <input type="text" name="slug" defaultValue={initialData.slug} required placeholder="e.g. master-zaktalks" />
        </div>

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
        <label>Description</label>
        <textarea name="description" rows="4" defaultValue={initialData.description} placeholder="Describe what this course is about..."></textarea>
      </div>

      <div className={styles.gridTwo}>
        <div className={styles.formGroup}>
          <label>Target Audience</label>
          <textarea name="target_audience" rows="4" defaultValue={initialData.target_audience} placeholder="Who is this course for?"></textarea>
        </div>

        <div className={styles.formGroup}>
          <label>Why Attend?</label>
          <textarea name="why_attend" rows="4" defaultValue={initialData.why_attend} placeholder="Why should someone take this course?"></textarea>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label>Meet the Tutor (Description)</label>
        <textarea name="meet_the_tutor" rows="4" defaultValue={initialData.meet_the_tutor} placeholder="Introduce the instructor..."></textarea>
      </div>

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

      {/* Course Offers Array */}
      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <label>What this course offers (List)</label>
          <button type="button" onClick={() => addItem(setOffers, offers)} className={styles.addButton}>+ Add Item</button>
        </div>
        <div className={styles.listItems}>
          {offers.map((item, index) => (
            <div key={index} className={styles.listItem}>
              <input 
                type="text" 
                name="course_offers" 
                value={item} 
                onChange={(e) => updateItem(setOffers, offers, index, e.target.value)}
                placeholder="e.g. 24/7 Support"
              />
              <button type="button" onClick={() => removeItem(setOffers, offers, index)} className={styles.deleteSlotButton}>&times;</button>
            </div>
          ))}
          {offers.length === 0 && <p className={styles.emptyState}>No offers added yet.</p>}
        </div>
      </div>

      {/* Course Benefits Array */}
      <div className={styles.listSection}>
        <div className={styles.listHeader}>
          <label>Student Benefits (List)</label>
          <button type="button" onClick={() => addItem(setBenefits, benefits)} className={styles.addButton}>+ Add Item</button>
        </div>
        <div className={styles.listItems}>
          {benefits.map((item, index) => (
            <div key={index} className={styles.listItem}>
              <input 
                type="text" 
                name="course_benefits" 
                value={item} 
                onChange={(e) => updateItem(setBenefits, benefits, index, e.target.value)}
                placeholder="e.g. Career Guidance"
              />
              <button type="button" onClick={() => removeItem(setBenefits, benefits, index)} className={styles.deleteSlotButton}>&times;</button>
            </div>
          ))}
          {benefits.length === 0 && <p className={styles.emptyState}>No benefits added yet.</p>}
        </div>
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
        <a href="/admin/courses" className={styles.cancelButton}>Cancel</a>
      </div>
    </form>
  )
}
