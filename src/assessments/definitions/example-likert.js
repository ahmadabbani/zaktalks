export const exampleLikert = {
  id: 'likert-sample-v1',
  title: 'Self-Reflection Assessment',
  description: 'A simple self-reflection using a 1-5 scale.',
  themeColor: '#FFD700', // Yellow theme
  questions: [
    { id: 'q1', text: 'I feel motivated to learn new things today.' },
    { id: 'q2', text: 'I am confident in my ability to manage my time.' },
    { id: 'q3', text: 'I find it easy to stay focused on my goals.' },
    { id: 'q4', text: 'I am happy with my current progress.' },
    { id: 'q5', text: 'I feel supported in my learning journey.' }
  ],
  scoring: {
    method: 'sum',
    maxScore: 25,
    thresholds: [
      { max: 10, label: 'Low Motivation', message: 'Take some time to rest and rediscover your why.' },
      { max: 20, label: 'Moderate Motivation', message: 'You are doing well, keep pushing!' },
      { max: 25, label: 'High Motivation', message: 'Excellent! You are on fire!' }
    ]
  }
};
