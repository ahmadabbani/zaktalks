'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createCourseIntroduction,
  createLesson,
  createModule,
  deleteCourseIntroduction,
  deleteLesson,
  deleteModule,
  updateCourseIntroduction,
  updateCourseLessonNumbering,
  updateCourseStructure,
  updateLesson,
  updateModule
} from '../../lessons.actions'
import toast from 'react-hot-toast'
import RichTextEditor from '@/components/admin/RichTextEditor'
import { createRichText, richTextForPlain } from '@/lib/rich-text'
import { getLessonDisplayNumber, normalizeLessonNumberingStyle } from '@/lib/lesson-numbering'
import { ASSESSMENT_TIME_OPTIONS } from '@/lib/assessment-lesson-metadata'
import {
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaClipboardList,
  FaEdit,
  FaFileAlt,
  FaFilePdf,
  FaFolderOpen,
  FaLayerGroup,
  FaLink,
  FaListOl,
  FaPlay,
  FaPlus,
  FaSave,
  FaTrash,
  FaVideo
} from 'react-icons/fa'
import styles from './admin-lessons.module.css'

function CustomSelect({ id, name, value, defaultValue = '', onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const rootRef = useRef(null)
  const menuId = useId()
  const currentValue = value === undefined ? internalValue : value
  const selected = options.find((option) => option.value === currentValue)

  useEffect(() => {
    if (!open) return undefined
    const closeMenu = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeMenu)
    return () => document.removeEventListener('pointerdown', closeMenu)
  }, [open])

  const choose = (nextValue) => {
    if (value === undefined) setInternalValue(nextValue)
    onChange?.(nextValue)
    setOpen(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false)
      return
    }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || options.length === 0) return
    event.preventDefault()
    const currentIndex = options.findIndex((option) => option.value === currentValue)
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : options.length - 1)
      : (currentIndex + direction + options.length) % options.length
    choose(options[nextIndex].value)
    setOpen(true)
  }

  return (
    <div className={styles.customSelect} ref={rootRef} onKeyDown={handleKeyDown}>
      <input type="hidden" name={name} value={currentValue || ''} />
      <button
        id={id}
        type="button"
        className={`${styles.customSelectTrigger} ${open ? styles.customSelectTriggerOpen : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label || 'Select an option'}</span>
        <FaChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className={styles.customSelectMenu} id={menuId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === currentValue}
              className={option.value === currentValue ? styles.customSelectOptionSelected : ''}
              onClick={() => choose(option.value)}
              key={option.value}
            >
              <span>{option.label}</span>
              {option.value === currentValue && <FaCheck aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function SaveProgress({ label }) {
  return (
    <div className={styles.saveProgress} role="status" aria-live="polite">
      <div className={styles.saveProgressCopy}>
        <strong>{label}</strong>
        <span>Please keep this page open.</span>
      </div>
      <div className={styles.saveProgressTrack} aria-hidden="true"><span /></div>
    </div>
  )
}

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

export default function LessonListUI({ courseId, initialNumberingStyle = 'module', initialIntroductionLesson = null, initialModules = [], assessments = [] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const createdToastShown = useRef(false)
  const [modules, setModules] = useState(() => normalizeModules(initialModules))
  const [numberingStyle, setNumberingStyle] = useState(() => normalizeLessonNumberingStyle(initialNumberingStyle))
  const [introductionForm, setIntroductionForm] = useState(null)
  const [moduleForm, setModuleForm] = useState(null)
  const [lessonForm, setLessonForm] = useState(null)
  const [lessonType, setLessonType] = useState('video')
  const [assessmentKey, setAssessmentKey] = useState(() => assessments[0]?.id || '')
  const [resourceType, setResourceType] = useState('none')
  const [moduleDescriptionRich, setModuleDescriptionRich] = useState(() => createRichText())
  const [lessonDescriptionRich, setLessonDescriptionRich] = useState(() => createRichText())
  const [lessonInstructionsRich, setLessonInstructionsRich] = useState(() => createRichText())
  const [resourceTextRich, setResourceTextRich] = useState(() => createRichText())
  const [introductionDescriptionRich, setIntroductionDescriptionRich] = useState(() => createRichText())
  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState('Saving changes')
  const [saveTarget, setSaveTarget] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    setModules(normalizeModules(initialModules))
  }, [initialModules])

  useEffect(() => {
    setNumberingStyle(normalizeLessonNumberingStyle(initialNumberingStyle))
  }, [initialNumberingStyle])

  useEffect(() => {
    if (searchParams.get('created') !== 'true' || createdToastShown.current) return
    createdToastShown.current = true
    toast.success('Course created successfully')
    window.history.replaceState({}, '', `/admin/courses/${courseId}/lessons`)
  }, [courseId, searchParams])

  const nextModuleTitle = `Module ${String(modules.length + 1).padStart(2, '0')}`
  const selectedAssessment = assessments.find((assessment) => assessment.id === assessmentKey)
  const selectedAssessmentQuestionCount = Number(selectedAssessment?.questionCount) || 0

  const openNewModuleForm = () => {
    setIntroductionForm(null)
    setLessonForm(null)
    setModuleDescriptionRich(createRichText())
    setModuleForm({ mode: 'create', module: null })
  }

  const openEditModuleForm = (module) => {
    setIntroductionForm(null)
    setLessonForm(null)
    setModuleDescriptionRich(richTextForPlain(module.rich_content?.description, module.description || '', 500))
    setModuleForm({ mode: 'edit', module })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openNewLessonForm = (moduleId) => {
    setIntroductionForm(null)
    setModuleForm(null)
    setLessonType('video')
    setAssessmentKey(assessments[0]?.id || '')
    setResourceType('none')
    setLessonDescriptionRich(createRichText())
    setLessonInstructionsRich(createRichText())
    setResourceTextRich(createRichText())
    setLessonForm({ mode: 'create', moduleId, lesson: null })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openEditLessonForm = (lesson) => {
    setIntroductionForm(null)
    setModuleForm(null)
    setLessonType(lesson.type)
    setAssessmentKey(lesson.assessment_key || assessments[0]?.id || '')
    setResourceType(lesson.additional_resource?.resource_type || 'none')
    setLessonDescriptionRich(richTextForPlain(lesson.rich_content?.description, lesson.description || '', 2000))
    setLessonInstructionsRich(richTextForPlain(lesson.rich_content?.instructions, lesson.instructions || '', 5000))
    setResourceTextRich(richTextForPlain(
      lesson.additional_resource?.rich_content?.description,
      lesson.additional_resource?.text_content || '',
      20000
    ))
    setLessonForm({ mode: 'edit', moduleId: lesson.module_id, lesson })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openIntroductionForm = () => {
    setModuleForm(null)
    setLessonForm(null)
    setIntroductionDescriptionRich(richTextForPlain(
      initialIntroductionLesson?.rich_content?.description,
      initialIntroductionLesson?.description || '',
      2000
    ))
    setIntroductionForm({ mode: initialIntroductionLesson ? 'edit' : 'create' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleIntroductionSubmit = async (event) => {
    event.preventDefault()
    setSaveLabel(introductionForm.mode === 'edit' ? 'Updating introduction' : 'Creating introduction')
    setSaveTarget('introduction')
    setIsSaving(true)
    const formData = new FormData(event.currentTarget)
    const result = introductionForm.mode === 'edit'
      ? await updateCourseIntroduction(courseId, initialIntroductionLesson.id, formData)
      : await createCourseIntroduction(courseId, formData)

    if (result.success) {
      toast.success(introductionForm.mode === 'edit' ? 'Course introduction updated' : 'Course introduction created')
      setIntroductionForm(null)
      router.refresh()
    } else {
      toast.error(result.error || 'Could not save the course introduction')
    }
    setIsSaving(false)
    setSaveTarget(null)
  }

  const handleModuleSubmit = async (event) => {
    event.preventDefault()
    setSaveLabel(moduleForm.mode === 'edit' ? 'Updating module' : 'Creating module')
    setSaveTarget('module')
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
    setSaveTarget(null)
  }

  const handleLessonSubmit = async (event) => {
    event.preventDefault()
    setSaveLabel(lessonForm.mode === 'edit' ? 'Updating lesson' : 'Creating lesson')
    setSaveTarget('lesson')
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
    setSaveTarget(null)
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
    setSaveLabel('Saving course order')
    setSaveTarget('order')
    setIsSaving(true)
    const result = await updateCourseStructure(courseId, modules)
    if (result.success) {
      toast.success('Module and lesson order saved')
      router.refresh()
    } else {
      toast.error(result.error || 'Could not save course structure')
    }
    setIsSaving(false)
    setSaveTarget(null)
  }

  const saveNumberingStyle = async () => {
    setSaveLabel('Saving lesson numbering')
    setSaveTarget('numbering')
    setIsSaving(true)
    const result = await updateCourseLessonNumbering(courseId, numberingStyle)

    if (result.success) {
      toast.success('Lesson numbering updated')
      router.refresh()
    } else {
      toast.error(result.error || 'Could not update lesson numbering')
    }

    setIsSaving(false)
    setSaveTarget(null)
  }

  const confirmDelete = async () => {
    if (!deleteModal) return
    setIsDeleting(true)
    const result = deleteModal.type === 'module'
      ? await deleteModule(courseId, deleteModal.id)
      : deleteModal.type === 'introduction'
        ? await deleteCourseIntroduction(courseId, deleteModal.id)
        : await deleteLesson(courseId, deleteModal.id)

    if (result.success) {
      toast.success(deleteModal.type === 'module'
        ? 'Module deleted'
        : deleteModal.type === 'introduction'
          ? 'Course introduction removed'
          : 'Lesson deleted')
      if (deleteModal.type === 'module') {
        setModules((current) => normalizeModules(current.filter((module) => module.id !== deleteModal.id)))
      } else if (deleteModal.type === 'lesson') {
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
              <FaSave /> {isSaving && saveTarget === 'order' ? 'Saving...' : 'Save Order'}
            </button>
          )}
          <button type="button" onClick={openNewModuleForm} className={styles.addButton}>
            <FaPlus /> Add Module
          </button>
        </div>
      </div>

      {isSaving && saveTarget === 'order' && <SaveProgress label={saveLabel} />}

      <section className={styles.numberingCard}>
        <span className={styles.numberingIcon}><FaListOl /></span>
        <div className={styles.numberingCopy}>
          <span>Lesson numbering</span>
          <h3>Choose how lesson numbers appear</h3>
        </div>
        <div className={styles.numberingControl}>
          <CustomSelect
            id="lesson-numbering-style"
            name="lesson_numbering_style"
            value={numberingStyle}
            onChange={setNumberingStyle}
            options={[
              { value: 'module', label: 'Number by module (1.1, 1.2, 2.1)' },
              { value: 'none', label: 'No automatic numbering' },
            ]}
            ariaLabel="Lesson numbering style"
          />
          <button
            type="button"
            className={styles.numberingSaveButton}
            onClick={saveNumberingStyle}
            disabled={isSaving}
          >
            {isSaving && saveTarget === 'numbering' ? 'Saving...' : 'Save preference'}
          </button>
        </div>
        {isSaving && saveTarget === 'numbering' && <SaveProgress label={saveLabel} />}
      </section>

      <section className={`${styles.introductionCard} ${initialIntroductionLesson ? styles.introductionCardReady : ''}`}>
        <div className={styles.introductionIcon}><FaVideo /></div>
        <div className={styles.introductionCopy}>
          <div className={styles.introductionEyebrow}>
            <span>Optional</span>
          </div>
          <h3>{initialIntroductionLesson?.title || 'Course Introduction Video'}</h3>
          {initialIntroductionLesson ? (
            <>
              <p>{initialIntroductionLesson.description || 'The opening video for this course.'}</p>
              <div className={styles.introductionStatus}><FaCheck /> Added to the learning journey</div>
            </>
          ) : (
            <p>Add an optional opening video for learners.</p>
          )}
        </div>
        <div className={styles.introductionActions}>
          {initialIntroductionLesson ? (
            <>
              <button type="button" className={styles.introductionPrimaryButton} onClick={openIntroductionForm}><FaEdit /> Edit</button>
              <button
                type="button"
                className={styles.introductionDeleteButton}
                onClick={() => setDeleteModal({ type: 'introduction', id: initialIntroductionLesson.id, title: initialIntroductionLesson.title })}
                title="Remove course introduction"
                aria-label="Remove course introduction"
              ><FaTrash /></button>
            </>
          ) : (
            <button type="button" className={styles.introductionPrimaryButton} onClick={openIntroductionForm}><FaPlus /> Add introduction</button>
          )}
        </div>
      </section>

      {introductionForm && (
        <form key={`introduction-${introductionForm.mode}`} onSubmit={handleIntroductionSubmit} className={`${styles.formCard} ${styles.introductionForm}`}>
          <input type="hidden" name="rich_content_json" value={JSON.stringify({ version: 1, description: introductionDescriptionRich })} />
          <div className={styles.formHeadingRow}>
            <FaVideo />
            <div>
              <h3 className={styles.formTitle}>{introductionForm.mode === 'edit' ? 'Edit Course Introduction Video' : 'Add Course Introduction Video'}</h3>
              <p className={styles.formIntro}>Learners complete this video before continuing to the course.</p>
            </div>
          </div>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label htmlFor="introduction-title">Introduction Title</label>
              <input
                id="introduction-title"
                type="text"
                name="title"
                maxLength="200"
                defaultValue={initialIntroductionLesson?.title || 'Course Introduction'}
                required
              />
            </div>
          </div>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label htmlFor="introduction-description">Short Description <span>(optional)</span></label>
              <RichTextEditor
                id="introduction-description"
                name="description"
                value={introductionDescriptionRich}
                onChange={setIntroductionDescriptionRich}
                ariaLabel="Course introduction short description"
                maxLength={2000}
                placeholder="Explain what learners will begin with..."
              />
            </div>
          </div>
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label htmlFor="introduction-youtube-url">YouTube URL</label>
              <input
                id="introduction-youtube-url"
                type="url"
                name="youtube_url"
                maxLength="1000"
                defaultValue={initialIntroductionLesson?.youtube_url || ''}
                placeholder="https://www.youtube.com/watch?v=..."
                required
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={isSaving} className={styles.submitButton}>
              {isSaving && saveTarget === 'introduction' ? 'Saving...' : introductionForm.mode === 'edit' ? 'Update Introduction' : 'Add Introduction'}
            </button>
            <button type="button" onClick={() => setIntroductionForm(null)} className={styles.cancelButton}>Cancel</button>
          </div>
          {isSaving && saveTarget === 'introduction' && <SaveProgress label={saveLabel} />}
        </form>
      )}

      {moduleForm && (
        <form key={`${moduleForm.mode}-${moduleForm.module?.id || 'new'}`} onSubmit={handleModuleSubmit} className={styles.formCard}>
          <input type="hidden" name="rich_content_json" value={JSON.stringify({ version: 1, description: moduleDescriptionRich })} />
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
              <RichTextEditor
                id="module-description"
                name="description"
                value={moduleDescriptionRich}
                onChange={setModuleDescriptionRich}
                ariaLabel="Module short description"
                singleLine
                maxLength={500}
                placeholder="What this module covers"
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={isSaving} className={styles.submitButton}>
              {isSaving && saveTarget === 'module' ? 'Saving...' : moduleForm.mode === 'edit' ? 'Update Module' : 'Create Module'}
            </button>
            <button type="button" onClick={() => setModuleForm(null)} className={styles.cancelButton}>Cancel</button>
          </div>
          {isSaving && saveTarget === 'module' && <SaveProgress label={saveLabel} />}
        </form>
      )}

      {lessonForm && (
        <form key={`${lessonForm.mode}-${lessonForm.lesson?.id || lessonForm.moduleId}`} onSubmit={handleLessonSubmit} className={styles.formCard}>
          <input type="hidden" name="rich_content_json" value={JSON.stringify({
            version: 1,
            description: lessonDescriptionRich,
            instructions: lessonType === 'assessment' ? lessonInstructionsRich : createRichText(),
          })} />
          <input type="hidden" name="resource_rich_content_json" value={JSON.stringify({ version: 1, description: resourceTextRich })} />
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
                <CustomSelect
                  id="lesson-module"
                  name="module_id"
                  defaultValue={lessonForm.lesson?.module_id || lessonForm.moduleId}
                  options={modules.map((module, index) => ({ value: module.id, label: `${String(index + 1).padStart(2, '0')} · ${module.title}` }))}
                  ariaLabel="Lesson module"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lesson-type">Lesson Type</label>
                <CustomSelect
                  id="lesson-type"
                  name="type"
                  value={lessonType}
                  onChange={setLessonType}
                  options={[
                    { value: 'video', label: 'Video (YouTube)' },
                    { value: 'assessment', label: 'Assessment' },
                  ]}
                  ariaLabel="Lesson type"
                />
              </div>
            </div>
          </div>
          {lessonType === 'assessment' && (
            <div className={styles.formSection}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="assessment-key">Select Assessment</label>
                  <CustomSelect
                    id="assessment-key"
                    name="assessment_key"
                    value={assessmentKey}
                    onChange={setAssessmentKey}
                    options={assessments.map((assessment) => ({ value: assessment.id, label: assessment.title }))}
                    ariaLabel="Assessment"
                  />
                </div>
                <div className={styles.formGroup}>
                  <div className={styles.assessmentTimeLabelRow}>
                    <label htmlFor="assessment-time-estimate">Estimated Time</label>
                    {selectedAssessmentQuestionCount > 0 && (
                      <span className={styles.assessmentQuestionCount}>
                        {selectedAssessmentQuestionCount} question{selectedAssessmentQuestionCount === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                  <CustomSelect
                    id="assessment-time-estimate"
                    name="assessment_time_estimate"
                    defaultValue={lessonForm.lesson?.assessment_time_estimate || ASSESSMENT_TIME_OPTIONS[0]}
                    options={ASSESSMENT_TIME_OPTIONS.map((option) => ({ value: option, label: option }))}
                    ariaLabel="Estimated assessment time"
                  />
                </div>
              </div>
            </div>
          )}
          <div className={styles.formSection}>
            <div className={styles.formGroup}>
              <label htmlFor="lesson-description">Short Description</label>
              <RichTextEditor
                id="lesson-description"
                name="description"
                value={lessonDescriptionRich}
                onChange={setLessonDescriptionRich}
                ariaLabel="Lesson short description"
                maxLength={2000}
                placeholder="Add a short lesson description..."
              />
            </div>
          </div>
          <div className={styles.formSection}>
            {lessonType === 'video' ? (
              <div className={styles.formGroup}>
                <label htmlFor="youtube-url">YouTube URL</label>
                <input id="youtube-url" type="url" name="youtube_url" defaultValue={lessonForm.lesson?.youtube_url || ''} required />
              </div>
            ) : (
              <div className={styles.assessmentTextFields}>
                <div className={styles.formGroup}>
                  <label htmlFor="assessment-instructions">Instructions <span>(optional)</span></label>
                  <RichTextEditor
                    id="assessment-instructions"
                    name="instructions"
                    value={lessonInstructionsRich}
                    onChange={setLessonInstructionsRich}
                    ariaLabel="Assessment instructions"
                    maxLength={5000}
                    placeholder="Add instructions learners should read before starting..."
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="assessment-completion-guidance">How to Complete This Assessment</label>
                  <textarea
                    id="assessment-completion-guidance"
                    name="assessment_completion_guidance"
                    rows="4"
                    maxLength="2000"
                    defaultValue={lessonForm.lesson?.assessment_completion_guidance || ''}
                    placeholder="Explain what learners should do to complete the assessment..."
                  />
                </div>
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
              <CustomSelect
                id="resource-type"
                name="resource_type"
                value={resourceType}
                onChange={setResourceType}
                options={[
                  { value: 'none', label: 'No additional resource' },
                  { value: 'text', label: 'Text' },
                  { value: 'pdf', label: 'PDF upload' },
                  { value: 'link', label: 'External link' },
                ]}
                ariaLabel="Additional resource type"
              />
            </div>

            {resourceType === 'text' && (
              <div className={styles.formGroup}>
                <label htmlFor="resource-text">Resource Text</label>
                <RichTextEditor
                  id="resource-text"
                  name="resource_text"
                  value={resourceTextRich}
                  onChange={setResourceTextRich}
                  ariaLabel="Additional resource text"
                  maxLength={20000}
                  placeholder="Add the supporting text for this lesson..."
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
              {isSaving && saveTarget === 'lesson' ? 'Saving...' : lessonForm.mode === 'edit' ? 'Update Lesson' : 'Create Lesson'}
            </button>
            <button type="button" onClick={() => setLessonForm(null)} className={styles.cancelButton}>Cancel</button>
          </div>
          {isSaving && saveTarget === 'lesson' && <SaveProgress label={saveLabel} />}
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
        <div className={styles.moduleList} id="course-modules">
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
                  {(() => {
                    const lessonCount = module.lessons.filter((lesson) => lesson.type === 'video').length
                    return <span className={styles.lessonCount}>{lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}</span>
                  })()}
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
                        <span>
                          {getLessonDisplayNumber(numberingStyle, moduleIndex, module.lessons, lessonIndex)
                            || (lesson.type === 'assessment' ? <FaClipboardList /> : <FaPlay />)}
                        </span>
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
            <h2 className={styles.lessonDeleteModalTitle}>Delete {deleteModal.type === 'module' ? 'Module' : deleteModal.type === 'introduction' ? 'Course Introduction' : 'Lesson'}?</h2>
            <p className={styles.lessonDeleteModalMessage}>You are about to delete <strong>{deleteModal.title}</strong>.</p>
            {deleteModal.type === 'module' && deleteModal.lessonCount > 0 ? (
              <p className={styles.lessonDeleteModalWarning}>This module still contains lessons. Move or delete them first.</p>
            ) : deleteModal.type === 'introduction' ? (
              <p className={styles.lessonDeleteModalWarning}>Module 1, Lesson 1 will become the first available lesson. Existing learner progress for this introduction will also be removed.</p>
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
