'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createLesson,
  createModule,
  deleteLesson,
  deleteModule,
  updateCourseStructure,
  updateLesson,
  updateModule
} from '../../lessons.actions'
import toast from 'react-hot-toast'
import {
  FaChevronDown,
  FaChevronUp,
  FaClipboardList,
  FaEdit,
  FaFileAlt,
  FaFilePdf,
  FaFolderOpen,
  FaLayerGroup,
  FaLink,
  FaPlay,
  FaPlus,
  FaSave,
  FaTrash
} from 'react-icons/fa'
import styles from './admin-lessons.module.css'

function normalizeModules(modules) {
  return [...modules]
    .sort((a, b) => a.display_order - b.display_order)
    .map((module, moduleIndex) => ({
      ...module,
      display_order: moduleIndex + 1,
      lessons: [...(module.lessons || [])]
        .sort((a, b) => a.display_order - b.display_order)
        .map((lesson, lessonIndex) => ({ ...lesson, display_order: lessonIndex + 1 }))
    }))
}

export default function LessonListUI({ courseId, initialModules = [], assessments = [] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createdToastShown = useRef(false)
  const [modules, setModules] = useState(() => normalizeModules(initialModules))
  const [moduleForm, setModuleForm] = useState(null)
  const [lessonForm, setLessonForm] = useState(null)
  const [lessonType, setLessonType] = useState('video')
  const [resourceType, setResourceType] = useState('none')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteModal, setDeleteModal] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setModules(normalizeModules(initialModules))
  }, [initialModules])

  useEffect(() => {
    if (searchParams.get('created') !== 'true' || createdToastShown.current) return
    createdToastShown.current = true
    toast.success('Course created successfully')
    window.history.replaceState({}, '', `/admin/courses/${courseId}/lessons`)
  }, [courseId, searchParams])

  const nextModuleTitle = `Module ${String(modules.length + 1).padStart(2, '0')}`

  const openNewModuleForm = () => {
    setLessonForm(null)
    setModuleForm({ mode: 'create', module: null })
  }

  const openEditModuleForm = (module) => {
    setLessonForm(null)
    setModuleForm({ mode: 'edit', module })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNewLessonForm = (moduleId) => {
    setModuleForm(null)
    setLessonType('video')
    setResourceType('none')
    setLessonForm({ mode: 'create', moduleId, lesson: null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEditLessonForm = (lesson) => {
    setModuleForm(null)
    setLessonType(lesson.type)
    setResourceType(lesson.additional_resource?.resource_type || 'none')
    setLessonForm({ mode: 'edit', moduleId: lesson.module_id, lesson })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleModuleSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const formData = new FormData(event.currentTarget)
    const result = moduleForm.mode === 'edit'
      ? await updateModule(courseId, moduleForm.module.id, formData)
      : await createModule(courseId, formData)

    if (result.success) {
      toast.success(moduleForm.mode === 'edit' ? 'Module updated' : 'Module created')
      setModuleForm(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Could not save module')
    }
    setIsSaving(false)
  }

  const handleLessonSubmit = async (event) => {
    event.preventDefault()
    setIsSaving(true)
    const formData = new FormData(event.currentTarget)
    const result = lessonForm.mode === 'edit'
      ? await updateLesson(courseId, lessonForm.lesson.id, formData)
      : await createLesson(courseId, formData)

    if (result.success) {
      toast.success(lessonForm.mode === 'edit' ? 'Lesson updated' : 'Lesson created')
      setLessonForm(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Could not save lesson')
    }
    setIsSaving(false)
  }

  const moveModule = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= modules.length) return
    const reordered = [...modules]
    const [module] = reordered.splice(index, 1)
    reordered.splice(nextIndex, 0, module)
    setModules(normalizeModules(reordered))
  }

  const moveLesson = (moduleId, index, direction) => {
    setModules((current) => current.map((module) => {
      if (module.id !== moduleId) return module
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= module.lessons.length) return module
      const lessons = [...module.lessons]
      const [lesson] = lessons.splice(index, 1)
      lessons.splice(nextIndex, 0, lesson)
      return {
        ...module,
        lessons: lessons.map((item, lessonIndex) => ({ ...item, display_order: lessonIndex + 1 }))
      }
    }))
  }

  const saveStructure = async () => {
    setIsSaving(true)
    const result = await updateCourseStructure(courseId, modules)
    if (result.success) {
      toast.success('Module and lesson order saved')
      router.refresh()
    } else {
      toast.error(result.error || 'Could not save course structure')
    }
    setIsSaving(false)
  }

  const confirmDelete = async () => {
    if (!deleteModal) return
    setIsDeleting(true)
    const result = deleteModal.type === 'module'
      ? await deleteModule(courseId, deleteModal.id)
      : await deleteLesson(courseId, deleteModal.id)

    if (result.success) {
      toast.success(deleteModal.type === 'module' ? 'Module deleted' : 'Lesson deleted')
      if (deleteModal.type === 'module') {
        setModules((current) => normalizeModules(current.filter((module) => module.id !== deleteModal.id)))
      } else {
        setModules((current) => current.map((module) => ({
          ...module,
          lessons: module.lessons.filter((lesson) => lesson.id !== deleteModal.id)
        })))
      }
      setDeleteModal(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Could not delete item')
    }
    setIsDeleting(false)
  }

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h2>Course Structure</h2>
          <p className={styles.headerDescription}>Create modules first, then organize lessons and assessments inside them.</p>
        </div>
        <div className={styles.headerActions}>
          {modules.length > 0 && (
            <button type="button" onClick={saveStructure} disabled={isSaving} className={styles.saveOrderButton}>
              <FaSave /> {isSaving ? 'Saving...' : 'Save Order'}
            </button>
          )}
          <button type="button" onClick={openNewModuleForm} className={styles.addButton}>
            <FaPlus /> Add Module
          </button>
        </div>
      </div>

      {moduleForm && (
        <form key={`${moduleForm.mode}-${moduleForm.module?.id || 'new'}`} onSubmit={handleModuleSubmit} className={styles.formCard}>
          <div className={styles.formHeadingRow}>
            <FaLayerGroup />
            <h3 className={styles.formTitle}>{moduleForm.mode === 'edit' ? 'Edit Module' : 'New Module'}</h3>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="module-title">Module Title</label>
              <input
                id="module-title"
                type="text"
                name="title"
                maxLength="120"
                defaultValue={moduleForm.module?.title || nextModuleTitle}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="module-description">Short Description <span>(optional)</span></label>
              <input
                id="module-description"
                type="text"
                name="description"
                maxLength="500"
                defaultValue={moduleForm.module?.description || ''}
                placeholder="What this module covers"
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={isSaving} className={styles.submitButton}>
              {isSaving ? 'Saving...' : moduleForm.mode === 'edit' ? 'Update Module' : 'Create Module'}
            </button>
            <button type="button" onClick={() => setModuleForm(null)} className={styles.cancelButton}>Cancel</button>
          </div>
        </form>
      )}

      {lessonForm && (
        <form key={`${lessonForm.mode}-${lessonForm.lesson?.id || lessonForm.moduleId}`} onSubmit={handleLessonSubmit} className={styles.formCard}>
          <div className={styles.formHeadingRow}>
            <FaFolderOpen />
            <h3 className={styles.formTitle}>{lessonForm.mode === 'edit' ? 'Edit Lesson' : 'New Lesson'}</h3>
          </div>
          <div className={styles.formSection}>
            <div className={styles.formGridThree}>
              <div className={styles.formGroup}>
                <label htmlFor="lesson-title">Lesson Title</label>
                <input id="lesson-title" type="text" name="title" maxLength="200" defaultValue={lessonForm.lesson?.title || ''} required />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lesson-module">Module</label>
                <select id="lesson-module" name="module_id" defaultValue={lessonForm.lesson?.module_id || lessonForm.moduleId} required>
                  {modules.map((module, index) => (
                    <option key={module.id} value={module.id}>{String(index + 1).padStart(2, '0')} · {module.title}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lesson-type">Lesson Type</label>
                <select id="lesson-type" name="type" value={lessonType} onChange={(event) => setLessonType(event.target.value)}>
                  <option value="video">Video (YouTube)</option>
                  <option value="assessment">Assessment</option>
                </select>
              </div>
            </div>
          </div>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label htmlFor="lesson-description">Short Description</label>
              <textarea id="lesson-description" name="description" maxLength="2000" rows="2" defaultValue={lessonForm.lesson?.description || ''} />
            </div>
          </div>
          <div className={styles.formSection}>
            {lessonType === 'video' ? (
              <div className={styles.formGroup}>
                <label htmlFor="youtube-url">YouTube URL</label>
                <input id="youtube-url" type="url" name="youtube_url" defaultValue={lessonForm.lesson?.youtube_url || ''} required />
              </div>
            ) : (
              <div className={styles.formGroup}>
                <label htmlFor="assessment-key">Select Assessment</label>
                <select id="assessment-key" name="assessment_key" defaultValue={lessonForm.lesson?.assessment_key || assessments[0]?.id} required>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>{assessment.title}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className={`${styles.formSection} ${styles.resourceSection}`}>
            <div className={styles.resourceHeading}>
              <div>
                <h4>Additional resource</h4>
                <p>Optionally attach one text note, PDF, or external link to this lesson.</p>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="resource-type">Resource Type</label>
              <select id="resource-type" name="resource_type" value={resourceType} onChange={(event) => setResourceType(event.target.value)}>
                <option value="none">No additional resource</option>
                <option value="text">Text</option>
                <option value="pdf">PDF upload</option>
                <option value="link">External link</option>
              </select>
            </div>

            {resourceType === 'text' && (
              <div className={styles.formGroup}>
                <label htmlFor="resource-text">Resource Text</label>
                <textarea
                  id="resource-text"
                  name="resource_text"
                  rows="5"
                  maxLength="20000"
                  defaultValue={lessonForm.lesson?.additional_resource?.text_content || ''}
                  placeholder="Add the supporting text for this lesson..."
                  required
                />
              </div>
            )}

            {resourceType === 'link' && (
              <div className={styles.formGroup}>
                <label htmlFor="resource-url">Resource Link</label>
                <input
                  id="resource-url"
                  name="resource_url"
                  type="url"
                  maxLength="2000"
                  defaultValue={lessonForm.lesson?.additional_resource?.external_url || ''}
                  placeholder="https://example.com/resource"
                  required
                />
              </div>
            )}

            {resourceType === 'pdf' && (
              <div className={styles.formGroup}>
                <label htmlFor="resource-pdf">Resource PDF <span>(10 MB maximum)</span></label>
                {lessonForm.lesson?.additional_resource?.resource_type === 'pdf' && (
                  <div className={styles.currentResourceFile}>
                    <FaFilePdf />
                    <span>{lessonForm.lesson.additional_resource.original_file_name}</span>
                    <small>Choose another PDF only if you want to replace it.</small>
                  </div>
                )}
                <input
                  id="resource-pdf"
                  name="resource_pdf"
                  type="file"
                  accept="application/pdf,.pdf"
                  required={lessonForm.lesson?.additional_resource?.resource_type !== 'pdf'}
                />
              </div>
            )}
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={isSaving} className={styles.submitButton}>
              {isSaving ? 'Saving...' : lessonForm.mode === 'edit' ? 'Update Lesson' : 'Create Lesson'}
            </button>
            <button type="button" onClick={() => setLessonForm(null)} className={styles.cancelButton}>Cancel</button>
          </div>
        </form>
      )}

      {modules.length === 0 ? (
        <div className={styles.emptyState}>
          <FaLayerGroup />
          <h3>Start with your first module</h3>
          <p>Lessons and assessments can only be created inside a module.</p>
          <button type="button" onClick={openNewModuleForm} className={styles.addButton}><FaPlus /> Create Module 01</button>
        </div>
      ) : (
        <div className={styles.moduleList}>
          {modules.map((module, moduleIndex) => (
            <section key={module.id} className={styles.moduleCard}>
              <div className={styles.moduleHeader}>
                <div className={styles.moduleIdentity}>
                  <span className={styles.moduleNumber}>MODULE {String(moduleIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{module.title}</h3>
                    {module.description && <p>{module.description}</p>}
                  </div>
                </div>
                <div className={styles.moduleActions}>
                  <span className={styles.lessonCount}>{module.lessons.length} {module.lessons.length === 1 ? 'lesson' : 'lessons'}</span>
                  <button type="button" className={styles.iconButton} onClick={() => moveModule(moduleIndex, -1)} disabled={moduleIndex === 0} title="Move module up"><FaChevronUp /></button>
                  <button type="button" className={styles.iconButton} onClick={() => moveModule(moduleIndex, 1)} disabled={moduleIndex === modules.length - 1} title="Move module down"><FaChevronDown /></button>
                  <button type="button" className={`${styles.iconButton} ${styles.edit}`} onClick={() => openEditModuleForm(module)} title="Edit module"><FaEdit /></button>
                  <button type="button" className={`${styles.iconButton} ${styles.delete}`} onClick={() => setDeleteModal({ type: 'module', id: module.id, title: module.title, lessonCount: module.lessons.length })} title="Delete module"><FaTrash /></button>
                  <button type="button" className={styles.moduleAddButton} onClick={() => openNewLessonForm(module.id)}><FaPlus /> Add Lesson</button>
                </div>
              </div>

              {module.lessons.length === 0 ? (
                <button type="button" className={styles.moduleEmpty} onClick={() => openNewLessonForm(module.id)}>
                  <FaPlus /> Add the first lesson or assessment to this module
                </button>
              ) : (
                <div className={styles.lessonList}>
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={lesson.id} className={styles.lessonItem}>
                      <div className={styles.lessonOrderActions}>
                        <button type="button" onClick={() => moveLesson(module.id, lessonIndex, -1)} disabled={lessonIndex === 0} aria-label={`Move ${lesson.title} up`}><FaChevronUp /></button>
                        <span>{String(lessonIndex + 1).padStart(2, '0')}</span>
                        <button type="button" onClick={() => moveLesson(module.id, lessonIndex, 1)} disabled={lessonIndex === module.lessons.length - 1} aria-label={`Move ${lesson.title} down`}><FaChevronDown /></button>
                      </div>
                      <div className={styles.lessonIcon}>{lesson.type === 'video' ? <FaPlay /> : <FaClipboardList />}</div>
                      <div className={styles.lessonContent}>
                        <div className={styles.lessonTitle}>{lesson.title}</div>
                        <div className={styles.lessonMeta}>
                          <span>{lesson.type === 'video' ? 'VIDEO LESSON' : 'ASSESSMENT'}</span>
                          {lesson.additional_resource && (
                            <span className={styles.resourceBadge}>
                              {lesson.additional_resource.resource_type === 'pdf' && <FaFilePdf />}
                              {lesson.additional_resource.resource_type === 'link' && <FaLink />}
                              {lesson.additional_resource.resource_type === 'text' && <FaFileAlt />}
                              {lesson.additional_resource.resource_type} resource
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.lessonActions}>
                        <button type="button" onClick={() => openEditLessonForm(lesson)} className={`${styles.iconButton} ${styles.edit}`} title="Edit or move lesson"><FaEdit /></button>
                        <button type="button" onClick={() => setDeleteModal({ type: 'lesson', id: lesson.id, title: lesson.title })} className={`${styles.iconButton} ${styles.delete}`} title="Delete lesson"><FaTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {deleteModal && (
        <div className={styles.lessonDeleteModalOverlay} onClick={() => !isDeleting && setDeleteModal(null)}>
          <div className={styles.lessonDeleteModalContent} onClick={(event) => event.stopPropagation()}>
            <h2 className={styles.lessonDeleteModalTitle}>Delete {deleteModal.type === 'module' ? 'Module' : 'Lesson'}?</h2>
            <p className={styles.lessonDeleteModalMessage}>You are about to delete <strong>{deleteModal.title}</strong>.</p>
            {deleteModal.type === 'module' && deleteModal.lessonCount > 0 ? (
              <p className={styles.lessonDeleteModalWarning}>This module still contains lessons. Move or delete them first.</p>
            ) : (
              <p className={styles.lessonDeleteModalWarning}>This action cannot be undone.</p>
            )}
            <div className={styles.lessonDeleteModalActions}>
              <button type="button" onClick={() => setDeleteModal(null)} className={styles.lessonDeleteCancelButton} disabled={isDeleting}>Cancel</button>
              <button
                type="button"
                onClick={confirmDelete}
                className={styles.lessonDeleteConfirmButton}
                disabled={isDeleting || (deleteModal.type === 'module' && deleteModal.lessonCount > 0)}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
