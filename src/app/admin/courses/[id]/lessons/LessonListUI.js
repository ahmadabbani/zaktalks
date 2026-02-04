'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createLesson, deleteLesson, updateLessonOrder, updateLesson } from '../../lessons.actions'
import toast from 'react-hot-toast'
import { FaPlay, FaClipboardList, FaTrash, FaPlus, FaEdit, FaGripVertical } from 'react-icons/fa'
import styles from './admin-lessons.module.css'

export default function LessonListUI({ courseId, initialLessons = [], assessments = [] }) {
  const router = useRouter()
  const [lessons, setLessons] = useState(initialLessons)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLesson, setEditingLesson] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ show: false, lessonId: null, lessonTitle: '' })
  const [isDeleting, setIsDeleting] = useState(false)

  // Sync state with props when initialLessons changes
  useEffect(() => {
    setLessons(initialLessons)
  }, [initialLessons])

  const handleCreate = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.target)
    
    // Set display_order to the end of the list
    formData.set('display_order', lessons.length + 1)

    const result = await createLesson(courseId, formData)
    if (result.success) {
      toast.success('Lesson created successfully')
      setShowAddForm(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to create lesson')
    }
    setIsSaving(false)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData(e.target)
    
    const result = await updateLesson(courseId, editingLesson.id, formData)
    if (result.success) {
      toast.success('Lesson updated successfully')
      setEditingLesson(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update lesson')
    }
    setIsSaving(false)
  }

  const openDeleteModal = (lessonId, lessonTitle) => {
    setDeleteModal({ show: true, lessonId, lessonTitle })
  }

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setDeleteModal({ show: false, lessonId: null, lessonTitle: '' })
    }
  }

  const confirmDelete = async () => {
    setIsDeleting(true)
    
    const result = await deleteLesson(courseId, deleteModal.lessonId)
    if (result.success) {
      toast.success('Lesson deleted')
      setLessons(lessons.filter(l => l.id !== deleteModal.lessonId))
      setDeleteModal({ show: false, lessonId: null, lessonTitle: '' })
    } else {
      toast.error(result.error || 'Failed to delete lesson')
    }
    
    setIsDeleting(false)
  }

  const saveOrder = async () => {
    setIsSaving(true)
    const result = await updateLessonOrder(courseId, lessons.map(l => ({ id: l.id, display_order: l.display_order })))
    if (result.success) {
      toast.success('Order saved successfully')
    } else {
      toast.error(result.error || 'Failed to save order')
    }
    setIsSaving(false)
  }

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newLessons = [...lessons]
    const draggedLesson = newLessons[draggedIndex]
    
    // Remove from old position
    newLessons.splice(draggedIndex, 1)
    // Insert at new position
    newLessons.splice(dropIndex, 0, draggedLesson)
    
    // Update display_order values
    const updated = newLessons.map((l, i) => ({ ...l, display_order: i + 1 }))
    setLessons(updated)
    
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const [lessonType, setLessonType] = useState('video')

  return (
    <div>
      <div className={styles.header}>
        <h2>Course Lessons</h2>
        <div className={styles.headerActions}>
          <button onClick={saveOrder} disabled={isSaving} className={styles.saveOrderButton}>
            {isSaving ? 'Saving...' : 'Save Order'}
          </button>
          <button 
            onClick={() => { setShowAddForm(!showAddForm); setEditingLesson(null); }} 
            className={styles.addButton}
          >
            <FaPlus /> Add Lesson
          </button>
        </div>
      </div>

      {(showAddForm || editingLesson) && (
        <form onSubmit={editingLesson ? handleUpdate : handleCreate} className={styles.formCard}>
          <h3 className={styles.formTitle}>{editingLesson ? 'Edit Lesson' : 'New Lesson'}</h3>
          
          <div className={styles.formSection}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Lesson Title</label>
                <input type="text" name="title" defaultValue={editingLesson?.title} required placeholder="e.g. Introduction to Physics" />
              </div>
              
              <div className={styles.formGroup}>
                <label>Lesson Type</label>
                <select 
                  name="type" 
                  defaultValue={editingLesson?.type || lessonType} 
                  onChange={(e) => setLessonType(e.target.value)}
                >
                  <option value="video">Video (YouTube)</option>
                  <option value="assessment">Assessment</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label>Short Description</label>
              <textarea name="description" rows="2" defaultValue={editingLesson?.description} placeholder="Briefly explain what's in this lesson..."></textarea>
            </div>
          </div>

          <div className={styles.formSection}>
            {(editingLesson?.type || lessonType) === 'video' ? (
              <div className={styles.formGroup}>
                <label>YouTube URL</label>
                <input type="url" name="youtube_url" defaultValue={editingLesson?.youtube_url} required placeholder="https://www.youtube.com/watch?v=..." />
              </div>
            ) : (
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Select Assessment</label>
                  <select name="assessment_key" defaultValue={editingLesson?.assessment_key} required>
                    {assessments.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Passing Score (%)</label>
                  <input type="number" name="passing_score" defaultValue={editingLesson?.passing_score || 70} min="0" max="100" />
                </div>
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            <button type="submit" disabled={isSaving} className={styles.submitButton}>
              {isSaving ? 'Saving...' : (editingLesson ? 'Update Lesson' : 'Create Lesson')}
            </button>
            <button type="button" onClick={() => { setShowAddForm(false); setEditingLesson(null); }} className={styles.cancelButton}>Cancel</button>
          </div>
        </form>
      )}

      {lessons.length === 0 ? (
        <div className={styles.emptyState}>
          <p>This course has no lessons yet. Add your first lesson above!</p>
        </div>
      ) : (
        <div className={styles.lessonList}>
          {lessons.map((lesson, index) => (
            <div 
              key={lesson.id} 
              className={`${styles.lessonItem} ${draggedIndex === index ? styles.dragging : ''} ${dragOverIndex === index ? styles.dragOver : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className={styles.dragHandle}>
                <FaGripVertical />
              </div>

              <div className={styles.lessonIcon}>
                {lesson.type === 'video' ? <FaPlay /> : <FaClipboardList />}
              </div>

              <div className={styles.lessonContent}>
                <div className={styles.lessonTitle}>{lesson.title}</div>
                <div className={styles.lessonMeta}>
                  {lesson.type.toUpperCase()} • {lesson.type === 'video' ? 'Video Lesson' : 'Evaluation'}
                </div>
              </div>

              <div className={styles.lessonActions}>
                <button 
                  onClick={() => { 
                    setEditingLesson(lesson); 
                    setLessonType(lesson.type); 
                    setShowAddForm(false); 
                    window.scrollTo({ top: 0, behavior: 'smooth' }); 
                  }} 
                  className={`${styles.iconButton} ${styles.edit}`}
                  title="Edit lesson"
                >
                  <FaEdit />
                </button>
                <button 
                  onClick={() => openDeleteModal(lesson.id, lesson.title)} 
                  className={`${styles.iconButton} ${styles.delete}`}
                  title="Delete lesson"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className={styles.lessonDeleteModalOverlay} onClick={closeDeleteModal}>
          <div className={styles.lessonDeleteModalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.lessonDeleteModalTitle}>Delete Lesson?</h2>
            <p className={styles.lessonDeleteModalMessage}>
              Are you sure you want to delete <strong>{deleteModal.lessonTitle}</strong> ?
            </p>
            <p className={styles.lessonDeleteModalWarning}>
              <strong>This action cannot be undone!</strong>
            </p>
            
            <div className={styles.lessonDeleteModalActions}>
              <button
                type="button"
                onClick={closeDeleteModal}
                className={styles.lessonDeleteCancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className={styles.lessonDeleteConfirmButton}
                disabled={isDeleting}
                style={{ opacity: isDeleting ? 0.6 : 1, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
