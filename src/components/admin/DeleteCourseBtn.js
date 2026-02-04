'use client'

import { useState } from 'react'
import { deleteCourse } from '@/app/admin/courses/actions'
import toast from 'react-hot-toast'
import styles from './DeleteCourseBtn.module.css'

export default function DeleteCourseBtn({ courseId, courseName }) {
  const [showModal, setShowModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    
    const result = await deleteCourse(courseId)
    if (result?.error) {
      toast.error(result.error)
      setIsDeleting(false)
      setShowModal(false)
    }
    // If successful, redirect will happen from the action (which throws)
    // No need for success toast as user will see course removed from list
  }

  return (
    <>
      <button 
        type="button"
        onClick={() => setShowModal(true)}
       className={styles.deleteButton}
       
      >
        Delete Course
      </button>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => !isDeleting && setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete Course?</h2>
            <p className={styles.modalMessage}>
              Are you sure you want to delete <strong>{courseName || 'this course'}</strong>?
            </p>
            <p className={styles.modalWarning}>
              This will permanently delete:
            </p>
            <ul className={styles.deleteList}>
              <li>The course and all its content</li>
              <li>All lessons and assessments</li>
              <li>Course images and certificate template</li>
              <li>All related data</li>
            </ul>
            <p className={styles.modalWarning}>
              <strong>This action cannot be undone!</strong>
            </p>
            
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={styles.cancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className={styles.deleteButton}
                disabled={isDeleting}
                style={{ opacity: isDeleting ? 0.6 : 1, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
