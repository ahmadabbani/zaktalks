'use client'

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronDown, FaChevronLeft, FaRedo } from 'react-icons/fa';
import ResultScreenshotButton from '@/components/ResultScreenshotButton';
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance';
import styles from './assessment.module.css';

const DRAMA_ROLE_INTERPRETATIONS = {
  rescuer: 'You may feel responsible for solving problems, easing discomfort, or carrying more than is yours. Helping can be generous, but it becomes costly when you take over another person’s responsibility or leave no room for your own needs.',
  victim: 'When your efforts are not recognized or situations feel beyond your control, you may sometimes feel stuck, overlooked, or unable to change what is happening. The support you need may then be harder to ask for directly.',
  persecutor: 'You may judge, blame, criticize, or try to control when something feels wrong. A legitimate need for change or a clearer boundary can get lost when it comes through as blame.'
};

const DRAMA_WINNER_TRIANGLE = [
  {
    role: 'Victim',
    alternative: 'Vulnerable',
    action: 'Ask for support while recognizing your choices.',
    example: 'I’m overwhelmed. Can you listen?'
  },
  {
    role: 'Rescuer',
    alternative: 'Caring',
    action: 'Offer help without taking over.',
    example: 'Would you like support, or would you prefer to think this through yourself?'
  },
  {
    role: 'Persecutor',
    alternative: 'Assertive',
    action: 'Set a clear boundary without blame.',
    example: 'This doesn’t work for me. Let’s find another way.'
  }
];

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

