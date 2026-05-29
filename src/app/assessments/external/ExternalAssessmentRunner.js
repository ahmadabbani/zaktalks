'use client'

import { useState } from 'react'
import { getAssessmentById } from '@/assessments/registry'
import LikertEngine from '@/assessments/LikertEngine'
import CorrectIncorrectEngine from '@/assessments/CorrectIncorrectEngine'
import CathexisEngine from '@/assessments/CathexisEngine'
import StrokeProfileEngine from '@/assessments/StrokeProfileEngine'
import BinaryScoredEngine from '@/assessments/BinaryScoredEngine'
import DriverQuestionnaireEngine from '@/assessments/DriverQuestionnaireEngine'
import EgoStateAnalysisEngine from '@/assessments/EgoStateAnalysisEngine'
import styles from '@/assessments/assessment.module.css'

export default function ExternalAssessmentRunner({ assessmentKey }) {
  const [hasStarted, setHasStarted] = useState(false)
  const definition = getAssessmentById(assessmentKey)
  const resultCaptureId = `external-assessment-result-${assessmentKey}`

  if (!definition) {
    return (
      <div className={styles.errorContainer}>
        <h3>Assessment not found</h3>
        <p>This external assessment link is not configured correctly.</p>
      </div>
    )
  }

  if (definition.type === 'fillable-worksheet') {
    return (
      <div className={styles.errorContainer}>
        <h3>Worksheet not available externally</h3>
        <p>This worksheet type requires the course flow because it saves a completed PDF.</p>
      </div>
    )
  }

  if (!hasStarted) {
    return (
      <div className={`${styles.introContainer} ${styles.externalIntroContainer} ${styles.externalIntroWithTopSpace} ${definition.introVariant === 'driver' ? styles.driverIntroContainer : ''}`}>
        {definition.logo && (
          <img
            src={definition.logo}
            alt={`${definition.title} logo`}
            className={styles.externalIntroLogo}
          />
        )}
        <h2 className={styles.introTitle}>{definition.title}</h2>
        {definition.description && (
          <p className={`${styles.introDescription} ${styles.externalIntroDescriptionBlock}`}>
            {definition.description}
          </p>
        )}
        {definition.intro && (
          <p className={`${styles.externalIntroInstructions} ${definition.introVariant === 'driver' ? styles.driverIntroBlock : ''}`}>
            {definition.intro}
          </p>
        )}
        {definition.scoring?.instructions && (
          <p className={`${styles.externalIntroScoring} ${definition.introVariant === 'driver' ? styles.driverScoringBlock : ''}`}>
            {definition.scoring.instructions}
          </p>
        )}
        <button
          type="button"
          className={styles.introStartBtn}
          onClick={() => setHasStarted(true)}
        >
          Start Assessment
        </button>
      </div>
    )
  }

  const engineProps = {
    definition,
    enableResultScreenshot: true,
    resultCaptureId
  }

  const renderEngine = () => {
    if (definition.type === 'correct-incorrect') {
      return <CorrectIncorrectEngine {...engineProps} />
    }

    if (definition.type === 'cathexis') {
      return <CathexisEngine {...engineProps} />
    }

    if (definition.type === 'stroke-profile') {
      return <StrokeProfileEngine {...engineProps} />
    }

    if (definition.type === 'binary-scored') {
      return <BinaryScoredEngine {...engineProps} />
    }

    if (definition.type === 'driver-questionnaire') {
      return <DriverQuestionnaireEngine {...engineProps} />
    }

    if (definition.type === 'ego-state-analysis') {
      return <EgoStateAnalysisEngine {...engineProps} />
    }

    return <LikertEngine {...engineProps} />
  }

  return (
    <div className={styles.externalAssessmentShell}>
      {definition.logo && (
        <div className={styles.externalAssessmentLogoBar}>
          <img src={definition.logo} alt={`${definition.title} logo`} />
        </div>
      )}

      {renderEngine()}
    </div>
  )
}
