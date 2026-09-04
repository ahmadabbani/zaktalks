'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaRedo, FaCheck, FaTimes } from 'react-icons/fa';
import ResultScreenshotButton from '@/components/ResultScreenshotButton';
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance';
import styles from './assessment.module.css';

export default function CorrectIncorrectEngine({ definition, onComplete, enableResultScreenshot = false, resultCaptureId = 'assessment-result-capture', resultDownloadFormat = 'png' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance();

  const currentQuestion = definition.questions[currentIndex];
  const totalQuestions = definition.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  // Use shared options from definition, or per-question options if defined
  const getOptions = (question) => {
    return question.options || definition.options;
  };

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
    let correctCount = 0;
    for (const question of definition.questions) {
      if (submittedAnswers[question.id] === question.correctAnswer) {
        correctCount++;
      }
    }

    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete({ score: correctCount, answers: submittedAnswers });
      }
      setShowResult(true);
    } catch {
      toast.error('Your result could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showResult) {
    const wrongAnswers = definition.questions.filter(
      (q) => answers[q.id] !== q.correctAnswer
    );
    const correctCount = totalQuestions - wrongAnswers.length;

    return (
      <div className={styles.resultContainer} style={{ maxWidth: '800px' }} id={enableResultScreenshot ? resultCaptureId : undefined}>
        <h2 className={styles.resultHeader}>Assessment Complete!</h2>

        <div className={styles.resultContent}>
          <h3 className={styles.resultLabel}>
            Your Score: {correctCount} out of {totalQuestions}
          </h3>
          <p className={styles.resultMessage}>
            {wrongAnswers.length === 0
              ? 'Perfect! You got all answers correct!'
              : `You got ${wrongAnswers.length} answer${wrongAnswers.length > 1 ? 's' : ''} wrong. Review them below.`}
          </p>
        </div>

        {wrongAnswers.length > 0 && (
          <div className={styles.ciReviewSection}>
            <h3 className={styles.ciReviewTitle}>Review Wrong Answers</h3>
            <div className={styles.ciReviewList}>
              {wrongAnswers.map((q) => {
                const options = getOptions(q);
                const userLabel = options.find((o) => o.value === answers[q.id])?.label || answers[q.id];
                const correctLabel = options.find((o) => o.value === q.correctAnswer)?.label || q.correctAnswer;
                return (
                  <div key={q.id} className={styles.ciReviewItem}>
                    <p className={styles.ciReviewQuestion}>{q.text}</p>
                    <div className={styles.ciReviewAnswers}>
                      <span className={styles.ciWrongAnswer}>
                        <FaTimes /> Your answer: {userLabel}
                      </span>
                      <span className={styles.ciCorrectAnswer}>
                        <FaCheck /> Correct answer: {correctLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

  const options = getOptions(currentQuestion);

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

      {/* Options */}
      <div key={`answers-${currentQuestion.id}`} className={`${styles.ciOptionsSection} ${styles.questionTransition} ${styles.answerTransition}`}>
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={isSubmitting || isAdvancing}
            className={`${styles.ciOptionBtn} ${answers[currentQuestion.id] === option.value ? styles.ciOptionBtnSelected : ''}`}
          >
            {option.label}
          </button>
        ))}
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