function DramaTriangleVisual({ categoryScores, primaryRoles, secondaryRoles, categories }) {
  const primaryKeys = new Set(primaryRoles.map(([key]) => key));
  const secondaryKeys = new Set(secondaryRoles.map(([key]) => key));
  const roles = [
    { key: 'persecutor', positionClass: styles.dramaTrianglePersecutor },
    { key: 'rescuer', positionClass: styles.dramaTriangleRescuer },
    { key: 'victim', positionClass: styles.dramaTriangleVictim }
  ];

  return (
    <div className={styles.dramaTriangleVisual} aria-label="Your Drama Triangle scores">
      <svg className={styles.dramaTriangleArrows} viewBox="0 0 420 340" aria-hidden="true">
        <defs>
          <marker id="drama-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        <path d="M 118 92 L 302 92" />
        <path d="M 310 112 L 225 265" />
        <path d="M 195 265 L 110 112" />
      </svg>

      {roles.map(({ key, positionClass }) => {
        const isPrimary = primaryKeys.has(key);
        const isSecondary = secondaryKeys.has(key);
        return (
          <div key={key} className={`${styles.dramaTriangleRole} ${positionClass}`}>
            <strong>{categories[key]?.label || key}</strong>
            <span>{categoryScores[key] || 0}/20</span>
            {(isPrimary || isSecondary) && (
              <small className={isPrimary ? styles.dramaRolePrimaryBadge : styles.dramaRoleSecondaryBadge}>
                {isPrimary ? 'Prominent' : 'Secondary'}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}

function RelationalNeedDisclosure({ category, score, interpretation, initiallyOpen = false }) {
  return (
    <li>
      <details className={styles.relationalNeedDisclosure} open={initiallyOpen}>
        <summary>
          <span>{category.label}</span>
          <strong>{score}/25</strong>
          <FaChevronDown aria-hidden="true" />
        </summary>
        <div className={styles.relationalNeedDisclosureBody}>
          <p>{interpretation}</p>
          <p><b>Possible reasons to reflect on:</b> {category.possibleReasons.join('; ')}.</p>
        </div>
      </details>
    </li>
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
  const isEgoStateAssessment = definition.id === 'transactional-analysis-personal-style-questionnaire-v1';
  const isRelationalNeeds = embeddedInCoursePlayer && definition.id === 'relation-needs-v1';
  const usesLabeledScale = isEnergyAssessment || isFinancialFrequency || isEgoStateAssessment || isRelationalNeeds;
  const usesHorizontalScale = usesLabeledScale;

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
      <div className={`${styles.cathResultContainer} ${roleRanges ? styles.dramaResultContainer : ''} ${embeddedInCoursePlayer ? styles.embeddedAssessmentResult : ''}`} id={enableResultScreenshot ? resultCaptureId : undefined}>
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
        ) : isEgoStateAssessment ? (
          <header className={styles.egoStyleResultHero}>
            <h2>Your Ego-State Personal Style Profile</h2>
            <p>These results show the relative strength of five styles in your responses. A high score is not “better,” and a low score is not “worse.” Each style can be useful; the key is having choice over when and how you use it.</p>
          </header>
        ) : roleRanges ? (
          <header className={styles.dramaResultHero}>
            <h2>Your Drama Triangle pattern</h2>
            <p>These scores reflect the roles you may be most likely to move into under stress. They are not labels. Use them as information about what you may need to notice, question, or choose differently.</p>
          </header>
        ) : rankedNeeds ? (
          <header className={styles.relationalNeedsResultHero}>
            <h2>Your Relational Needs Profile</h2>
            <p>These results show which relational needs feel most important to you right now. Higher and lower scores are not good or bad. They offer a starting point for understanding what helps you feel connected, supported, and valued.</p>
          </header>
        ) : (
          <>
            <h2 className={styles.cathResultHeader}>Assessment Complete!</h2>
            <p className={styles.cathResultSubtitle}>
              {rankedNeeds ? 'Relational needs score breakdown' : (scoresOnly ? 'Score breakdown' : "Here's your energy profile breakdown")}
            </p>
          </>
        )}

        {rankedNeeds && (
          <section className={styles.relationalNeedsTopNeed}>
            <div>
              <span>Your highest relational need</span>
              <h3>
                {dominantKey
                  ? definition.categories[dominantKey].label
                  : 'Mixed Top Needs'}
              </h3>
              <p>{dominantKey
                ? definition.categories[dominantKey].highScoreMeaning
                : 'Several needs share your highest score. Explore the highest-ranked needs below to see what each may mean for you.'}</p>
            </div>
            <strong>
              {highest?.[1] || 0}
              <small>/25</small>
            </strong>
          </section>
        )}

        {roleRanges && (
          <section className={styles.dramaResultOverview}>
            <DramaTriangleVisual
              categoryScores={categoryScores}
              primaryRoles={primaryRoles}
              secondaryRoles={secondaryRoles}
              categories={definition.categories}
            />

            <div className={styles.dramaScorePanel}>
              <div className={styles.cathRoleScoreGuide}>
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
              </div>

            </div>

            <div className={styles.dramaScoreList}>
              {entries.map(([key, score]) => {
                const category = definition.categories[key];
                const rangeLabel = getRoleRangeLabel(score);
                const isPrimaryRole = primaryRoles.some(([roleKey]) => roleKey === key);
                const isSecondaryRole = secondaryRoles.some(([roleKey]) => roleKey === key);
                const status = isPrimaryRole ? 'Primary Role' : isSecondaryRole ? 'Secondary Role' : '';
                const description = status
                  ? rangeLabel.replace(/\s*\((Primary|Secondary) Role\)\s*$/, '')
                  : rangeLabel;

                return (
                  <article key={`drama-score-${key}`}>
                    <div>
                      <h4>{category.label}</h4>
                      <strong>{score}<small>/20</small></strong>
                    </div>
                    <p>
                      {description}
                      {status && (
                        <> <strong className={isPrimaryRole ? styles.dramaPrimaryStatus : styles.dramaSecondaryStatus}>({status})</strong></>
                      )}
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!roleRanges && (
        <div className={scoresOnly ? `${styles.cathScoreOnlyList} ${isFinancialFrequency ? styles.financialFrequencyCards : ''} ${isEgoStateAssessment ? styles.egoStyleScoreCards : ''} ${rankedNeeds ? styles.relationalNeedsScoreGrid : ''}` : `${styles.cathCategoryCards} ${isEnergyAssessment ? styles.energyCategoryCards : ''}`}>
          {(rankedNeeds ? entries : Object.entries(definition.categories)).map(([key, rankedScore]) => {
            const cat = definition.categories[key];
            const score = categoryScores[key] || 0;
            const maxPerCategory = (categoryQuestionCounts[key] || 0) * maxScaleValue;
            const percentage = maxPerCategory > 0 ? (score / maxPerCategory) * 100 : 0;
            const isDominant = key === dominantKey;
            const categoryColor = getCategoryColor(key);

            if (rankedNeeds) {
              const rank = entries.findIndex(([entryKey]) => entryKey === key) + 1;
              return (
                <article
                  key={key}
                  className={`${styles.relationalNeedScoreCard} ${rank === 1 ? styles.relationalNeedScoreCardFirst : ''}`}
                >
                  <div className={styles.relationalNeedScoreHeading}>
                    <span>{rank}</span>
                    <h4>{cat.label}</h4>
                    <strong>{rankedScore}<small>/{maxPerCategory}</small></strong>
                  </div>
                  <div
                    className={styles.relationalNeedScoreTrack}
                    role="img"
                    aria-label={`${cat.label}: ${rankedScore} out of ${maxPerCategory}`}
                  >
                    <span style={{ width: `${percentage}%` }} />
                  </div>
                </article>
              );
            }

            if (isEgoStateAssessment) {
              const isStrongestStyle = key === highest[0];
              return (
                <article
                  key={key}
                  className={`${styles.egoStyleScoreCard} ${isStrongestStyle ? styles.egoStyleScoreCardStrongest : ''}`}
                >
                  <h4>{cat.label}</h4>
                  <strong>{score}<small>/{maxPerCategory}</small></strong>
                  {isStrongestStyle && <div className={styles.egoStyleStrongestBadge}>Strongest Style</div>}
                </article>
              );
            }

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
        )}

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
                    <p>
                      {definition.categories[key]?.interpretationLead}{' '}
                      <strong>{definition.categories[key]?.interpretationEmphasis}</strong>.{' '}
                      {definition.categories[key]?.interpretationDetail}
                    </p>
                    <p><strong>Healthy expression:</strong> {definition.categories[key]?.healthyExpression}</p>
                    <p><strong>Overused expression:</strong> {definition.categories[key]?.overusedExpression}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {isFinancialFrequency && definition.bringingItTogether && (
          <section className={styles.financialBringingTogether}>
            <h3>Bringing It Together</h3>
            <p>
              <strong>{definition.bringingItTogether.openingEmphasis}</strong>{' '}
              {definition.bringingItTogether.openingText}
            </p>
            <p>
              {definition.bringingItTogether.goalPrefix}{' '}
              <strong>{definition.bringingItTogether.goalEmphasis}</strong>,{' '}
              {definition.bringingItTogether.goalText}
            </p>
            <p><strong>{definition.bringingItTogether.closingEmphasis}</strong></p>
          </section>
        )}

        {isEgoStateAssessment && (
          <section className={styles.egoStyleProfileSection}>
            <div className={styles.egoStyleProfileVisual}>
              <h3>Your personal-style profile</h3>
              <p>Total score by ego-state style, based on eight mapped statements per category.</p>
              <div className={styles.egoStyleChart} aria-label="Your ego-state personal-style scores">
                {entries.map(([key, score]) => {
                  const category = definition.categories[key];
                  const maxScore = (categoryQuestionCounts[key] || 0) * maxScaleValue;
                  const height = maxScore > 0
                    ? Math.max(0, Math.min(100, (score / maxScore) * 100))
                    : 0;
                  const isStrongestStyle = key === highest[0];

                  return (
                    <div key={`ego-style-chart-${key}`} className={styles.egoStyleChartColumn}>
                      <div className={styles.egoStyleChartTrack}>
                        <span
                          className={isStrongestStyle ? styles.egoStyleChartBarStrongest : ''}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <strong>{category?.label}</strong>
                      <small>{score}/{maxScore}</small>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.egoStyleTopStyles}>
              <h3>Your strongest styles</h3>
              {topThree.map(([key, score], index) => {
                const category = definition.categories[key];
                const maxScore = (categoryQuestionCounts[key] || 0) * maxScaleValue;
                const rankingLabel = index === 0
                  ? 'your strongest available style.'
                  : index === 1
                    ? 'a strong supporting style.'
                    : 'a meaningful source of energy.';

                return (
                  <article key={`ego-style-top-${key}`}>
                    <span>{index + 1}</span>
                    <div>
                      <details className={styles.egoStyleInterpretationDisclosure} open={index === 0}>
                        <summary>
                          <span>
                            <h4>{category?.label}: <strong>{rankingLabel}</strong></h4>
                            <small>{score}/{maxScore}</small>
                          </span>
                        </summary>
                        <div className={styles.egoStyleInterpretation}>
                          {(category?.highScoreInterpretation || []).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                          ))}
                          {category?.awarenessQuestion && (
                            <p className={styles.egoStyleAwarenessQuestion}>
                              <strong>Awareness question:</strong> {category.awarenessQuestion}
                            </p>
                          )}
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {scoresOnly && !scoreTableOnly && !roleRanges && !isFinancialFrequency && !rankedNeeds && (
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
                {topThree.map(([key, score], index) => (
                  <RelationalNeedDisclosure
                    key={`top-${key}`}
                    category={definition.categories[key]}
                    score={score}
                    interpretation={definition.categories[key].highScoreMeaning}
                    initiallyOpen={index === 0}
                  />
                ))}
              </ul>
            </div>
            <div className={styles.cathNeedSummaryCard}>
              <h4>Top 3 Lowest Totals</h4>
              <ul>
                {bottomThree.map(([key, score]) => (
                  <RelationalNeedDisclosure
                    key={`bottom-${key}`}
                    category={definition.categories[key]}
                    score={score}
                    interpretation={definition.categories[key].lowScoreMeaning}
                  />
                ))}
              </ul>
            </div>
          </div>
        )}

        {rankedNeeds && (
          <section className={styles.relationalNeedsReadingGuide} aria-labelledby="relational-needs-reading-guide">
            <h3 id="relational-needs-reading-guide">How to read your scores</h3>
            <div>
              <article>
                <h4>High scores</h4>
                <p>High scores indicate relational needs that are especially important to your emotional well-being. When these needs are met, you are more likely to feel secure, valued, and connected. When they are unmet, they may become a source of stress, disappointment, or relational conflict.</p>
              </article>
              <article>
                <h4>Low scores</h4>
                <p>Low scores suggest that these needs may be less central to your sense of well-being, may already be consistently satisfied, or may have become less consciously important over time. In some cases, low scores can also reflect a tendency toward independence or emotional self-protection due to past experiences.</p>
              </article>
              <article>
                <h4>Possible reasons</h4>
                <p>Possible reasons provide examples of life experiences, personality traits, or relational patterns that may contribute to your scores. These are intended to encourage reflection and conversation rather than provide definitive explanations.</p>
              </article>
            </div>
          </section>
        )}

        {roleRanges && (
          <section className={styles.cathRoleInterpretationPlaceholder}>
            <h3>What your results may be showing</h3>

            <div className={styles.dramaInterpretationGroup}>
              {primaryRoles.length ? primaryRoles.map(([key]) => (
                <article key={`primary-interpretation-${key}`}>
                  <h4>Your prominent role: <strong>{definition.categories[key]?.label || key}</strong></h4>
                  <p>{DRAMA_ROLE_INTERPRETATIONS[key]}</p>
                </article>
              )) : (
                <article>
                  <h4>No prominent role reached the primary range.</h4>
                  <p>Your scores do not currently show one role as a strong primary response.</p>
                </article>
              )}
            </div>

            <div className={styles.dramaInterpretationGroup}>
              {secondaryRoles.length ? secondaryRoles.map(([key]) => (
                <article key={`secondary-interpretation-${key}`}>
                  <h4>Your secondary role: <strong>{definition.categories[key]?.label || key}</strong></h4>
                  <p>{DRAMA_ROLE_INTERPRETATIONS[key]}</p>
                </article>
              )) : (
                <article>
                  <h4>No secondary role reached the secondary range.</h4>
                  <p>No additional role currently falls within the assessment’s secondary range.</p>
                </article>
              )}
            </div>

            <div className={styles.dramaChoiceSection}>
              <h4>The Winner&apos;s Triangle: from drama to choice</h4>
              <p>These are roles, not personalities, and you can move between them quickly. When a need is expressed indirectly, support can become taking over, or a boundary can come out as blame.</p>
              <div className={styles.dramaChoiceGrid}>
                {DRAMA_WINNER_TRIANGLE.map(({ role, alternative, action, example }) => (
                  <article key={role}>
                    <h5>{role} <span aria-hidden="true">→</span> {alternative}</h5>
                    <p>{action}</p>
                    <blockquote>“{example}”</blockquote>
                  </article>
                ))}
              </div>
              <p className={styles.dramaChoiceReflection}>The aim is Adult-to-Adult communication, where both people are respected as capable. Ask yourself: <strong>What is the most responsible response available to me now?</strong></p>
            </div>
          </section>
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
        {!isDramaTriangle && !usesLabeledScale && (
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
        <div className={`${styles.scaleButtons} ${isDramaTriangle ? styles.dramaScaleButtons : ''} ${usesHorizontalScale ? styles.energyScaleButtons : ''}`}>
          {scaleValues.map((val) => {
            const optionLabel = definition.scale?.legend?.find((item) => item.value === val)?.label;

            return (
              <button
                key={val}
                onClick={() => handleSelect(val)}
                disabled={isSubmitting || isAdvancing}
                className={`${styles.scaleBtn} ${isDramaTriangle ? styles.dramaScaleBtn : ''} ${usesHorizontalScale ? styles.energyScaleBtn : ''} ${answers[currentQuestion.id] === val ? styles.scaleBtnSelected : ''}`}
              >
                {isDramaTriangle || usesLabeledScale ? (
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
