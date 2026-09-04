'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaRedo } from 'react-icons/fa';
import ResultScreenshotButton from '@/components/ResultScreenshotButton';
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance';
import styles from './assessment.module.css';

export default function LikertEngine({ definition, onComplete, enableResultScreenshot = false, resultCaptureId = 'assessment-result-capture', resultDownloadFormat = 'png' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance();

  const currentQuestion = definition.questions[currentIndex];
  const totalQuestions = definition.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleSelect = (value) => {
    if (isSubmitting || isAdvancing) return;

    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);

    advanceAfterFeedback(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((index) => index + 1);
      } else {
        calculateResult(nextAnswers);
      }
    });
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleRetake = () => {
    window.sessionStorage.setItem('assessment_retake_scroll_top', '1');
    window.location.reload();
  };

  const calculateResult = async (submittedAnswers = answers) => {
    const values = Object.values(submittedAnswers);
    const sum = values.reduce((a, b) => a + b, 0);
    const average = sum / values.length;
    
    let resultLabel = '';
    let resultMessage = '';
    
    const scoreToUse = definition.scoring.method === 'sum' ? sum : average;
    
    for (const threshold of definition.scoring.thresholds) {
      if (scoreToUse <= threshold.max) {
        resultLabel = threshold.label;
        resultMessage = threshold.message;
        break;
      }
    }

    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete({ score: scoreToUse, label: resultLabel, answers: submittedAnswers });
      }
      setShowResult(true);
    } catch {
      toast.error('Your result could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showResult) {
    const sum = Object.values(answers).reduce((a, b) => a + b, 0);
    const scoreToUse = definition.scoring.method === 'sum' ? sum : sum / totalQuestions;
    const result = definition.scoring.thresholds.find(t => scoreToUse <= t.max);

    return (
      <div className={styles.resultContainer} id={enableResultScreenshot ? resultCaptureId : undefined}>
        <h2 className={styles.resultHeader}>Assessment Complete!</h2>
        <div className={styles.resultContent}>
          <h3 className={styles.resultLabel}>Your Result: {result?.label}</h3>
          <p className={styles.resultMessage}>{result?.message}</p>
        </div>
        {enableResultScreenshot && (
          <ResultScreenshotButton targetId={resultCaptureId} fileName={definition.title} format={resultDownloadFormat} />
        )}
        <button className={styles.retakeBtn} onClick={handleRetake} data-screenshot-exclude="true">
          <FaRedo style={{ marginRight: '8px' }} />
          Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${definition.externalOnly ? styles.externalQuestionContainer : ''}`}>
      {/* Header / Progress */}
      <div className={styles.header}>
        <div className={styles.progressInfo}>
          <span className={styles.questionCount}>Question {currentIndex + 1} of {totalQuestions}</span>
          <span className={styles.progressPercentage}>{Math.round(progress)}%</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBarFill} 
            style={{ width: `${progress}%`, backgroundColor: definition.themeColor || 'var(--color-yellow)' }}
          ></div>
        </div>
      </div>

      {/* Question */}
      <div key={`question-${currentQuestion.id}`} className={`${styles.questionSection} ${styles.questionTransition}`}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      {/* Options 1-5 */}
      <div key={`answers-${currentQuestion.id}`} className={`${styles.optionsSection} ${styles.questionTransition} ${styles.answerTransition}`}>
        <div className={styles.scaleLabels}>
          <span>NOT AT ALL TRUE</span>
          <span>VERY TRUE</span>
        </div>
        <div className={styles.scaleButtons}>
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleSelect(val)}
              disabled={isSubmitting || isAdvancing}
              className={`${styles.scaleBtn} ${answers[currentQuestion.id] === val ? styles.scaleBtnSelected : ''}`}
            >
              {val}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className={styles.navigation}>
        <button 
          className={`${styles.navBtn} ${styles.prevBtn}`}
          onClick={handlePrev} 
          disabled={currentIndex === 0 || isSubmitting || isAdvancing}
        >
          <FaChevronLeft /> Previous
        </button>
      </div>
    </div>
  );
}
