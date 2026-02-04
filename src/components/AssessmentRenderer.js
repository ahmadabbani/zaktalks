'use client'

import { getAssessmentById } from '@/assessments/registry';
import LikertEngine from '@/assessments/LikertEngine';
import { updateLessonProgress } from '@/app/courses/actions';

import styles from '@/assessments/assessment.module.css';

export default function AssessmentRenderer({ assessmentKey, lessonId, userId, isCompleted }) {
  const definition = getAssessmentById(assessmentKey);

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

  // Currently we only have Likert scale, but this is where we'd branch for other types
  return <LikertEngine definition={definition} onComplete={handleComplete} />;
}
