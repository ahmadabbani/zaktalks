'use client'

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaRedo } from 'react-icons/fa';
import ResultScreenshotButton from '@/components/ResultScreenshotButton';
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance';
import styles from './assessment.module.css';

const DRAMA_ROLE_DESCRIPTIONS = {
  rescuer: 'Taking responsibility for others, helping without being asked, or putting your needs aside.',
  persecutor: 'Judging, blaming, controlling, or feeling others should do better.',
  victim: 'Feeling powerless, stuck, or unable to influence what happens.'
};

const ENERGY_PATTERN_COLORS = {
  free: '#258C9B',
  unbound: '#69B7C2',
  bound: '#F1C40F'
};

function hexToRgba(hex, alpha) {
  const safe = (hex || '').replace('#', '');
  if (safe.length !== 6) return `rgba(14, 165, 233, ${alpha})`;
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function RoleResultSummary({ primaryRoles, secondaryRoles, categories }) {
  const renderRoles = (roles, type) => roles.length ? roles.map(([key, score]) => {
    const category = categories[key];
    const fallbackColor = type === 'primary' ? '#2563EB' : '#16A34A';

    return (
      <div
        key={`${type}-${key}`}
        className={styles.cathRoleResultItem}
        style={{
          '--role-color': category?.color || fallbackColor,
          '--role-soft': hexToRgba(category?.color || fallbackColor, 0.12)
        }}
      >
        <span className={styles.cathRoleResultName}>{category?.label || key}</span>
        <span className={styles.cathRoleResultScore}>{score}<small>/20</small></span>
        {DRAMA_ROLE_DESCRIPTIONS[key] && (
          <p className={styles.cathRoleResultDescription}>{DRAMA_ROLE_DESCRIPTIONS[key]}</p>
        )}
      </div>
    );
  }) : (
    <div className={styles.cathRoleResultEmpty}>
      <span>No {type} role in this range</span>
      <strong>{type === 'primary' ? 'Primary range: 13-20' : 'Secondary range: 7-12'}</strong>
    </div>
  );

  return (
    <div className={styles.cathRoleResultGrid}>
      <div className={`${styles.cathRoleResultCard} ${styles.cathRoleResultCardPrimary}`}>
        <div className={styles.cathRoleResultEyebrow}>My prominent role</div>
        {renderRoles(primaryRoles, 'primary')}
      </div>
      <div className={`${styles.cathRoleResultCard} ${styles.cathRoleResultCardSecondary}`}>
        <div className={styles.cathRoleResultEyebrow}>My secondary role</div>
        {renderRoles(secondaryRoles, 'secondary')}
      </div>
    </div>
  );
}

export default function CathexisEngine({ definition, onComplete, embeddedInCoursePlayer = false, enableResultScreenshot = false, resultCaptureId = 'assessment-result-capture', resultDownloadFormat = 'png' }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const answersRef = useRef({});
  const [savedResult, setSavedResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance();

  const currentQuestion = definition.questions[currentIndex];
  const totalQuestions = definition.questions.length;
  const progress = (currentIndex / totalQuestions) * 100;
  const scaleValues = definition.scale?.values || [1, 2, 3, 4, 5];
  const maxScaleValue = Math.max(...scaleValues);
  const isDramaTriangle = definition.id === 'drama-triangle-assessment-v1';
  const isEnergyAssessment = definition.id === 'energy-self-assessment-v1';
  const isFinancialFrequency = definition.id === 'unlock-financial-frequency-v1';
  const usesLabeledFivePointScale = isEnergyAssessment || isFinancialFrequency;

  const handleSelect = (value) => {
    if (isSubmitting || isAdvancing) return;

    const nextAnswers = { ...answersRef.current, [currentQuestion.id]: value };
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);

    advanceAfterFeedback(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((index) => index + 1);
      } else {
        calculateResult();
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

  const calculateResult = async () => {
    const submittedAnswers = answersRef.current;
    const totalSum = Object.values(submittedAnswers).reduce((a, b) => a + b, 0);
    const totalPossible = definition.questions.length * maxScaleValue;
    const normalizedScore = totalPossible > 0
      ? Math.round((totalSum / totalPossible) * 100)
      : 0;

    setIsSubmitting(true);
    try {
      if (onComplete) {
        const saved = await onComplete({ score: normalizedScore, answers: submittedAnswers });
        setSavedResult(saved?.assessmentResult || null);
      }
      setShowResult(true);
    } catch {
      toast.error('Your result could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showResult) {
    const categoryScores = {};
    const categoryQuestionCounts = {};
    const savedBreakdown = Array.isArray(savedResult?.scoreDetails?.breakdown)
      ? savedResult.scoreDetails.breakdown
      : [];

    if (savedBreakdown.length) {
      for (const item of savedBreakdown) {
        categoryScores[item.key] = Number(item.score || 0);
        categoryQuestionCounts[item.key] = Number(item.max || 0) / maxScaleValue;
      }
    } else {
      for (const question of definition.questions) {
        const cat = question.category;
        if (!categoryScores[cat]) categoryScores[cat] = 0;
        categoryScores[cat] += answers[question.id] ?? 0;
        categoryQuestionCounts[cat] = (categoryQuestionCounts[cat] || 0) + 1;
      }
    }

    const entries = Object.entries(categoryScores).sort((a, b) => b[1] - a[1]);
    const highest = entries[0];
    const secondHighest = entries[1];
    const isMixed = secondHighest ? highest[1] === secondHighest[1] : false;
    const savedDominantKey = Object.entries(definition.categories || {})
      .find(([, category]) => category.label === savedResult?.resultLabel)?.[0];
    const dominantKey = savedResult
      ? savedDominantKey || null
      : isMixed ? null : highest[0];
    const getCategoryColor = (key) => (
      isEnergyAssessment
        ? ENERGY_PATTERN_COLORS[key] || definition.categories[key]?.color
        : definition.categories[key]?.color
    );
    const dominantColor = dominantKey ? getCategoryColor(dominantKey) : '#8B5CF6';
    const energyPatternName = (key) => `${key.charAt(0).toUpperCase()}${key.slice(1)} energy`;
    const energyScoreTotal = entries.reduce((sum, [, score]) => sum + score, 0);
    let energySegmentStart = 0;
    const energyDonutGradient = isEnergyAssessment
      ? `conic-gradient(${Object.entries(definition.categories).map(([key]) => {
          const score = categoryScores[key] || 0;
          const segmentStart = energySegmentStart;
          energySegmentStart += energyScoreTotal > 0 ? (score / energyScoreTotal) * 360 : 0;
          return `${getCategoryColor(key)} ${segmentStart}deg ${energySegmentStart}deg`;
        }).join(', ')})`
      : '';
    let financialSegmentStart = 0;
    const financialScoreTotal = entries.reduce((sum, [, score]) => sum + score, 0);
    const financialDonutGradient = isFinancialFrequency
      ? `conic-gradient(${Object.entries(definition.categories).map(([key, category]) => {
          const score = categoryScores[key] || 0;
          const segmentStart = financialSegmentStart;
          financialSegmentStart += financialScoreTotal > 0 ? (score / financialScoreTotal) * 360 : 0;
          return `${category.color} ${segmentStart}deg ${financialSegmentStart}deg`;
        }).join(', ')})`
      : '';

    const resultMode = definition.resultMode || '';
    const rankedNeeds = resultMode === 'ranked-needs';
    const scoreTableOnly = resultMode === 'score-table-only';
    const roleRanges = resultMode === 'role-ranges';
    const scoresOnly = resultMode === 'scores-only' || rankedNeeds || scoreTableOnly || roleRanges;

    const sortedByScore = [...entries];
    const topThree = sortedByScore.slice(0, 3);
    const bottomThree = [...sortedByScore].reverse().slice(0, 3);
    const getRoleRangeLabel = (score) => {
      const range = definition.roleRanges?.find(item => score >= item.min && score <= item.max);
      return range?.label || '';
    };
    const primaryRoles = roleRanges
      ? entries.filter(([, score]) => getRoleRangeLabel(score).toLowerCase().includes('primary'))
      : [];
    const secondaryRoles = roleRanges
      ? entries.filter(([, score]) => getRoleRangeLabel(score).toLowerCase().includes('secondary'))
      : [];

    return (
      <div className={`${styles.cathResultContainer} ${embeddedInCoursePlayer ? styles.embeddedAssessmentResult : ''}`} id={enableResultScreenshot ? resultCaptureId : undefined}>
        {isEnergyAssessment ? (
          <header className={styles.energyResultHero}>
            <h2>Your Money Energy Profile</h2>
            <p>Your scores show how energy may be operating in your money decisions right now. They are not fixed traits. They are patterns you can notice and work with.</p>
          </header>
        ) : isFinancialFrequency ? (
          <header className={styles.financialResultHero}>
            <h2>Your Financial Frequency Profile</h2>
            <p>These results highlight the patterns that may be influencing your relationship with money right now. They are not fixed identities. They are invitations to understand what drives your choices and where you may want more freedom.</p>
          </header>
        ) : (
          <>
            <h2 className={styles.cathResultHeader}>Assessment Complete!</h2>
            <p className={styles.cathResultSubtitle}>
              {rankedNeeds ? 'Relational needs score breakdown' : (scoresOnly ? 'Score breakdown' : "Here's your energy profile breakdown")}
            </p>
          </>
        )}

        {roleRanges && (
          <RoleResultSummary
            primaryRoles={primaryRoles}
            secondaryRoles={secondaryRoles}
            categories={definition.categories}
          />
        )}

        <div className={scoresOnly ? `${styles.cathScoreOnlyList} ${isFinancialFrequency ? styles.financialFrequencyCards : ''}` : `${styles.cathCategoryCards} ${isEnergyAssessment ? styles.energyCategoryCards : ''}`}>
          {Object.entries(definition.categories).map(([key, cat]) => {
            const score = categoryScores[key] || 0;
            const maxPerCategory = (categoryQuestionCounts[key] || 0) * maxScaleValue;
            const percentage = maxPerCategory > 0 ? (score / maxPerCategory) * 100 : 0;
            const isDominant = key === dominantKey;
            const categoryColor = getCategoryColor(key);

            if (isFinancialFrequency) {
              const isFinancialDominant = key === highest[0];
              return (
                <article
                  key={key}
                  className={`${styles.financialFrequencyCard} ${isFinancialDominant ? styles.financialFrequencyCardDominant : ''}`}
                >
                  <h4>{cat.label}</h4>
                  <strong>{score}<small>/{maxPerCategory}</small></strong>
                  <div className={styles.financialFrequencyBar}>
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                  {isFinancialDominant && <div className={styles.financialDominantBadge}>Dominant</div>}
                </article>
              );
            }

            if (scoresOnly) {
              return (
                <div key={key} className={styles.cathScoreOnlyRow}>
                  <div className={styles.cathScoreOnlyLabelWrap}>
                    <div
                      className={styles.cathCategoryDot}
                      style={{ backgroundColor: categoryColor }}
                    ></div>
                    <h4 className={styles.cathCategoryLabel}>{cat.label}</h4>
                  </div>
                  <div className={styles.cathScoreOnlyBarWrap}>
                    <div className={styles.cathBarTrack}>
                      <div
                        className={styles.cathBarFill}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: categoryColor
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className={styles.cathScoreOnlyValue}>
                    <span style={{ color: categoryColor, fontWeight: 900 }}>{score}</span>
                    <span className={styles.cathScoreMax}>/ {maxPerCategory}</span>
                  </div>
                  {roleRanges && (
                    <div className={styles.cathScoreOnlyDominantBadge} style={{ backgroundColor: categoryColor }}>
                      {getRoleRangeLabel(score)}
                    </div>
                  )}
                  {isDominant && !scoreTableOnly && !roleRanges && (
                    <div className={styles.cathScoreOnlyDominantBadge} style={{ backgroundColor: categoryColor }}>
                      Dominant
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={key}
                className={`${styles.cathCategoryCard} ${isDominant ? styles.cathCategoryDominant : ''} ${isEnergyAssessment ? styles.energyCategoryCard : ''}`}
                style={{
                  borderColor: isDominant ? categoryColor : 'transparent',
                  '--cat-color': categoryColor
                }}
              >
                <div className={styles.cathCategoryHeader}>
                  <div
                    className={styles.cathCategoryDot}
                    style={{ backgroundColor: categoryColor }}
                  ></div>
                  <div>
                    <h4 className={styles.cathCategoryLabel}>{isEnergyAssessment ? energyPatternName(key) : cat.label}</h4>
                    {!isEnergyAssessment && <span className={styles.cathCategorySubtitle}>{cat.subtitle}</span>}
                  </div>
                </div>

                <div className={styles.cathScoreRow}>
                  <span className={styles.cathScoreValue} style={{ color: categoryColor }}>
                    {score}
                  </span>
                  <span className={styles.cathScoreMax}>/ {maxPerCategory}</span>
                </div>

                <div className={styles.cathBarTrack}>
                  <div
                    className={styles.cathBarFill}
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: categoryColor
                    }}
                  ></div>
                </div>

                <p className={styles.cathCategoryDesc}>{cat.description}</p>

                {isDominant && (
                  <div className={styles.cathDominantBadge} style={{ backgroundColor: categoryColor }}>
                    Dominant
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!scoresOnly && !isEnergyAssessment && (
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

        {isEnergyAssessment && (
          <section className={styles.energyBalanceSection}>
            <div className={styles.energyBalanceVisual}>
              <h3>Your energy balance</h3>
              <p>This visual shows the relative strength of each energy pattern in your current responses.</p>
              <div className={styles.energyDonutWrap}>
                <div className={styles.energyDonut} style={{ background: energyDonutGradient }}>
                  <div className={styles.energyDonutCenter}>
                    <strong>{isMixed ? 'Mixed energy pattern' : energyPatternName(highest[0])}</strong>
                    <span>{isMixed ? 'no single dominant pattern' : 'is most available'}</span>
                  </div>
                </div>
              </div>
              <div className={styles.energyLegend}>
                {Object.entries(definition.categories).map(([key]) => (
                  <span key={`energy-legend-${key}`}>
                    <i style={{ backgroundColor: getCategoryColor(key) }} />
                    {energyPatternName(key)}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.energyPatternSummary}>
              <h3>What your pattern may be showing</h3>
              {isMixed ? (
                <article className={styles.energyMixedSummary}>
                  <div className={styles.energyMixedDots} aria-hidden="true">
                    {entries
                      .filter(([, score]) => score === highest[1])
                      .map(([key]) => <i key={`mixed-dot-${key}`} style={{ backgroundColor: getCategoryColor(key) }} />)}
                  </div>
                  <div>
                    <h4>{definition.mixedResult.subtitle}</h4>
                    <p>{definition.mixedResult.interpretation}</p>
                  </div>
                </article>
              ) : (
                [highest, secondHighest].filter(Boolean).map(([key], index) => {
                  const category = definition.categories[key];
                  return (
                    <article key={`energy-summary-${key}`}>
                      <i style={{ backgroundColor: getCategoryColor(key) }} />
                      <div>
                        <h4>{energyPatternName(key)} {index === 0 ? 'is your strongest pattern.' : 'is your second-highest pattern.'}</h4>
                        <p>{category.interpretation}</p>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}

        {isFinancialFrequency && (
          <section className={styles.financialPatternSection}>
            <div className={styles.financialPatternVisual}>
              <h3>Your pattern at a glance</h3>
              <p>Each segment represents one financial-frequency pattern. Larger segments reflect stronger scores.</p>
              <div className={styles.financialDonutWrap}>
                <div className={styles.financialDonut} style={{ background: financialDonutGradient }}>
                  <div className={styles.financialDonutCenter}>
                    <strong>{definition.categories[highest[0]]?.label}</strong>
                    <span>strongest pattern</span>
                  </div>
                </div>
              </div>
              <div className={styles.financialLegend}>
                {Object.entries(definition.categories).map(([key, category]) => (
                  <span key={`financial-legend-${key}`}>
                    <i style={{ backgroundColor: category.color }} />
                    {category.label}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.financialTopPatterns}>
              <h3>Your strongest patterns</h3>
              {topThree.map(([key, score], index) => (
                <article key={`financial-top-${key}`}>
                  <span>{index + 1}</span>
                  <div>
                    <h4>{definition.categories[key]?.label}</h4>
                    <small>{score}/{(categoryQuestionCounts[key] || 0) * maxScaleValue}</small>
                    <p>Interpretation for this financial-frequency pattern will be added here.</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {scoresOnly && !scoreTableOnly && !roleRanges && !isFinancialFrequency && (
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

        {roleRanges && (
          <>
            <section className={styles.cathRoleScoreGuide}>
              <h3>How scores are read</h3>
              <div className={styles.cathRoleScoreGuideList}>
                <article>
                  <h4>0–6: Not a prominent role</h4>
                  <p>You may recognize this pattern occasionally, but it is not a dominant response for you.</p>
                </article>
                <article>
                  <h4>7–12: Secondary role</h4>
                  <p>You may move into this role in particular situations or relationships.</p>
                </article>
                <article>
                  <h4>13–20: Primary role</h4>
                  <p>This may be the role you adopt most readily when you feel pressure, conflict, or responsibility.</p>
                </article>
              </div>
            </section>

            <section className={styles.cathRoleInterpretationPlaceholder}>
              <h3>What your results may be showing</h3>
              <p><strong>Your prominent role:</strong> Interpretation will be added here.</p>
              <p><strong>Your secondary role:</strong> Interpretation will be added here.</p>
            </section>

          </>
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

  return (
    <div className={`${styles.container} ${embeddedInCoursePlayer ? styles.embeddedAssessmentContainer : ''} ${isDramaTriangle ? styles.dramaQuestionContainer : ''} ${definition.externalOnly ? styles.externalQuestionContainer : ''}`}>
      <div className={styles.header}>
        <div className={styles.progressInfo}>
          <span className={styles.progressPercentage}>{currentIndex + 1} / {totalQuestions}</span>
        </div>
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress}%`, backgroundColor: 'var(--color-dark-blue)' }}
          ></div>
        </div>
      </div>

      <div key={`question-${currentQuestion.id}`} className={`${styles.questionSection} ${styles.questionTransition}`}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div key={`answers-${currentQuestion.id}`} className={`${styles.optionsSection} ${styles.questionTransition} ${styles.answerTransition}`}>
        {!isDramaTriangle && !usesLabeledFivePointScale && (
          Array.isArray(definition.scale?.legend) && definition.scale.legend.length > 0 ? (
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
          )
        )}
        <div className={`${styles.scaleButtons} ${isDramaTriangle ? styles.dramaScaleButtons : ''} ${usesLabeledFivePointScale ? styles.energyScaleButtons : ''}`}>
          {scaleValues.map((val) => {
            const optionLabel = definition.scale?.legend?.find((item) => item.value === val)?.label;

            return (
              <button
                key={val}
                onClick={() => handleSelect(val)}
                disabled={isSubmitting || isAdvancing}
                className={`${styles.scaleBtn} ${isDramaTriangle ? styles.dramaScaleBtn : ''} ${usesLabeledFivePointScale ? styles.energyScaleBtn : ''} ${answers[currentQuestion.id] === val ? styles.scaleBtnSelected : ''}`}
              >
                {isDramaTriangle || usesLabeledFivePointScale ? (
                  <>
                    <strong>{val}</strong>
                    <span>{optionLabel}</span>
                  </>
                ) : val}
              </button>
            );
          })}
        </div>
      </div>

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
