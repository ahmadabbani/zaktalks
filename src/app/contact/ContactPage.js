'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'react-hot-toast'
import { FaMapMarkerAlt, FaEnvelope, FaPhoneAlt, FaArrowRight, FaTiktok, FaYoutube, FaInstagram, FaLinkedinIn, FaFacebookF, FaWhatsapp } from 'react-icons/fa'
import { sendContactEmail } from './contact.actions'
import styles from './contact.module.css'

export default function ContactPage({ userEmail }) {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!userEmail) {
      toast.error('Please register or login first.')
      return
    }

    const formData = new FormData(e.target)
    const name = formData.get('name')
    const phone = formData.get('phone')
    const message = formData.get('message')

    // Custom Validation logic
    const newErrors = {}
    if (!name?.trim()) newErrors.name = 'Please tell us your name'
    if (!phone?.trim()) newErrors.phone = 'We need a way to call you back'
    if (!message?.trim()) newErrors.message = 'Please enter your message'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const result = await sendContactEmail(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        e.target.reset()
      }
    } catch (err) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.contactWrapper}>
      <div className="container">
        <div className={styles.contactGrid}>
          {/* Left Side: Info */}
          <div className={styles.leftCol}>
            <h1 className={styles.title}>
              Let's <span className={styles.highlight}>Talk</span> About Your Future.
            </h1>
            
            <div className={styles.infoWidgets}>
              <a href="#" target="_blank" rel="noopener noreferrer" className={styles.widget}>
                <div className={styles.iconWrapper}><FaMapMarkerAlt /></div>
                <div className={styles.widgetText}>
                  <span className={styles.widgetLabel}>Location</span>
                  <span className={styles.widgetValue}>Beirut, Lebanon</span>
                </div>
              </a>
              <a href="mailto:hello@zaktalks.com" className={styles.widget}>
                <div className={styles.iconWrapper}><FaEnvelope /></div>
                <div className={styles.widgetText}>
                  <span className={styles.widgetLabel}>Email</span>
                  <span className={styles.widgetValue}>hello@zaktalks.com</span>
                </div>
              </a>
              <a href="https://wa.me/96170123456" target="_blank" rel="noopener noreferrer" className={styles.widget}>
                <div className={styles.iconWrapper}><FaPhoneAlt /></div>
                <div className={styles.widgetText}>
                  <span className={styles.widgetLabel}>Phone</span>
                  <span className={styles.widgetValue}>+961 70 123 456</span>
                </div>
              </a>
            </div>

            <div className={styles.socials}>
              <a href="#" className={styles.socialIcon} aria-label="TikTok"><FaTiktok /></a>
              <a href="#" className={styles.socialIcon} aria-label="YouTube"><FaYoutube /></a>
              <a href="#" className={styles.socialIcon} aria-label="Instagram"><FaInstagram /></a>
              <a href="#" className={styles.socialIcon} aria-label="LinkedIn"><FaLinkedinIn /></a>
              <a href="#" className={styles.socialIcon} aria-label="Facebook"><FaFacebookF /></a>
              <a href="#" className={styles.socialIcon} aria-label="WhatsApp"><FaWhatsapp /></a>
            </div>
          </div>

          {/* Right Side: Form */}
          <div className={styles.rightCol}>
            <div className={styles.formContainer}>
              <h2 className={styles.formTitle}>Drop me a line, I'd love to hear from you!</h2>
              
              {userEmail && (
                <div className={styles.emailRecall}>
                  We'll reply to: <strong>{userEmail}</strong>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className={styles.formGroup}>
                  <input 
                    type="text" 
                    name="name" 
                    placeholder="Enter your name" 
                    className={styles.input}
                    onChange={() => setErrors(p => ({...p, name: null}))}
                  />
                  {errors.name && <div className={styles.errorMsg}>{errors.name}</div>}
                </div>

                <div className={styles.formGroup}>
                  <input 
                    type="tel" 
                    name="phone" 
                    placeholder="Phone number" 
                    className={styles.input}
                    onChange={() => setErrors(p => ({...p, phone: null}))}
                  />
                  {errors.phone && <div className={styles.errorMsg}>{errors.phone}</div>}
                </div>

                <div className={styles.formGroup}>
                  <textarea 
                    name="message" 
                    placeholder="How can I help you?" 
                    className={`${styles.input} ${styles.textarea}`}
                    onChange={() => setErrors(p => ({...p, message: null}))}
                  ></textarea>
                  {errors.message && <div className={styles.errorMsg}>{errors.message}</div>}
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  <span>{loading ? 'Sending...' : 'Send Message'}</span>
                  <div className={styles.btnCircle}>
                    <FaArrowRight />
                  </div>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
