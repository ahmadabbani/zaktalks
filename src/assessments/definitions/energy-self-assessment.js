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
      label: 'Bound Result',
      subtitle: 'Your strongest pattern is Bound Energy.',
      description: 'Tendency to lock energy, get stuck, or avoid flow.',
      color: '#F59E0B',
      interpretation: 'You may tend to hold back, over-control, or avoid financial decisions when things feel uncertain. This can make money feel restrictive or emotionally heavy. Your next step is to practice small, steady choices that build trust in yourself.'
    },
    unbound: {
      label: 'Unbound Result',
      subtitle: 'Your strongest pattern is Unbound Energy.',
      description: 'Energy leaks into impulsive or reactive behavior.',
      color: '#EF4444',
      interpretation: 'You may be more likely to react emotionally or impulsively with money. This can create financial stress or inconsistency over time. Your next step is to slow down and create more pause between feeling and acting.'
    },
    free: {
      label: 'Free Result',
      subtitle: 'Your strongest pattern is Free Energy.',
      description: 'Consciously managing and releasing energy, using money as a resource.',
      color: '#22C55E',
      interpretation: 'You are showing a more balanced and intentional relationship with money. You can pause, reflect, and make choices that align with your goals. Your next step is to keep strengthening this steady, conscious approach.'
    }
  },
  mixedResult: {
    label: 'Mixed Result',
    subtitle: 'Your pattern is mixed right now.',
    interpretation: 'You may move between caution, reactivity, and balance depending on the moment. This often means you are in a transitional phase rather than stuck in one pattern. Your next step is to build more consistency so money feels steadier and less extreme.'
  }
};
