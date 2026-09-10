'use client'

import { useEffect, useMemo, useState } from 'react';
import { getAssessmentById } from '@/assessments/registry';
import LikertEngine from '@/assessments/LikertEngine';
import CorrectIncorrectEngine from '@/assessments/CorrectIncorrectEngine';
import CathexisEngine from '@/assessments/CathexisEngine';
import FillableWorksheetEngine from '@/assessments/FillableWorksheetEngine';
import StrokeProfileEngine from '@/assessments/StrokeProfileEngine';
import DriverQuestionnaireEngine from '@/assessments/DriverQuestionnaireEngine';
import { updateLessonProgress } from '@/app/courses/actions';
import { useCourseProgress } from '@/app/courses/[slug]/player/CourseProgressContext';
import RichText from '@/components/RichText';
import { FaArrowRight, FaClipboardCheck, FaShieldAlt } from 'react-icons/fa';
import { getAssessmentStatementCount } from '@/lib/assessment-lesson-metadata';

import styles from '@/assessments/assessment.module.css';

export default function AssessmentRenderer({
  assessmentKey,
  lessonId,
  lessonTitle = '',
  moduleNumber = null,
  isCompleted,
  showIntro = false,
  lessonDescription = '',
  lessonDescriptionRich = null,
  lessonInstructions = '',
  lessonInstructionsRich = null,
  timeEstimate = '',
  completionGuidance = ''
}) {
  const [stage, setStage] = useState(showIntro ? 'overview' : 'assessment');
  const [selectedWorksheetSectionId, setSelectedWorksheetSectionId] = useState(null);
  const [attemptId] = useState(() => crypto.randomUUID());
  const { completedMap, markLessonCompleted } = useCourseProgress();
  const definition = getAssessmentById(assessmentKey);
  const requiresArchetypeSelection = Boolean(
    definition?.type === 'fillable-worksheet' && definition.archetypeSelection
  );
  const worksheetDefinition = useMemo(() => {
    if (!requiresArchetypeSelection || !selectedWorksheetSectionId) return definition;

    return {
      ...definition,
      sections: definition.sections.filter(section => section.id === selectedWorksheetSectionId)
    };
  }, [definition, requiresArchetypeSelection, selectedWorksheetSectionId]);

  useEffect(() => {
    const shouldScrollTop = window.sessionStorage.getItem('assessment_retake_scroll_top') === '1';
    if (shouldScrollTop) {
      window.sessionStorage.removeItem('assessment_retake_scroll_top');
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  if (!definition) {
    return (
      <div className={styles.errorContainer}>
        <h3>Error: Assessment not found</h3>
        <p>The assessment with key &quot;{assessmentKey}&quot; does not exist in the registry.</p>
      </div>
    );
  }

  const handleComplete = async (result) => {
    try {
      const saved = await updateLessonProgress({
        lessonId,
        isCompleted: true,
        attemptId,
        answers: result.answers
      });
      markLessonCompleted(lessonId);
      return saved;
    } catch (error) {
      console.error('Failed to save assessment progress:', error);
      throw error;
    }
  };

  const scoredEngineProps = {
    definition,
    onComplete: handleComplete,
    embeddedInCoursePlayer: true,
    enableResultScreenshot: true,
    resultCaptureId: `lesson-assessment-result-${lessonId}`,
    resultDownloadFormat: 'pdf'
  };

  if (stage !== 'assessment') {
    const statementCount = getAssessmentStatementCount(definition);
    const completed = Boolean(completedMap[lessonId] || isCompleted);

    return (
      <div className={styles.introContainer}>
        <header className={styles.introHero}>
          <div className={styles.introHeroCopy}>
            <h2>{lessonTitle || definition.title}</h2>
            <div className={styles.introHeroMeta}>
              {moduleNumber && <span>Module {String(moduleNumber).padStart(2, '0')}</span>}
              {statementCount > 0 && <span>{statementCount} statements</span>}
              {timeEstimate && <span>{timeEstimate}</span>}
              <span><FaShieldAlt /> Private by default</span>
            </div>
            {completed && <span className={styles.introCompleted}>Completed</span>}
          </div>
          <FaClipboardCheck className={styles.introHeroIcon} aria-hidden="true" />
        </header>

        {stage === 'overview' ? (
          <div className={styles.introBody}>
            <span className={styles.introEyebrow}>What this assessment explores</span>
            {(lessonDescription || definition.description) && (
              <p className={styles.introDescription}>
                {lessonDescription
                  ? <RichText value={lessonDescriptionRich} fallback={lessonDescription} maxLength={2000} />
                  : definition.description}
              </p>
            )}
            <button type="button" className={styles.introStartBtn} onClick={() => setStage('instructions')}>
              Start Assessment <FaArrowRight />
            </button>
          </div>
        ) : (
          <div className={`${styles.introBody} ${styles.introPreparation}`}>
            <h3>How to complete this assessment</h3>
            {(completionGuidance || definition.intro) && (
              <p className={styles.introCompletionText}>{completionGuidance || definition.intro}</p>
            )}
            {lessonInstructions && (
              <div className={styles.introInstructions}>
                <strong>Instructions</strong>
                <p><RichText value={lessonInstructionsRich} fallback={lessonInstructions} maxLength={5000} /></p>
              </div>
            )}
            {requiresArchetypeSelection && (
              <section className={styles.archetypeSelector} aria-labelledby="internal-archetype-selection-heading">
                <h4 id="internal-archetype-selection-heading">
                  {definition.archetypeSelectionPrompt || 'Choose your financial archetype:'}
                </h4>
                <div className={styles.archetypeSelectorGrid} role="radiogroup" aria-label="Financial archetype">
                  {definition.sections.map(section => {
                    const isSelected = selectedWorksheetSectionId === section.id;

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
                    );
                  })}
                </div>
              </section>
            )}
            <button
              type="button"
              className={`${styles.introStartBtn} ${requiresArchetypeSelection ? styles.archetypeContinueBtn : ''}`}
              onClick={() => setStage('assessment')}
              disabled={requiresArchetypeSelection && !selectedWorksheetSectionId}
            >
              {requiresArchetypeSelection && selectedWorksheetSectionId
                ? `Continue with ${definition.sections.find(section => section.id === selectedWorksheetSectionId)?.title}`
                : 'I’m ready to begin'}{' '}
              <FaArrowRight />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Branch based on assessment type
  if (definition.type === 'correct-incorrect') {
    return <CorrectIncorrectEngine {...scoredEngineProps} />;
  }
  if (definition.type === 'cathexis') {
    return <CathexisEngine {...scoredEngineProps} />;
  }
  if (definition.type === 'fillable-worksheet') {
    return (
      <FillableWorksheetEngine
        definition={worksheetDefinition}
        lessonId={lessonId}
        onComplete={() => markLessonCompleted(lessonId)}
      />
    );
  }
  if (definition.type === 'stroke-profile') {
    return <StrokeProfileEngine {...scoredEngineProps} />;
  }
  if (definition.type === 'driver-questionnaire') {
    return <DriverQuestionnaireEngine {...scoredEngineProps} />;
  }

  // Default: Likert scale engine
  return <LikertEngine {...scoredEngineProps} />;
}
