'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa';
import styles from './assessment.module.css';

export default function LikertEngine({ definition, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = definition.questions[currentIndex];
  const totalQuestions = definition.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;

  const handleSelect = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (!answers[currentQuestion.id]) {
      toast.error('Please select an answer before continuing.');
      return;
    }
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateResult();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const calculateResult = () => {
    const values = Object.values(answers);
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

    setShowResult(true);
    if (onComplete) {
      onComplete({ score: scoreToUse, label: resultLabel, answers });
    }
  };

  if (showResult) {
    const sum = Object.values(answers).reduce((a, b) => a + b, 0);
    const scoreToUse = definition.scoring.method === 'sum' ? sum : sum / totalQuestions;
    const result = definition.scoring.thresholds.find(t => scoreToUse <= t.max);

    return (
      <div className={styles.resultContainer}>
        <h2 className={styles.resultHeader}>Assessment Complete!</h2>
        <div className={styles.resultContent}>
          <h3 className={styles.resultLabel}>Your Result: {result?.label}</h3>
          <p className={styles.resultMessage}>{result?.message}</p>
        </div>
        <button className={styles.retakeBtn} onClick={() => window.location.reload()}>
          <FaRedo style={{ marginRight: '8px' }} />
          Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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
      <div className={styles.questionSection}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      {/* Options 1-5 */}
      <div className={styles.optionsSection}>
        <div className={styles.scaleLabels}>
          <span>NOT AT ALL TRUE</span>
          <span>VERY TRUE</span>
        </div>
        <div className={styles.scaleButtons}>
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              onClick={() => handleSelect(val)}
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
          disabled={currentIndex === 0}
        >
          <FaChevronLeft /> Previous
        </button>
        <button 
          className={`${styles.navBtn} ${styles.nextBtn}`} 
          onClick={handleNext}
        >
          {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'} <FaChevronRight />
        </button>
      </div>
    </div>
  );
}
