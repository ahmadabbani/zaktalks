'use client'

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FaChevronLeft, FaRedo } from 'react-icons/fa';
import ResultScreenshotButton from '@/components/ResultScreenshotButton';
import useDelayedAnswerAdvance from './useDelayedAnswerAdvance';
import styles from './assessment.module.css';

const MAX_GROUP_SCORE = 24;
const MEANINGFUL_SCORE_GAP = 3;

function buildStrokeInterpretations(totals) {
  const score = (key) => Number(totals[key]) || 0;
  const average = (...values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const formatScore = (value) => Number.isInteger(value) ? value : value.toFixed(1);
  const giving = average(
    score('giving_positive_strokes'),
    score('giving_negative_strokes')
  );
  const taking = average(
    score('taking_positive_strokes'),
    score('taking_negative_strokes')
  );
  const interpretations = [];

  if (giving - taking >= MEANINGFUL_SCORE_GAP) {
    interpretations.push({
      tone: 'positive',
      title: 'I recognize everyone else, but I struggle to let recognition come back to me.',
      evidence: `Your giving scores average ${formatScore(giving)}/24, compared with ${formatScore(taking)}/24 across your taking scores.`,
      text: 'Giving recognition may feel more available than receiving it. Notice what happens when you become the recipient.'
    });
  }

  if (score('asking_for_attention') - score('asking_for_positive_strokes') >= MEANINGFUL_SCORE_GAP) {
    interpretations.push({
      tone: 'negative',
      title: 'I want recognition, but I expect people to know that without me asking.',
      evidence: `Your asking-for-attention score is ${score('asking_for_attention')}/24, compared with ${score('asking_for_positive_strokes')}/24 for asking directly for positive strokes.`,
      text: 'Unspoken needs can create disappointment. Experiment with asking clearly instead of relying on hints.'
    });
  }

  if (score('taking_negative_strokes') - score('taking_positive_strokes') >= MEANINGFUL_SCORE_GAP) {
    interpretations.push({
      tone: 'negative',
      title: 'Criticism enters easily; appreciation does not.',
      evidence: `Your taking-negative-strokes score is ${score('taking_negative_strokes')}/24, compared with ${score('taking_positive_strokes')}/24 for taking positive strokes.`,
      text: 'Negative feedback may carry more weight than positive recognition. Notice whether appreciation is being filtered out.'
    });
  }

  if (score('giving_positive_strokes') - score('giving_negative_strokes') >= MEANINGFUL_SCORE_GAP) {
    interpretations.push({
      tone: 'positive',
      title: "I can appreciate you, but I struggle to tell you when something is not OK.",
      evidence: `Your giving-positive-strokes score is ${score('giving_positive_strokes')}/24, compared with ${score('giving_negative_strokes')}/24 for giving negative strokes.`,
      text: 'Warmth may come easily while disagreement and boundaries are harder to express directly.'
    });
  }

  if (score('giving_negative_strokes') - score('giving_positive_strokes') >= MEANINGFUL_SCORE_GAP) {
    interpretations.push({
      tone: 'negative',
      title: 'I notice what needs correcting more easily than what deserves appreciation.',
      evidence: `Your giving-negative-strokes score is ${score('giving_negative_strokes')}/24, compared with ${score('giving_positive_strokes')}/24 for giving positive strokes.`,
      text: 'Standards and accountability may be strong while positive recognition receives less attention.'
    });
  }

  if (!interpretations.length) {
    interpretations.push({
      tone: 'positive',
      title: 'No single contrast strongly defines your profile.',
      text: 'Balance is not about perfect scores. Notice where you have the freedom to give, receive, ask for, or refuse recognition, and where your response feels automatic.'
    });
  }

  return interpretations;
}

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

function ProfileScale({ side }) {
  const positiveTicks = [24, 20, 16, 12, 8, 4];
  const negativeTicks = [4, 8, 12, 16, 20, 24];

  return (
    <div className={`${styles.strokeReferenceScale} ${side === 'right' ? styles.strokeReferenceScaleRight : ''}`} aria-hidden="true">
      <span className={styles.strokeScaleNumberSpacer}></span>
      <div className={styles.strokeScaleHalf}>
        {positiveTicks.map((value) => (
          <span key={`positive-${side}-${value}`} style={{ top: `${((24 - value) / 24) * 100}%` }}>{value}</span>
        ))}
      </div>
      <span className={styles.strokeScaleCenterSpacer}></span>
      <div className={styles.strokeScaleHalf}>
        {negativeTicks.map((value) => (
          <span key={`negative-${side}-${value}`} style={{ top: `${(value / 24) * 100}%` }}>{value}</span>
        ))}
      </div>
      <span className={styles.strokeScaleNumberSpacer}></span>
    </div>
  );
}

function ProfilePair({ positiveGroup, negativeGroup, positiveScore, negativeScore }) {
  const positiveHeight = Math.max(0, Math.min(100, (positiveScore / MAX_GROUP_SCORE) * 100));
  const negativeHeight = Math.max(0, Math.min(100, (negativeScore / MAX_GROUP_SCORE) * 100));

  return (
    <div className={styles.strokeProfilePair}>
      <div className={styles.strokePairNumber}>({positiveGroup.number})</div>
      <div className={styles.strokeReferenceTrack} aria-label={`${positiveGroup.title}: ${positiveScore} out of 24`}>
        <div className={`${styles.strokeReferenceFill} ${styles.strokeReferenceFillPositive}`} style={{ height: `${positiveHeight}%` }}></div>
        <span className={styles.strokePositiveScoreMarker} style={{ bottom: `${Math.min(96, Math.max(4, positiveHeight))}%` }}>{positiveScore}</span>
      </div>
      <div className={styles.strokePairLabel}>{positiveGroup.profileLabel}</div>
      <div className={styles.strokeReferenceTrack} aria-label={`${negativeGroup.title}: ${negativeScore} out of 24`}>
        <div className={`${styles.strokeReferenceFill} ${styles.strokeReferenceFillNegative}`} style={{ height: `${negativeHeight}%` }}></div>
        <span className={styles.strokeNegativeScoreMarker} style={{ top: `${Math.min(96, Math.max(4, negativeHeight))}%` }}>{negativeScore}</span>
      </div>
      <div className={styles.strokePairNumber}>({negativeGroup.number})</div>
    </div>
  );
}

export default function StrokeProfileEngine({ definition, onComplete, embeddedInCoursePlayer = false, enableResultScreenshot = false, resultCaptureId = 'assessment-result-capture', resultDownloadFormat = 'png' }) {
  const questions = useMemo(() => buildQuestions(definition.groups), [definition.groups]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isAdvancing, advanceAfterFeedback } = useDelayedAnswerAdvance();

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const progress = (currentIndex / totalQuestions) * 100;
  const scaleValues = definition.scale?.values || [0, 1, 2, 3, 4, 5, 6];
  const totalPossible = definition.groups.length * MAX_GROUP_SCORE;
  const currentGroupTitle = currentQuestion.groupTitle.replace(/^Total\s*-\s*/i, '');

  const handleSelect = (value) => {
    if (isSubmitting || isAdvancing) return;

    const nextAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(nextAnswers);

    advanceAfterFeedback(() => {
      if (currentIndex < totalQuestions - 1) {
        setCurrentIndex((index) => index + 1);
        return;
      }

      calculateResult(nextAnswers);
    });
  };

  const calculateResult = async (submittedAnswers) => {
    const totals = calculateTotals(definition.groups, submittedAnswers);
    const scoreSum = Object.values(totals).reduce((sum, value) => sum + value, 0);
    const normalizedScore = totalPossible > 0 ? Math.round((scoreSum / totalPossible) * 100) : 0;

    setIsSubmitting(true);
    try {
      if (onComplete) {
        await onComplete({ score: normalizedScore, answers: submittedAnswers });
      }
      setShowResult(true);
    } catch {
      toast.error('Your result could not be saved. Please try again.');
    } finally {
      setIsSubmitting(false);
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
    const interpretations = buildStrokeInterpretations(totals);
    const positiveGroups = definition.groups.filter((group) => group.polarity === 'positive');
    const negativeGroups = definition.groups.filter((group) => group.polarity === 'negative');
    const profilePairs = positiveGroups.map((positiveGroup, index) => ({
      positiveGroup,
      negativeGroup: negativeGroups[index]
    })).filter((pair) => pair.negativeGroup);

    return (
      <div className={`${styles.strokeResultContainer} ${embeddedInCoursePlayer ? styles.embeddedAssessmentResult : ''}`} id={enableResultScreenshot ? resultCaptureId : undefined}>
        <div className={styles.strokeResultHero}>
          <h2>Your Stroke Profile</h2>
          <p>This visual profile brings together your results across the eight stroke patterns. The filled areas show your total score in each category, from 0 to 24.</p>
        </div>

        <div className={styles.strokeGraphIntro}>
          <h3>Your pattern at a glance</h3>
          <p>Positive strokes appear above the center line. Negative strokes appear below it.</p>
        </div>

        <div className={styles.strokeResultOverview}>
          <div className={styles.strokeReferenceViewport}>
            <div className={styles.strokeReferenceChart} role="img" aria-label="Stroke profile with positive scores above the center and negative scores below it">
              <h3 className={styles.strokeReferenceTitle}>POSITIVE STROKES</h3>
              <div className={styles.strokeReferenceBody}>
                <ProfileScale side="left" />
                <div className={styles.strokePairGrid}>
                  {profilePairs.map(({ positiveGroup, negativeGroup }) => (
                    <ProfilePair
                      key={`${positiveGroup.id}-${negativeGroup.id}`}
                      positiveGroup={positiveGroup}
                      negativeGroup={negativeGroup}
                      positiveScore={totals[positiveGroup.id] || 0}
                      negativeScore={totals[negativeGroup.id] || 0}
                    />
                  ))}
                  <span className={`${styles.strokeAxisWord} ${styles.strokeAxisWordPositive}`} aria-hidden="true">STROKES</span>
                  <span className={`${styles.strokeAxisWord} ${styles.strokeAxisWordNegative}`} aria-hidden="true">ATTENTION</span>
                </div>
                <ProfileScale side="right" />
              </div>
              <h3 className={styles.strokeReferenceTitle}>NEGATIVE STROKES</h3>
            </div>
          </div>

          <div className={styles.strokeTotalsList}>
            {definition.groups.map((group) => (
              <div key={group.id} className={`${styles.strokeTotalRow} ${group.polarity === 'positive' ? styles.strokeTotalRowPositive : styles.strokeTotalRowNegative}`}>
                <span><i aria-hidden="true"></i>{group.title.replace(/^Total\s*-\s*/i, '')}</span>
                <strong>{totals[group.id] || 0}/24</strong>
              </div>
            ))}
          </div>
        </div>

        <section className={styles.strokeInterpretation}>
          <h3>What your profile may be showing</h3>
          <div className={styles.strokeInterpretationList}>
            {interpretations.map((interpretation) => (
              <article
                key={interpretation.title}
                className={interpretation.tone === 'negative'
                  ? styles.strokeInterpretationNegative
                  : styles.strokeInterpretationPositive}
              >
                <h4>{interpretation.title}</h4>
                {interpretation.evidence && (
                  <p className={styles.strokeInterpretationEvidence}>{interpretation.evidence}</p>
                )}
                <p>{interpretation.text}</p>
              </article>
            ))}
          </div>
          <p className={styles.strokeInterpretationClosing}>The goal is awareness, flexibility, and choice.</p>
        </section>

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
    <div className={`${styles.container} ${embeddedInCoursePlayer ? styles.embeddedAssessmentContainer : ''} ${styles.strokeQuestionContainer} ${definition.externalOnly ? styles.externalQuestionContainer : ''}`}>
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

      <div key={`meta-${currentQuestion.id}`} className={`${styles.strokeQuestionMeta} ${styles.questionTransition}`}>
        <span className={styles.strokeQuestionGroupNumber}>Section {currentQuestion.groupNumber} of {definition.groups.length}</span>
        <strong>{currentGroupTitle}</strong>
      </div>

      <div key={`question-${currentQuestion.id}`} className={`${styles.questionSection} ${styles.strokeQuestionSection} ${styles.questionTransition}`}>
        <h3 className={styles.questionText}>{currentQuestion.text}</h3>
      </div>

      <div key={`answers-${currentQuestion.id}`} className={`${styles.optionsSection} ${styles.strokeOptionsSection} ${styles.questionTransition} ${styles.answerTransition}`}>
        <div className={`${styles.scaleButtons} ${styles.strokeScaleButtons}`}>
          {scaleValues.map((value) => {
            const scaleOptions = definition.scaleLegend || definition.scale.legend;
            const scaleOption = scaleOptions.find((item) => item.value === value);
            const label = scaleOption?.label
              ? `${scaleOption.label.charAt(0)}${scaleOption.label.slice(1).toLowerCase()}`
              : String(value);

            return (
              <button
                key={value}
                onClick={() => handleSelect(value)}
                disabled={isSubmitting || isAdvancing}
                className={`${styles.scaleBtn} ${styles.strokeScaleBtn} ${answers[currentQuestion.id] === value ? styles.scaleBtnSelected : ''}`}
              >
                {definition.externalOnly ? (
                  <>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </>
                ) : `${value} – ${label}`}
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
