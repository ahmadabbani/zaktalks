export const energySelfAssessment = {
  type: 'cathexis',
  id: 'energy-self-assessment-v1',
  title: 'Energy Self-Assessment Questionnaire',
  description: 'Read each statement and rate how true it feels for you on a scale of 1–5.',
  themeColor: '#8B5CF6',
  questions: [
    { id: 'q1', text: 'I tend to spend money impulsively when I\'m stressed, even if I regret it later.', category: 'unbound' },
    { id: 'q2', text: 'I can pause, evaluate, and then act when facing financial choices.', category: 'free' },
    { id: 'q3', text: 'I hold on to savings tightly, even when it stops me from enjoying life.', category: 'bound' },
    { id: 'q4', text: 'When I feel emotional, I make financial decisions without thinking them through.', category: 'unbound' },
    { id: 'q5', text: 'I can use both caution and risk-taking when managing money.', category: 'free' },
    { id: 'q6', text: 'I feel paralyzed when it comes to investing or making long-term money plans.', category: 'bound' },
    { id: 'q7', text: 'My mood often decides how I spend money.', category: 'unbound' },
    { id: 'q8', text: 'I can direct my energy consciously into goals rather than reacting to emotions.', category: 'free' },
    { id: 'q9', text: 'I sometimes avoid money altogether, hoping others will handle it for me.', category: 'bound' }
  ],
  categories: {
    bound: {
      label: 'Bound Cathexis',
      subtitle: 'Frozen Energy',
      description: 'Tendency to lock energy, get stuck, or avoid flow.',
      color: '#F59E0B',
      interpretation: 'You may struggle with avoidance, fear, or over-control.'
    },
    unbound: {
      label: 'Unbound Cathexis',
      subtitle: 'Reactive Energy',
      description: 'Energy leaks into impulsive or reactive behavior.',
      color: '#EF4444',
      interpretation: 'You may struggle with impulsivity, money drama, or nervous system overdrive.'
    },
    free: {
      label: 'Free Cathexis',
      subtitle: 'Directed Energy',
      description: 'Consciously managing and releasing energy, using money as a resource.',
      color: '#22C55E',
      interpretation: 'You can consciously use money energy in balance (healthy Adult ego-state).'
    }
  },
  mixedResult: {
    label: 'Mixed Pattern',
    subtitle: 'Transitional Phase',
    interpretation: "If your scores were spread out without a clear winner, it doesn't mean you failed. It means you're in transition. You may recognize yourself in all three patterns at different times. The opportunity is to practice staying longer in your Adult, so money feels steady and not like a pendulum swinging between extremes."
  }
};
