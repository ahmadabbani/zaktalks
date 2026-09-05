'use client'

import { useEffect, useState } from 'react';
import { getAssessmentById } from '@/assessments/registry';
import LikertEngine from '@/assessments/LikertEngine';
import CorrectIncorrectEngine from '@/assessments/CorrectIncorrectEngine';
import CathexisEngine from '@/assessments/CathexisEngine';
import FillableWorksheetEngine from '@/assessments/FillableWorksheetEngine';
import StrokeProfileEngine from '@/assessments/StrokeProfileEngine';
import { updateLessonProgress } from '@/app/courses/actions';
import { useCourseProgress } from '@/app/courses/[slug]/player/CourseProgressContext';
import RichText from '@/components/RichText';

import styles from '@/assessments/assessment.module.css';

export default function AssessmentRenderer({
  assessmentKey,
  lessonId,
  isCompleted,
  showIntro = false,
  lessonDescription = '',
  lessonDescriptionRich = null
}) {
  const [hasStarted, setHasStarted] = useState(!showIntro);
  const [attemptId] = useState(() => crypto.randomUUID());
  const { markLessonCompleted } = useCourseProgress();
  const definition = getAssessmentById(assessmentKey);

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
    enableResultScreenshot: true,
    resultCaptureId: `lesson-assessment-result-${lessonId}`,
    resultDownloadFormat: 'pdf'
  };

  if (!hasStarted) {
    return (
      <div className={styles.introContainer}>
        <h2 className={styles.introTitle}>{definition.title}</h2>
        {(lessonDescription || definition.intro || definition.description) && (
          <p className={styles.introDescription}>
            {lessonDescription
              ? <RichText value={lessonDescriptionRich} fallback={lessonDescription} maxLength={2000} />
              : definition.intro || definition.description}
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
        definition={definition}
        lessonId={lessonId}
        onComplete={() => markLessonCompleted(lessonId)}
      />
    );
  }
  if (definition.type === 'stroke-profile') {
    return <StrokeProfileEngine {...scoredEngineProps} />;
  }

  // Default: Likert scale engine
  return <LikertEngine {...scoredEngineProps} />;
}
