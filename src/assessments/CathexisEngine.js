'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa';
import styles from './assessment.module.css';

export default function CathexisEngine({ definition, onComplete }) {
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
    // Group scores by category
    const categoryScores = {};
    for (const question of definition.questions) {
      const cat = question.category;
      if (!categoryScores[cat]) categoryScores[cat] = 0;
      categoryScores[cat] += answers[question.id] || 0;
    }

    // Total sum for DB
    const totalSum = Object.values(answers).reduce((a, b) => a + b, 0);

    setShowResult(true);
    if (onComplete) {
      onComplete({ score: totalSum });
    }
  };

  if (showResult) {
    // Calculate category scores
    const categoryScores = {};
    for (const question of definition.questions) {
      const cat = question.category;
      if (!categoryScores[cat]) categoryScores[cat] = 0;
      categoryScores[cat] += answers[question.id] || 0;
    }

    // Max possible per category (3 questions × 5) = 15
    const maxPerCategory = 15;

    // Find dominant category
    const entries = Object.entries(categoryScores);
    entries.sort((a, b) => b[1] - a[1]);

    const highest = entries[0];
    const secondHighest = entries[1];

    // Check if there's a clear winner (highest must be strictly greater than all others)
    const isMixed = highest[1] === secondHighest[1];

    const dominantKey = isMixed ? null : highest[0];

    return (
      <div className={styles.cathResultContainer}>
        <h2 className={styles.cathResultHeader}>Assessment Complete!</h2>
        <p className={styles.cathResultSubtitle}>Here's your energy profile breakdown</p>

        {/* Category Score Cards */}
        <div className={styles.cathCategoryCards}>
          {Object.entries(definition.categories).map(([key, cat]) => {
            const score = categoryScores[key] || 0;
            const percentage = (score / maxPerCategory) * 100;
            const isDominant = key === dominantKey;

            return (
              <div
                key={key}
                className={`${styles.cathCategoryCard} ${isDominant ? styles.cathCategoryDominant : ''}`}
                style={{
                  borderColor: isDominant ? cat.color : 'transparent',
                  '--cat-color': cat.color
                }}
              >
                <div className={styles.cathCategoryHeader}>
                  <div
                    className={styles.cathCategoryDot}
                    style={{ backgroundColor: cat.color }}
                  ></div>
                  <div>
                    <h4 className={styles.cathCategoryLabel}>{cat.label}</h4>
                    <span className={styles.cathCategorySubtitle}>{cat.subtitle}</span>
                  </div>
                </div>

                <div className={styles.cathScoreRow}>
                  <span className={styles.cathScoreValue} style={{ color: cat.color }}>
                    {score}
                  </span>
                  <span className={styles.cathScoreMax}>/ {maxPerCategory}</span>
                </div>

                <div className={styles.cathBarTrack}>
                  <div
                    className={styles.cathBarFill}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: cat.color
                    }}
                  ></div>
                </div>

                <p className={styles.cathCategoryDesc}>{cat.description}</p>

                {isDominant && (
                  <div className={styles.cathDominantBadge} style={{ backgroundColor: cat.color }}>
                    Dominant
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Interpretation */}
        <div
          className={styles.cathInterpretation}
          style={{
            borderLeftColor: dominantKey
              ? definition.categories[dominantKey].color
              : '#8B5CF6'
          }}
        >
          <h3 className={styles.cathInterpTitle}>
            {dominantKey
              ? definition.categories[dominantKey].label
              : definition.mixedResult.label}
          </h3>
          <p className={styles.cathInterpSubtitle}>
            {dominantKey
              ? definition.categories[dominantKey].subtitle
              : definition.mixedResult.subtitle}
          </p>
          <p className={styles.cathInterpText}>
            {dominantKey
              ? definition.categories[dominantKey].interpretation
              : definition.mixedResult.interpretation}
          </p>
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

      {/* Options 1-5 (same as Likert) */}
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
