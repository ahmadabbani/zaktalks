'use client'

import { useEffect, useState } from 'react';
import { getAssessmentById } from '@/assessments/registry';
import LikertEngine from '@/assessments/LikertEngine';
import CorrectIncorrectEngine from '@/assessments/CorrectIncorrectEngine';
import CathexisEngine from '@/assessments/CathexisEngine';
import FillableWorksheetEngine from '@/assessments/FillableWorksheetEngine';
import StrokeProfileEngine from '@/assessments/StrokeProfileEngine';
import { updateLessonProgress } from '@/app/courses/actions';

import styles from '@/assessments/assessment.module.css';

export default function AssessmentRenderer({
  assessmentKey,
  lessonId,
  userId,
  isCompleted,
  showIntro = false,
  lessonDescription = ''
}) {
  const [hasStarted, setHasStarted] = useState(!showIntro);
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
        <p>The assessment with key "{assessmentKey}" does not exist in the registry.</p>
      </div>
    );
  }

  const handleComplete = async (result) => {
    try {
      await updateLessonProgress({
        lessonId,
        userId,
        watchTime: 0,
        isCompleted: true,
        score: result.score
      });
    } catch (error) {
      console.error('Failed to save assessment progress:', error);
    }
  };

  if (!hasStarted) {
    return (
      <div className={styles.introContainer}>
        <h2 className={styles.introTitle}>{definition.title}</h2>
        {(lessonDescription || definition.intro || definition.description) && (
          <p className={styles.introDescription}>
            {lessonDescription || definition.intro || definition.description}
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
    return <CorrectIncorrectEngine definition={definition} onComplete={handleComplete} />;
  }
  if (definition.type === 'cathexis') {
    return <CathexisEngine definition={definition} onComplete={handleComplete} />;
  }
  if (definition.type === 'fillable-worksheet') {
    return <FillableWorksheetEngine definition={definition} lessonId={lessonId} />;
  }
  if (definition.type === 'stroke-profile') {
    return <StrokeProfileEngine definition={definition} onComplete={handleComplete} />;
  }

  // Default: Likert scale engine
  return <LikertEngine definition={definition} onComplete={handleComplete} />;
}
