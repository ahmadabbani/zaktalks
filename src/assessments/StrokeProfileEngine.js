'use client'

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaChevronRight, FaRedo } from 'react-icons/fa';
import styles from './assessment.module.css';

const MAX_GROUP_SCORE = 24;

function buildQuestions(groups) {
  return groups.flatMap((group) =>
    group.statements.map((text, index) => ({
      id: `${group.id}_${index + 1}`,
      text,
      groupId: group.id,
      groupNumber: group.number,
      groupTitle: group.title
    }))
  );
}

function calculateTotals(groups, answers) {
  return groups.reduce((totals, group) => {
    totals[group.id] = group.statements.reduce((sum, _statement, index) => {
      return sum + (answers[`${group.id}_${index + 1}`] ?? 0);
    }, 0);
    return totals;
  }, {});
}

function ProfileBar({ group, score }) {
  const isPositive = group.polarity === 'positive';
  const height = Math.max(0, Math.min(100, (score / MAX_GROUP_SCORE) * 100));

  return (
    <div className={styles.strokeProfileColumn}>
      <div className={styles.strokeBarFrame} aria-label={`${group.title}: ${score} out of 24`}>
        <div
          className={`${styles.strokeBarFill} ${isPositive ? styles.strokeBarFillPositive : styles.strokeBarFillNegative}`}
          style={{ height: `${height}%` }}
        ></div>
      </div>
      <div className={styles.strokeColumnScore}>{score}</div>
      <div className={styles.strokeColumnLabel}>{group.profileLabel}</div>
      <div className={styles.strokeColumnNumber}>({group.number})</div>
    </div>
  );
}

export default function StrokeProfileEngine({ definition, onComplete }) {
  const questions = useMemo(() => buildQuestions(definition.groups), [definition.groups]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = (currentIndex / totalQuestions) * 100;
  const scaleValues = definition.scale?.values || [0, 1, 2, 3, 4, 5, 6];
  const totalPossible = definition.groups.length * MAX_GROUP_SCORE;

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
      return;
    }

    const totals = calculateTotals(definition.groups, answers);
    const scoreSum = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const normalizedScore = totalPossible > 0 ? Math.round((scoreSum / totalPossible) * 100) : 0;

    setShowResult(true);
    if (onComplete) {
      onComplete({ score: normalizedScore });
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

  if (showResult) {
    const totals = calculateTotals(definition.groups, answers);
    const positiveGroups = definition.groups.filter((group) => group.polarity === 'positive');
    const negativeGroups = definition.groups.filter((group) => group.polarity === 'negative');

    return (
      <div className={styles.strokeResultContainer}>
        <div className={styles.strokeResultHeader}>
          <h2>{definition.resultTitle}</h2>
          <p>{definition.profileTitle}</p>
        </div>

        <p className={styles.strokeProfileInstructions}>{definition.profileInstructions}</p>

        <div className={styles.strokeProfileChart}>
          <div className={styles.strokeProfileScale} aria-hidden="true">
            {[24, 20, 16, 12, 8, 4, 0].map((value) => (
              <span key={`scale-${value}`}>{value}</span>
            ))}
          </div>

          <div className={styles.strokeProfileArea}>
            <h3 className={styles.strokePolarityTitle}>POSITIVE STROKES</h3>
            <div className={styles.strokeChartGrid}>
              {positiveGroups.map((group) => (
                <ProfileBar key={group.id} group={group} score={totals[group.id] || 0} />
              ))}
            </div>

            <div className={styles.strokeChartDivider}>STROKES</div>

            <h3 className={styles.strokePolarityTitle}>NEGATIVE STROKES</h3>
            <div className={styles.strokeChartGrid}>
              {negativeGroups.map((group) => (
                <ProfileBar key={group.id} group={group} score={totals[group.id] || 0} />
              ))}
            </div>
          </div>
        </div>

        <div className={styles.strokeTotalsList}>
          {definition.groups.map((group) => (
            <div key={group.id} className={styles.strokeTotalRow}>
              <span>{group.title}</span>
              <strong>{totals[group.id] || 0}/24</strong>
            </div>
          ))}
        </div>

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

      <div className={styles.strokeQuestionMeta}>
        <span className={styles.strokeQuestionGroupNumber}>({currentQuestion.groupNumber})</span>
        <strong>{currentQuestion.groupTitle}</strong>
      </div>

      <div className={styles.questionSection}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div className={styles.optionsSection}>
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

        <div className={styles.scaleButtons}>
          {scaleValues.map((value) => (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              className={`${styles.scaleBtn} ${answers[currentQuestion.id] === value ? styles.scaleBtnSelected : ''}`}
            >
              {value}
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
        <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext}>
          {currentIndex === totalQuestions - 1 ? 'Finish' : 'Next'} <FaChevronRight />
        </button>
      </div>
    </div>
  );
}
