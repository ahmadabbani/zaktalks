function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function assertAnswers(answers) {
  if (!isPlainObject(answers)) {
    throw new Error('Assessment answers are required.')
  }
}

function allowedValues(definition, question, fallback) {
  const configured = question.options || definition.options
  if (Array.isArray(configured) && configured.length) {
    return configured.map((option) => option.value)
  }

  if (Array.isArray(definition.scale?.values) && definition.scale.values.length) {
    return definition.scale.values
  }

  return fallback
}

function answerForQuestion(definition, question, answers, fallbackValues) {
  const answer = answers[question.id]
  const values = allowedValues(definition, question, fallbackValues)

  if (answer === undefined || !values.includes(answer)) {
    throw new Error('Every assessment question must have a valid answer.')
  }

  return answer
}

function roundedPercent(value, maximum) {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) return 0
  return Math.round((value / maximum) * 10000) / 100
}

function resultForLikert(definition, answers) {
  const values = definition.questions.map((question) =>
    Number(answerForQuestion(definition, question, answers, [1, 2, 3, 4, 5]))
  )
  const sum = values.reduce((total, value) => total + value, 0)
  const method = definition.scoring?.method === 'sum' ? 'sum' : 'average'
  const scoreValue = method === 'sum' ? sum : sum / values.length
  const scaleValues = definition.scale?.values || [1, 2, 3, 4, 5]
  const scoreMax = method === 'sum'
    ? Math.max(...scaleValues) * definition.questions.length
    : Math.max(...scaleValues)
  const threshold = definition.scoring?.thresholds?.find((item) => scoreValue <= item.max)

  return {
    scoreValue,
    scoreMax,
    scorePercent: roundedPercent(scoreValue, scoreMax),
    resultLabel: threshold?.label || null,
    scoreDetails: { method }
  }
}

function resultForCorrectIncorrect(definition, answers) {
  const incorrectAnswers = []
  const scoreValue = definition.questions.reduce((total, question) => {
    const answer = answerForQuestion(definition, question, answers, [])
    if (answer === question.correctAnswer) return total + 1

    const options = question.options || definition.options || []
    incorrectAnswers.push({
      question_id: question.id,
      question: question.text,
      selected_answer: options.find((option) => option.value === answer)?.label || String(answer),
      correct_answer: options.find((option) => option.value === question.correctAnswer)?.label || String(question.correctAnswer),
    })
    return total
  }, 0)
  const scoreMax = definition.questions.length

  return {
    scoreValue,
    scoreMax,
    scorePercent: roundedPercent(scoreValue, scoreMax),
    resultLabel: null,
    // Preserve only the learner-facing review, not the full raw answer set.
    scoreDetails: { incorrect_answers: incorrectAnswers }
  }
}

function categoryResult(definition, answers) {
  const scaleValues = definition.scale?.values || [1, 2, 3, 4, 5]
  const maximumValue = Math.max(...scaleValues)
  const categoryTotals = {}
  const categoryCounts = {}
  let scoreValue = 0

  for (const question of definition.questions) {
    const value = Number(answerForQuestion(definition, question, answers, scaleValues))
    scoreValue += value
    categoryTotals[question.category] = (categoryTotals[question.category] || 0) + value
    categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1
  }

  const scoreMax = definition.questions.length * maximumValue
  const breakdown = Object.entries(definition.categories || {}).map(([key, category]) => ({
    key,
    label: category.label || key,
    score: categoryTotals[key] || 0,
    max: (categoryCounts[key] || 0) * maximumValue
  }))
  const ranked = [...breakdown].sort((left, right) => right.score - left.score)
  const tied = ranked.length > 1 && ranked[0].score === ranked[1].score
  const resultLabel = tied
    ? definition.mixedResult?.label || 'Mixed result'
    : ranked[0]?.label || null

  return {
    scoreValue,
    scoreMax,
    scorePercent: roundedPercent(scoreValue, scoreMax),
    resultLabel,
    scoreDetails: { breakdown }
  }
}

function resultForStrokeProfile(definition, answers) {
  const scaleValues = definition.scale?.values || [0, 1, 2, 3, 4, 5, 6]
  const maximumValue = Math.max(...scaleValues)
  let scoreValue = 0

  const breakdown = definition.groups.map((group) => {
    const score = group.statements.reduce((total, _statement, index) => {
      const question = { id: `${group.id}_${index + 1}` }
      return total + Number(answerForQuestion(definition, question, answers, scaleValues))
    }, 0)
    const max = group.statements.length * maximumValue
    scoreValue += score

    return {
      key: group.id,
      label: group.title,
      score,
      max
    }
  })
  const scoreMax = breakdown.reduce((total, item) => total + item.max, 0)

  return {
    scoreValue,
    scoreMax,
    scorePercent: roundedPercent(scoreValue, scoreMax),
    resultLabel: null,
    scoreDetails: { breakdown }
  }
}

/**
 * Recalculates a lesson-player assessment result from its submitted answers.
 * Raw answers are validated here but are intentionally not returned or stored.
 * Correct/incorrect assessments retain only the minimal wrong-answer review
 * needed for the learner to revisit the feedback shown in the player.
 */
export function calculateAssessmentResult(definition, answers) {
  assertAnswers(answers)

  switch (definition?.type) {
    case 'correct-incorrect':
      return resultForCorrectIncorrect(definition, answers)
    case 'cathexis':
      return categoryResult(definition, answers)
    case 'stroke-profile':
      return resultForStrokeProfile(definition, answers)
    case 'likert':
      return resultForLikert(definition, answers)
    default:
      throw new Error('This assessment does not produce a numeric result.')
  }
}
