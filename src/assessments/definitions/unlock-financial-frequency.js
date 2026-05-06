export const unlockFinancialFrequency = {
  type: 'cathexis',
  id: 'unlock-financial-frequency-v1',
  title: 'Unlock Your Financial Frequency',
  description: 'Answer each question on a scale of 1 to 5. 1 = Not at all true for me, 5 = Very true for me.',
  themeColor: '#38BDF8',
  resultMode: 'scores-only',
  questions: [
    {
      id: 'q1',
      text: 'I enjoy being admired or recognized for my spending, giving, or financial choices.',
      category: 'star'
    },
    {
      id: 'q2',
      text: 'I take a long time to make financial decisions because I want to be absolutely sure.',
      category: 'guardian'
    },
    {
      id: 'q3',
      text: 'I want my money and actions to align with my values or vision for a better world.',
      category: 'idealist'
    },
    {
      id: 'q4',
      text: 'I love spending money on things that make me feel good in the moment.',
      category: 'pleasure_seeker'
    },
    {
      id: 'q5',
      text: 'I often focus more on work and progress than on rest or enjoyment.',
      category: 'empire_builder'
    },
    {
      id: 'q6',
      text: 'I feel guilty prioritizing my own needs over helping others.',
      category: 'caretaker'
    },
    {
      id: 'q7',
      text: 'I often imagine worst-case financial scenarios when planning for the future.',
      category: 'guardian'
    },
    {
      id: 'q8',
      text: 'I like investing or donating to causes that are trendy, cool, or high-visibility.',
      category: 'star'
    },
    {
      id: 'q9',
      text: "I regularly worry about having enough, even if I'm financially stable.",
      category: 'saver'
    },
    {
      id: 'q10',
      text: 'I avoid looking at financial details because they feel overwhelming or boring.',
      category: 'innocent'
    },
    {
      id: 'q11',
      text: 'Creating something big and lasting (like a business, legacy, or project) is one of my top priorities.',
      category: 'empire_builder'
    },
    {
      id: 'q12',
      text: 'I give financial help to friends, family, or causes even when it strains my own resources.',
      category: 'caretaker'
    },
    {
      id: 'q13',
      text: 'I sometimes spend impulsively and worry about it later.',
      category: 'pleasure_seeker'
    },
    {
      id: 'q14',
      text: 'I regularly worry about financial risks, even when things are stable.',
      category: 'guardian'
    },
    {
      id: 'q15',
      text: 'I often rely on others to handle money decisions for me.',
      category: 'innocent'
    },
    {
      id: 'q16',
      text: 'I often prioritize impact and purpose over profit.',
      category: 'idealist'
    },
    {
      id: 'q17',
      text: 'Spending, even on myself, often feels stressful or uncomfortable.',
      category: 'saver'
    },
    {
      id: 'q18',
      text: "I believe it's important to enjoy life now rather than save too much for later.",
      category: 'pleasure_seeker'
    },
    {
      id: 'q19',
      text: 'I believe in trusting people more than analyzing numbers when it comes to money.',
      category: 'innocent'
    },
    {
      id: 'q20',
      text: 'I enjoy being seen as someone who influences others with my financial choices.',
      category: 'star'
    },
    {
      id: 'q21',
      text: 'I feel most secure when I have money saved and untouched.',
      category: 'saver'
    },
    {
      id: 'q22',
      text: 'I struggle to say "no" when someone needs money or emotional support.',
      category: 'caretaker'
    },
    {
      id: 'q23',
      text: 'I tend to reinvest my money into projects or ventures rather than spend or diversify it.',
      category: 'empire_builder'
    },
    {
      id: 'q24',
      text: 'I am skeptical of traditional financial systems and prefer ethical or alternative investing.',
      category: 'idealist'
    }
  ],
  categories: {
    empire_builder: {
      label: 'Empire Builder',
      color: '#0EA5E9'
    },
    guardian: {
      label: 'Guardian',
      color: '#F59E0B'
    },
    caretaker: {
      label: 'Caretaker',
      color: '#10B981'
    },
    idealist: {
      label: 'Idealist',
      color: '#6366F1'
    },
    innocent: {
      label: 'Innocent',
      color: '#A855F7'
    },
    pleasure_seeker: {
      label: 'Pleasure Seeker',
      color: '#F43F5E'
    },
    saver: {
      label: 'Saver',
      color: '#14B8A6'
    },
    star: {
      label: 'Star',
      color: '#F97316'
    }
  },
  mixedResult: {
    label: 'Mixed Archetype Pattern',
    subtitle: 'Multiple Strong Signals',
    interpretation: ''
  }
};
