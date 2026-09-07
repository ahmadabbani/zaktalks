'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getAssessmentById } from '@/assessments/registry'
import LikertEngine from '@/assessments/LikertEngine'
import CorrectIncorrectEngine from '@/assessments/CorrectIncorrectEngine'
import CathexisEngine from '@/assessments/CathexisEngine'
import StrokeProfileEngine from '@/assessments/StrokeProfileEngine'
import BinaryScoredEngine from '@/assessments/BinaryScoredEngine'
import DriverQuestionnaireEngine from '@/assessments/DriverQuestionnaireEngine'
import EgoStateAnalysisEngine from '@/assessments/EgoStateAnalysisEngine'
import ExternalFillableWorksheetEngine from '@/assessments/ExternalFillableWorksheetEngine'
import { getAssessmentStatementCount } from '@/lib/assessment-lesson-metadata'
import { FaArrowRight, FaClipboardCheck, FaShieldAlt } from 'react-icons/fa'
import styles from '@/assessments/assessment.module.css'

export default function ExternalAssessmentRunner({ assessmentKey }) {
  const [stage, setStage] = useState('overview')
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

  if (stage !== 'assessment') {
    const statementCount = getAssessmentStatementCount(definition)

    return (
      <div className={`${styles.externalAssessmentShell} ${styles.externalSharedAssessment}`}>
        <div className={`${styles.introContainer} ${styles.externalSharedIntro}`}>
          <header className={styles.introHero}>
            <div className={styles.introHeroCopy}>
              <h2>{definition.title}</h2>
              <div className={styles.introHeroMeta}>
                {statementCount > 0 && <span>{statementCount} statements</span>}
                <span><FaShieldAlt /> Private by default</span>
              </div>
            </div>
            {definition.logo ? (
              <span className={styles.externalIntroHeroLogo}>
                <Image
                  src={definition.logo}
                  alt=""
                  aria-hidden="true"
                  width={96}
                  height={96}
                  quality={86}
                />
              </span>
            ) : (
              <FaClipboardCheck className={styles.introHeroIcon} aria-hidden="true" />
            )}
          </header>

          {stage === 'overview' ? (
            <div className={styles.introBody}>
              <span className={styles.introEyebrow}>What this assessment explores</span>
              {definition.description && (
                <p className={styles.introDescription}>{definition.description}</p>
              )}
              <button
                type="button"
                className={styles.introStartBtn}
                onClick={() => setStage('instructions')}
              >
                Start Assessment <FaArrowRight />
              </button>
            </div>
          ) : (
            <div className={`${styles.introBody} ${styles.introPreparation}`}>
              <h3>Instructions</h3>
              {definition.intro && (
                <p className={styles.introCompletionText}>{definition.intro}</p>
              )}
              {definition.scoring?.instructions && (
                <div className={styles.introInstructions}>
                  <strong>Scoring</strong>
                  <p>{definition.scoring.instructions}</p>
                </div>
              )}
              <button
                type="button"
                className={styles.introStartBtn}
                onClick={() => setStage('assessment')}
              >
                I&apos;m ready to begin <FaArrowRight />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const engineProps = {
    definition: { ...definition, externalOnly: true },
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

    if (definition.type === 'fillable-worksheet') {
      return <ExternalFillableWorksheetEngine {...engineProps} />
    }

    return <LikertEngine {...engineProps} />
  }

  return (
    <div className={`${styles.externalAssessmentShell} ${styles.externalSharedAssessment}`}>
      {renderEngine()}
    </div>
  )
}
