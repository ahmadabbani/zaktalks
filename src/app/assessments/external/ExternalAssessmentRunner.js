'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getAssessmentById, getExternalAssessmentPresentation } from '@/assessments/registry'
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
  const [selectedWorksheetSectionId, setSelectedWorksheetSectionId] = useState(null)
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

  const displayDefinition = getExternalAssessmentPresentation(definition)
  const requiresArchetypeSelection = Boolean(
    definition.type === 'fillable-worksheet' && displayDefinition.archetypeSelection
  )

  if (stage !== 'assessment') {
    const statementCount = getAssessmentStatementCount(displayDefinition)

    return (
      <div className={`${styles.externalAssessmentShell} ${styles.externalSharedAssessment}`}>
        <div className={`${styles.introContainer} ${styles.externalSharedIntro}`}>
          <header className={styles.introHero}>
            <div className={styles.introHeroCopy}>
              <h2>{displayDefinition.title}</h2>
              <div className={styles.introHeroMeta}>
                {definition.type === 'fillable-worksheet' ? (
                  <span>{displayDefinition.sections?.length || 0} archetypes</span>
                ) : statementCount > 0 && (
                  <span>{statementCount} statements</span>
                )}
                <span><FaShieldAlt /> Private by default</span>
              </div>
            </div>
            {displayDefinition.hideHeroVisual ? null : displayDefinition.logo ? (
              <span className={styles.externalIntroHeroLogo}>
                <Image
                  src={displayDefinition.logo}
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
              {displayDefinition.introVariant === 'driver' ? (
                <div className={styles.externalDriverOverviewCopy}>
                  <p>{displayDefinition.description}</p>
                  <p>
                    {displayDefinition.descriptionFollowup}{' '}
                    <strong>{displayDefinition.highlightedDrivers.join(', ')}</strong>.
                  </p>
                </div>
              ) : displayDefinition.introVariant === 'ego-style' ? (
                <div className={styles.externalDriverOverviewCopy}>
                  <p>{displayDefinition.description}</p>
                  <p>
                    {displayDefinition.descriptionFollowup}{' '}
                    <strong>{displayDefinition.highlightedStyles.join(', ')}</strong>.
                  </p>
                </div>
              ) : displayDefinition.description && (
                <p className={styles.introDescription}>{displayDefinition.description}</p>
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
              {displayDefinition.intro && (
                <p className={`${styles.introCompletionText} ${displayDefinition.introVariant === 'ego-analysis' ? styles.externalEgoAnalysisIntro : ''}`}>
                  {displayDefinition.intro}
                </p>
              )}
              {displayDefinition.introVariant === 'driver' && (
                <div className={styles.externalDriverAnswerGuide} aria-label="Assessment response scores">
                  {displayDefinition.options.map((option) => (
                    <div key={`driver-guide-${option.label}`}>
                      <strong>{option.label}</strong>
                      <strong>{option.pointsLabel}</strong>
                    </div>
                  ))}
                </div>
              )}
              {(displayDefinition.introVariant === 'energy' || displayDefinition.introVariant === 'scale') && (
                <div
                  className={`${styles.externalEnergyAnswerGuide} ${displayDefinition.id === 'drama-triangle-assessment-v1' ? styles.externalDramaAnswerGuide : ''}`}
                  aria-label="Assessment response scale"
                >
                  {(displayDefinition.scaleLegend || displayDefinition.scale.legend).map((option) => (
                    <strong key={`scale-guide-${option.value}`}>
                      {option.value} - {option.label}
                    </strong>
                  ))}
                </div>
              )}
              {displayDefinition.introVariant === 'ego-states' && (
                <div className={styles.externalEgoInstructionGuide}>
                  {displayDefinition.instructionGuide.map((item) => (
                    <p key={item.title}>
                      <strong>{item.title}</strong> {item.text}
                    </p>
                  ))}
                </div>
              )}
              {displayDefinition.introVariant === 'ego-style' && (
                <div className={styles.externalEgoStyleAnswerGuide} aria-label="Assessment response scale">
                  {displayDefinition.scale.legend.map((option) => (
                    <div key={`ego-style-guide-${option.value}`}>
                      <strong>{option.value}</strong>
                      <span>{option.label}</span>
                    </div>
                  ))}
                </div>
              )}
              {displayDefinition.introVariant === 'ego-analysis' && (
                <div className={styles.externalEgoAnalysisGuide} aria-label="Assessment choice scores">
                  {displayDefinition.instructionGuide.map((item) => (
                    <div key={item.title}>
                      <strong>{item.title}</strong>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {displayDefinition.completionInstructions && (
                <div className={styles.introInstructions}>
                  <strong>How to complete this assessment</strong>
                  <p>{displayDefinition.completionInstructions}</p>
                </div>
              )}
              {requiresArchetypeSelection && (
                <section className={styles.archetypeSelector} aria-labelledby="archetype-selection-heading">
                  <h4 id="archetype-selection-heading">
                    {displayDefinition.archetypeSelectionPrompt || 'Choose your archetype'}
                  </h4>
                  <div className={styles.archetypeSelectorGrid} role="radiogroup" aria-label="Financial archetype">
                    {displayDefinition.sections.map((section) => {
                      const isSelected = selectedWorksheetSectionId === section.id

                      return (
                        <button
                          key={section.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`${styles.archetypeSelectorCard} ${isSelected ? styles.archetypeSelectorCardSelected : ''}`}
                          onClick={() => setSelectedWorksheetSectionId(section.id)}
                        >
                          {section.title}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
              {!displayDefinition.completionInstructions && displayDefinition.scoring?.instructions && (
                <div className={styles.introInstructions}>
                  <strong>Scoring</strong>
                  <p>{displayDefinition.scoring.instructions}</p>
                </div>
              )}
              <button
                type="button"
                className={`${styles.introStartBtn} ${requiresArchetypeSelection ? styles.archetypeContinueBtn : ''}`}
                onClick={() => setStage('assessment')}
                disabled={requiresArchetypeSelection && !selectedWorksheetSectionId}
              >
                {requiresArchetypeSelection && selectedWorksheetSectionId
                  ? `Continue with ${displayDefinition.sections.find(section => section.id === selectedWorksheetSectionId)?.title}`
                  : 'I\'m ready to begin'}{' '}
                <FaArrowRight />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const externalDefinition = {
    ...displayDefinition,
    externalOnly: true,
    sections: requiresArchetypeSelection
      ? displayDefinition.sections.filter(section => section.id === selectedWorksheetSectionId)
      : displayDefinition.sections
  }

  const engineProps = {
    definition: externalDefinition,
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
