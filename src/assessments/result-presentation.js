import { getAssessmentById } from './registry'

function number(value) {
  return Number(value || 0)
}

/**
 * Turns a stored assessment attempt into the complete, human-readable result.
 * This is shared by the admin and learner dashboards so result meaning cannot
 * drift between the two views.
 */
export function getAssessmentResult(attempt, assessmentKey, options = {}) {
  const audience = options.audience || 'admin'
  const definition = getAssessmentById(assessmentKey)
  const breakdown = Array.isArray(attempt?.score_details?.breakdown) ? attempt.score_details.breakdown : []
  const total = `${number(attempt?.score_value)} of ${number(attempt?.score_max)} points`

  if (!definition) {
    return { mode: 'points', title: attempt?.result_label || 'Recorded result', subtitle: total, breakdown }
  }

  if (definition.resultMode === 'role-ranges' && breakdown.length) {
    const roles = breakdown.map((item) => {
      const range = definition.roleRanges?.find((entry) => number(item.score) >= entry.min && number(item.score) <= entry.max)
      return { ...item, meaning: range?.label || '' }
    })
    return {
      mode: 'roles',
      title: 'Score breakdown',
      subtitle: total,
      breakdown: roles,
      primary: roles.filter((item) => item.meaning.toLowerCase().includes('primary')),
      secondary: roles.filter((item) => item.meaning.toLowerCase().includes('secondary')),
    }
  }

  if (definition.resultMode === 'ranked-needs' && breakdown.length) {
    const ranked = [...breakdown].sort((left, right) => number(right.score) - number(left.score))
    const topCategory = Object.values(definition.categories || {}).find((item) => item.label === ranked[0]?.label)
    const tiedTop = ranked.length > 1 && number(ranked[0]?.score) === number(ranked[1]?.score)
    const topNeed = tiedTop ? 'Mixed Top Needs' : ranked[0]?.label || 'Not available'
    return {
      mode: 'ranked',
      title: 'Relational needs score breakdown',
      subtitle: total,
      breakdown,
      highest: ranked.slice(0, 3),
      lowest: [...ranked].reverse().slice(0, 3),
      conclusion: {
        label: 'Top Need',
        value: topNeed,
        description: tiedTop ? definition.mixedResult?.subtitle : topCategory?.description,
      },
    }
  }

  if (breakdown.length) {
    const detailedBreakdown = breakdown.map((item) => {
      const category = definition.categories?.[item.key]
      return {
        ...item,
        meaning: category?.description || category?.subtitle || '',
      }
    })
    const ranked = [...detailedBreakdown].sort((left, right) => number(right.score) - number(left.score))
    const top = ranked[0]
    const category = definition.categories?.[top?.key]
      || Object.values(definition.categories || {}).find((item) => item.label === top?.label)
    const tiedTop = ranked.length > 1 && number(ranked[0]?.score) === number(ranked[1]?.score)
    const isScoreTable = definition.resultMode === 'score-table-only'
    const isArchetype = definition.resultMode === 'scores-only'
    const isStrokeProfile = definition.type === 'stroke-profile'
    const finalResult = tiedTop ? definition.mixedResult : category
    return {
      mode: isStrokeProfile ? 'profile' : 'categories',
      title: isScoreTable
        ? 'Score breakdown'
        : isStrokeProfile
          ? definition.resultTitle || definition.profileTitle || 'Stroke profile'
          : isArchetype
            ? 'Financial archetype score breakdown'
            : 'Energy profile breakdown',
      subtitle: isScoreTable
        ? total
        : isStrokeProfile
          ? definition.profileTitle || total
          : total,
      breakdown: detailedBreakdown,
      conclusion: isScoreTable || isStrokeProfile ? null : {
        label: isArchetype ? 'Top Archetype' : 'Dominant Result',
        value: attempt?.result_label || finalResult?.label || top?.label || 'Recorded result',
        description: [finalResult?.subtitle, finalResult?.interpretation].filter(Boolean).join(' '),
      },
    }
  }

  if (definition.type === 'binary-scored') {
    const threshold = definition.scoring?.thresholds?.find((item) => (
      number(attempt?.score_value) >= number(item.min)
      && number(attempt?.score_value) <= number(item.max)
    ))
    return {
      mode: 'points',
      title: 'Assessment score',
      subtitle: total,
      conclusion: {
        label: 'Your Result',
        value: attempt?.result_label || threshold?.label || 'Recorded result',
        description: threshold?.rangeLabel,
      },
      notes: threshold?.points || [],
      breakdown: [],
    }
  }

  if (definition.type === 'correct-incorrect') {
    const score = number(attempt?.score_value)
    const maximum = number(attempt?.score_max)
    const incorrect = Math.max(0, maximum - score)
    const incorrectAnswers = Array.isArray(attempt?.score_details?.incorrect_answers)
      ? attempt.score_details.incorrect_answers
      : []
    return {
      mode: 'points',
      title: 'Assessment score',
      subtitle: audience === 'admin'
        ? 'Question-level answers are private and are not stored in the admin report.'
        : null,
      conclusion: {
        label: 'Your Score',
        value: `${score} out of ${maximum}`,
        description: incorrect === 0
          ? 'Perfect! All answers were correct.'
          : `${incorrect} ${incorrect === 1 ? 'answer was' : 'answers were'} incorrect.`,
      },
      incorrectAnswers,
      reviewAvailable: incorrect === 0 || Object.prototype.hasOwnProperty.call(attempt?.score_details || {}, 'incorrect_answers'),
      breakdown: [],
    }
  }

  const threshold = definition.scoring?.thresholds?.find((item) => number(attempt?.score_value) <= item.max)
  const fallbackConclusionLabel = definition.resultMode === 'scores-only'
    ? 'Top Archetype'
    : definition.resultMode === 'ranked-needs'
      ? 'Top Need'
      : 'Your Result'
  return {
    mode: 'points',
    title: 'Assessment result',
    subtitle: total,
    conclusion: {
      label: fallbackConclusionLabel,
      value: attempt?.result_label || threshold?.label || 'Recorded result',
      description: threshold?.message,
    },
    breakdown: [],
  }
}
