'use client'

import { useState } from 'react'
import { MdOutlineShield, MdOutlineVisibility, MdOutlineAutorenew, MdOutlineCheckCircle, MdOutlineAutoAwesome } from 'react-icons/md'
import styles from '../app/page.module.css'

export default function CoachingProcess() {
  const [activeStep, setActiveStep] = useState(null)

  return (
    <section className={styles.processSection}>
      <div className="container">
        <h2 className={styles.processTitle}>
          From unconscious inheritance <span className={styles.processHighlight}>to conscious becoming</span>
        </h2>

        <div className={styles.processFlow}>
          {/* Step 1 - Safety */}
          <div className={styles.processStepWrapper}>
            <div 
              className={`${styles.processStep} ${styles.step1} ${activeStep === 1 ? styles.active : ''}`}
              onClick={() => setActiveStep(activeStep === 1 ? null : 1)}
            >
              <div className={styles.processCircle}>
                <MdOutlineShield className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Safety</p>
            </div>
            {activeStep === 1 && (
              <div className={styles.processDescription}>
                <p>Creating psychological safety through clear contracting and relational permission.</p>
              </div>
            )}
          </div>

          {/* Connector 1 - Top to Bottom (circle 1 is high, circle 2 is low) */}
          <svg className={`${styles.connector} ${styles.connector1}`} viewBox="0 0 200 100">
            <path d="M 0 20 Q 100 80, 200 80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
          </svg>

          {/* Step 2 - Awareness */}
          <div className={styles.processStepWrapper}>
            <div 
              className={`${styles.processStep} ${styles.step2} ${activeStep === 2 ? styles.active : ''}`}
              onClick={() => setActiveStep(activeStep === 2 ? null : 2)}
            >
              <div className={styles.processCircle}>
                <MdOutlineVisibility className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Awareness</p>
            </div>
            {activeStep === 2 && (
              <div className={styles.processDescription}>
                <p>Strengthening our Adult self by recognizing inherited patterns.</p>
              </div>
            )}
          </div>

          {/* Connector 2 - Bottom to Top (circle 2 is low, circle 3 is high) */}
          <svg className={`${styles.connector} ${styles.connector2}`} viewBox="0 0 200 100">
            <path d="M 0 80 Q 100 20, 200 20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
          </svg>

          {/* Step 3 - Redecision */}
          <div className={styles.processStepWrapper}>
            <div 
              className={`${styles.processStep} ${styles.step3} ${activeStep === 3 ? styles.active : ''}`}
              onClick={() => setActiveStep(activeStep === 3 ? null : 3)}
            >
              <div className={styles.processCircle}>
                <MdOutlineAutorenew className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Redecision</p>
            </div>
            {activeStep === 3 && (
              <div className={styles.processDescription}>
                <p>Releasing early decisions and choosing new, autonomous responses.</p>
              </div>
            )}
          </div>

          {/* Connector 3 - Top to Bottom (circle 3 is high, circle 4 is low) */}
          <svg className={`${styles.connector} ${styles.connector3}`} viewBox="0 0 200 100">
            <path d="M 0 20 Q 100 80, 200 80" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
          </svg>

          {/* Step 4 - Integration */}
          <div className={styles.processStepWrapper}>
            <div 
              className={`${styles.processStep} ${styles.step4} ${activeStep === 4 ? styles.active : ''}`}
              onClick={() => setActiveStep(activeStep === 4 ? null : 4)}
            >
              <div className={styles.processCircle}>
                <MdOutlineCheckCircle className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Integration</p>
            </div>
            {activeStep === 4 && (
              <div className={styles.processDescription}>
                <p>Consolidating new decisions so they are reflected in thought, feeling, and behavior.</p>
              </div>
            )}
          </div>

          {/* Connector 4 - Bottom to Top (circle 4 is low, circle 5 is high) */}
          <svg className={`${styles.connector} ${styles.connector4}`} viewBox="0 0 200 100">
            <path d="M 0 80 Q 100 20, 200 20" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5,5" />
          </svg>

          {/* Step 5 - Autonomy */}
          <div className={styles.processStepWrapper}>
            <div 
              className={`${styles.processStep} ${styles.step5} ${activeStep === 5 ? styles.active : ''}`}
              onClick={() => setActiveStep(activeStep === 5 ? null : 5)}
            >
              <div className={`${styles.processCircle} ${styles.finalCircle}`}>
                <MdOutlineAutoAwesome className={styles.processIcon} />
              </div>
              <p className={styles.processLabel}>Autonomy</p>
            </div>
            {activeStep === 5 && (
              <div className={styles.processDescription}>
                <p>Living with awareness, spontaneity, and intimacy.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
