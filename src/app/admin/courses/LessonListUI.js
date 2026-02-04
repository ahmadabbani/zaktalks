'use client'

import { useState } from 'react'
import { createLesson, deleteLesson, updateLessonOrder } from '../../lessons.actions'
import toast from 'react-hot-toast'

export default function LessonListUI({ courseId, initialLessons, assessments }) {
  const [lessons, setLessons] = useState(initialLessons)
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form State
  const [newLesson, setNewLesson] = useState({
    title: '',
    description: '',
    type: 'video',
    youtube_url: '',
    assessment_key: assessments[0]?.id || '',
    passing_score: 70
  })

  const handleAddLesson = async (e) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData()
    formData.append('title', newLesson.title)
    formData.append('description', newLesson.description)
    formData.append('type', newLesson.type)
    formData.append('display_order', lessons.length)

    if (newLesson.type === 'video') {
      formData.append('youtube_url', newLesson.youtube_url)
    } else {
      formData.append('assessment_key', newLesson.assessment_key)
      formData.append('passing_score', newLesson.passing_score)
    }

    const result = await createLesson(courseId, formData)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Lesson added!')
      window.location.reload() // Simplest way to refresh the RSC data
    }
    setLoading(false)
  }

  const handleDelete = async (lessonId) => {
    if (!confirm('Are you sure?')) return
    const result = await deleteLesson(courseId, lessonId)
    if (result.error) toast.error(result.error)
    else {
      toast.success('Deleted')
      window.location.reload()
    }
  }

  const moveLesson = async (index, direction) => {
    const newLessons = [...lessons]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= newLessons.length) return

    // Swap
    const temp = newLessons[index]
    newLessons[index] = newLessons[targetIndex]
    newLessons[targetIndex] = temp

    // Update orders
    const finalLessons = newLessons.map((l, i) => ({ ...l, display_order: i }))
    setLessons(finalLessons)
    
    const result = await updateLessonOrder(courseId, finalLessons)
    if (result.error) toast.error(result.error)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-xl)' }}>
      {/* Lesson List */}
      <div>
        {lessons.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', opacity: 0.6 }}>
            No lessons yet. Add your first lesson using the form on the right.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
                  <div style={{ opacity: 0.3, fontWeight: 'bold', fontSize: '1.5rem' }}>{index + 1}</div>
                  <div>
                    <h4 style={{ margin: 0 }}>{lesson.title}</h4>
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.6 }}>
                      {lesson.type.toUpperCase()} • {lesson.type === 'video' ? 'YouTube' : `Assessment: ${lesson.assessment_key}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                  <button className="btn btn-outline" onClick={() => moveLesson(index, -1)} disabled={index === 0} style={{ padding: '4px 8px' }}>&uarr;</button>
                  <button className="btn btn-outline" onClick={() => moveLesson(index, 1)} disabled={index === lessons.length - 1} style={{ padding: '4px 8px' }}>&darr;</button>
                  <button className="btn btn-outline" onClick={() => handleDelete(lesson.id)} style={{ padding: '4px 8px', color: 'var(--color-error)', borderColor: 'var(--color-error)' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Lesson Sidebar */}
      <aside>
        <div className="card" style={{ position: 'sticky', top: 'var(--space-lg)' }}>
          <h3 style={{ marginBottom: 'var(--space-lg)' }}>Add New Lesson</h3>
          <form onSubmit={handleAddLesson} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                required 
                value={newLesson.title} 
                onChange={e => setNewLesson({...newLesson, title: e.target.value})} 
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                rows="2"
                value={newLesson.description} 
                onChange={e => setNewLesson({...newLesson, description: e.target.value})} 
              ></textarea>
            </div>

            <div className="form-group">
              <label>Type</label>
              <select 
                value={newLesson.type} 
                onChange={e => setNewLesson({...newLesson, type: e.target.value})}
                style={{ padding: 'var(--space-sm)', background: 'var(--color-surface)', color: 'white', borderRadius: 'var(--radius-sm)' }}
              >
                <option value="video">Video (YouTube)</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>

            {newLesson.type === 'video' ? (
              <div className="form-group">
                <label>YouTube URL</label>
                <input 
                  type="url" 
                  required 
                  placeholder="https://youtube.com/watch?v=..."
                  value={newLesson.youtube_url} 
                  onChange={e => setNewLesson({...newLesson, youtube_url: e.target.value})} 
                />
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Select Assessment</label>
                  <select 
                    value={newLesson.assessment_key} 
                    onChange={e => setNewLesson({...newLesson, assessment_key: e.target.value})}
                    style={{ padding: 'var(--space-sm)', background: 'var(--color-surface)', color: 'white', borderRadius: 'var(--radius-sm)' }}
                  >
                    {assessments.map(a => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Passing Score (%)</label>
                  <input 
                    type="number" 
                    min="0" max="100"
                    value={newLesson.passing_score} 
                    onChange={e => setNewLesson({...newLesson, passing_score: parseInt(e.target.value)})} 
                  />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 'var(--space-md)' }}>
              {loading ? 'Adding...' : 'Add Lesson'}
            </button>
          </form>
        </div>
      </aside>

      <style jsx>{`
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        label { font-size: 12px; font-weight: bold; opacity: 0.8; }
        input, textarea { 
          padding: 8px; 
          border-radius: 4px; 
          border: 1px solid rgba(255,215,0,0.2); 
          background: rgba(255,215,0,0.05);
          color: white;
        }
      `}</style>
    </div>
  )
}
