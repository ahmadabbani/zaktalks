export const transactionalAnalysisQuestionnaire = {
  type: 'cathexis',
  id: 'transactional-analysis-personal-style-questionnaire-v1',
  title: 'Ego states assessment',
  description: 'For each statement, allocate a score to show how much the behaviour is like the way you behave.',
  intro: `Instructions - For each statement, allocate a score to show how much the behaviour is like the way you behave:

Not true of me - 0
Partly true of me - 1
Moderately true of me - 2
Extremely true of me - 3`,
  themeColor: '#0F766E',
  resultMode: 'score-table-only',
  scale: {
    values: [0, 1, 2, 3],
    minLabel: 'NOT TRUE OF ME',
    maxLabel: 'EXTREMELY TRUE OF ME',
    legend: [
      { value: 0, label: 'Not true of me' },
      { value: 1, label: 'Partly true of me' },
      { value: 2, label: 'Moderately true of me' },
      { value: 3, label: 'Extremely true of me' }
    ]
  },
  questions: [
    { id: 'q1', text: 'I tell people firmly how they should behave.', category: 'critical_parent' },
    { id: 'q2', text: 'I tend to reason things out before acting.', category: 'adult' },
    { id: 'q3', text: 'I do as I’m told', category: 'adaptive_child' },
    { id: 'q4', text: 'I behave empathetically towards people with problems.', category: 'nurturing_parent' },
    { id: 'q5', text: 'I enjoy being with other people.', category: 'free_child' },
    { id: 'q6', text: 'I enjoy taking care of people.', category: 'nurturing_parent' },
    { id: 'q7', text: 'I enjoy solving problems systematically and logically.', category: 'adult' },
    { id: 'q8', text: 'I tell people what to do.', category: 'critical_parent' },
    { id: 'q9', text: 'I let people know how I genuinely feel without embarrassment.', category: 'free_child' },
    { id: 'q10', text: 'I am polite and courteous.', category: 'adaptive_child' },
    { id: 'q11', text: 'I do the opposite of what people expect.', category: 'adaptive_child' },
    { id: 'q12', text: 'When someone is new, I show them where everything is.', category: 'nurturing_parent' },
    { id: 'q13', text: 'I can stay calm in a crisis.', category: 'adult' },
    { id: 'q14', text: 'When I know that I am right, I insist that others listen to me.', category: 'critical_parent' },
    { id: 'q15', text: 'When I’m curious, I keep asking questions.', category: 'free_child' },
    { id: 'q16', text: 'I am very enthusiastic about my work.', category: 'free_child' },
    { id: 'q17', text: 'People seem to expect me to know the answer.', category: 'critical_parent' },
    { id: 'q18', text: 'I’m asked to take care of new members of staff.', category: 'nurturing_parent' },
    { id: 'q19', text: 'I get on well with people who are polite to me.', category: 'adaptive_child' },
    { id: 'q20', text: 'I keep on thinking logically, even when under pressure.', category: 'adult' },
    { id: 'q21', text: 'My working style is systematic and logical', category: 'adult' },
    { id: 'q22', text: 'I dress to match the sort of outfits that other people wear to work.', category: 'adaptive_child' },
    { id: 'q23', text: 'I do things for people when I think they can’t manage for themselves.', category: 'nurturing_parent' },
    { id: 'q24', text: 'I can quote my previous experience when problems occur.', category: 'critical_parent' },
    { id: 'q25', text: 'People tell me I’m creative and innovative.', category: 'free_child' },
    { id: 'q26', text: 'I prefer to take control rather than follow someone else’s lead.', category: 'critical_parent' },
    { id: 'q27', text: 'I am overly concerned about people.', category: 'nurturing_parent' },
    { id: 'q28', text: 'I’m over-emotional compared to others.', category: 'free_child' },
    { id: 'q29', text: 'I expect my manager to set my terms of reference.', category: 'adaptive_child' },
    { id: 'q30', text: 'I take all points of view into account when making decisions.', category: 'adult' },
    { id: 'q31', text: 'I encourage people to test out their capabilities.', category: 'nurturing_parent' },
    { id: 'q32', text: 'People complain that I’m bossy.', category: 'critical_parent' },
    { id: 'q33', text: 'I spend a lot of time enjoying myself.', category: 'free_child' },
    { id: 'q34', text: 'People tell me I’m very polite.', category: 'adaptive_child' },
    { id: 'q35', text: 'I am noted for my even temper and balanced comments.', category: 'adult' },
    { id: 'q36', text: 'I show my feelings whether happy or sad, so that people can congratulate or sympathise with me.', category: 'free_child' },
    { id: 'q37', text: 'I’ve looked after someone even though they could have managed on their own.', category: 'nurturing_parent' },
    { id: 'q38', text: 'I’m tempted to analyse jokes, which spoil them for others.', category: 'adult' },
    { id: 'q39', text: 'People do as I tell them.', category: 'critical_parent' },
    { id: 'q40', text: 'I go along too readily with what other people want.', category: 'adaptive_child' }
  ],
  categories: {
    critical_parent: { label: 'Critical Parent', color: '#B91C1C' },
    nurturing_parent: { label: 'Nurturing Parent', color: '#0EA5E9' },
    adult: { label: 'Adult', color: '#16A34A' },
    adaptive_child: { label: 'Adaptive Child', color: '#9333EA' },
    free_child: { label: 'Free Child', color: '#EA580C' }
  },
  mixedResult: {
    label: 'Mixed Result',
    subtitle: '',
    interpretation: ''
  }
};
