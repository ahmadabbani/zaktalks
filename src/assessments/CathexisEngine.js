'use client'

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa';
import styles from './assessment.module.css';

function hexToRgba(hex, alpha) {
  const safe = (hex || '').replace('#', '');
  if (safe.length !== 6) return `rgba(14, 165, 233, ${alpha})`;
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function CathexisEngine({ definition, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = definition.questions[currentIndex];
  const totalQuestions = definition.questions.length;
  const progress = (currentIndex / totalQuestions) * 100;
  const scaleValues = definition.scale?.values || [1, 2, 3, 4, 5];
  const maxScaleValue = Math.max(...scaleValues);

  const handleSelect = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleNext = () => {
    if (answers[currentQuestion.id] === undefined) {
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

  const handleRetake = () => {
    window.sessionStorage.setItem('assessment_retake_scroll_top', '1');
    window.location.reload();
  };

  const calculateResult = () => {
    const totalSum = Object.values(answers).reduce((a, b) => a + b, 0);
    const totalPossible = definition.questions.length * maxScaleValue;
    const normalizedScore = totalPossible > 0
      ? Math.round((totalSum / totalPossible) * 100)
      : 0;

    setShowResult(true);
    if (onComplete) {
      onComplete({ score: normalizedScore });
    }
  };

  if (showResult) {
    const categoryScores = {};
    const categoryQuestionCounts = {};

    for (const question of definition.questions) {
      const cat = question.category;
      if (!categoryScores[cat]) categoryScores[cat] = 0;
      categoryScores[cat] += answers[question.id] ?? 0;
      categoryQuestionCounts[cat] = (categoryQuestionCounts[cat] || 0) + 1;
    }

    const entries = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const highest = entries[0];
    const secondHighest = entries[1];
    const isMixed = secondHighest ? highest[1] === secondHighest[1] : false;
    const dominantKey = isMixed ? null : highest[0];
    const dominantColor = dominantKey ? definition.categories[dominantKey].color : '#8B5CF6';

    const resultMode = definition.resultMode || '';
    const rankedNeeds = resultMode === 'ranked-needs';
    const scoreTableOnly = resultMode === 'score-table-only';
    const scoresOnly = resultMode === 'scores-only' || rankedNeeds || scoreTableOnly;

    const sortedByScore = [...entries];
    const topThree = sortedByScore.slice(0, 3);
    const bottomThree = [...sortedByScore].reverse().slice(0, 3);

    return (
      <div className={styles.cathResultContainer}>
        <h2 className={styles.cathResultHeader}>Assessment Complete!</h2>
        <p className={styles.cathResultSubtitle}>
          {rankedNeeds ? 'Relational needs score breakdown' : (scoresOnly ? 'Score breakdown' : "Here's your energy profile breakdown")}
        </p>

        <div className={scoresOnly ? styles.cathScoreOnlyList : styles.cathCategoryCards}>
          {Object.entries(definition.categories).map(([key, cat]) => {
            const score = categoryScores[key] || 0;
            const maxPerCategory = (categoryQuestionCounts[key] || 0) * maxScaleValue;
            const percentage = maxPerCategory > 0 ? (score / maxPerCategory) * 100 : 0;
            const isDominant = key === dominantKey;

            if (scoresOnly) {
              return (
                <div key={key} className={styles.cathScoreOnlyRow}>
                  <div className={styles.cathScoreOnlyLabelWrap}>
                    <div
                      className={styles.cathCategoryDot}
                      style={{ backgroundColor: cat.color }}
                    ></div>
                    <h4 className={styles.cathCategoryLabel}>{cat.label}</h4>
                  </div>
                  <div className={styles.cathScoreOnlyBarWrap}>
                    <div className={styles.cathBarTrack}>
                      <div
                        className={styles.cathBarFill}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.color
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.cathScoreOnlyValue}>
                    <span style={{ color: cat.color, fontWeight: 900 }}>{score}</span>
                    <span className={styles.cathScoreMax}>/ {maxPerCategory}</span>
                  </div>
                  {isDominant && !scoreTableOnly && (
                    <div className={styles.cathScoreOnlyDominantBadge} style={{ backgroundColor: cat.color }}>
                      Dominant
                    </div>
                  )}
                </div>
              );
            }

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

        {!scoresOnly && (
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
        )}

        {scoresOnly && !scoreTableOnly && (
          <div
            className={styles.cathScoreOnlyResult}
            style={{
              borderColor: hexToRgba(dominantColor, 0.45),
              background: `linear-gradient(135deg, ${hexToRgba(dominantColor, 0.22)} 0%, ${hexToRgba(dominantColor, 0.08)} 100%)`
            }}
          >
            <div className={styles.cathScoreOnlyResultLabel}>{rankedNeeds ? 'Top Need' : 'Top Archetype'}</div>
            <div className={styles.cathScoreOnlyResultValue} style={{ color: dominantColor }}>
              {dominantKey ? definition.categories[dominantKey].label : (rankedNeeds ? 'Mixed Top Needs' : 'Mixed Archetype Pattern')}
            </div>
            {dominantKey && definition.categories[dominantKey].description && (
              <p className={styles.cathScoreOnlyResultDesc}>
                {definition.categories[dominantKey].description}
              </p>
            )}
          </div>
        )}

        {rankedNeeds && (
          <div className={styles.cathNeedSummaryGrid}>
            <div className={styles.cathNeedSummaryCard}>
              <h4>Top 3 Highest Totals</h4>
              <ul>
                {topThree.map(([key, score]) => (
                  <li key={`top-${key}`}>
                    <span>{definition.categories[key]?.label || key}</span>
                    <strong>{score}/25</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.cathNeedSummaryCard}>
              <h4>Top 3 Lowest Totals</h4>
              <ul>
                {bottomThree.map(([key, score]) => (
                  <li key={`bottom-${key}`}>
                    <span>{definition.categories[key]?.label || key}</span>
                    <strong>{score}/25</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <button className={styles.retakeBtn} onClick={handleRetake}>
          <FaRedo style={{ marginRight: '8px' }} />
          Retake Assessment
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
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

      <div className={styles.questionSection}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div className={styles.optionsSection}>
        {Array.isArray(definition.scale?.legend) && definition.scale.legend.length > 0 ? (
          <div
            className={styles.scaleLegendGrid}
            style={{ gridTemplateColumns: `repeat(${definition.scale.legend.length}, minmax(0, 1fr))` }}
          >
            {definition.scale.legend.map((item) => (
              <span key={`legend-${item.value}`} className={styles.scaleLegendGridItem}>
                {item.label}
              </span>
            ))}
          </div>
        ) : (
          <div className={styles.scaleLabels}>
            <span>{definition.scale?.minLabel || 'NOT AT ALL TRUE'}</span>
            <span>{definition.scale?.maxLabel || 'VERY TRUE'}</span>
          </div>
        )}
        <div className={styles.scaleButtons}>
          {scaleValues.map((val) => (
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
