export const unlockFinancialFrequency = {
  type: 'cathexis',
  id: 'unlock-financial-frequency-v1',
  title: 'Unlock Your Financial Frequency',
  description: 'Answer each question on a scale of 1 to 5. 1 = Not at all true for me, 5 = Very true for me.',
  externalPresentation: {
    introVariant: 'scale',
    description: 'Money is rarely only about money. It can involve security, freedom, belonging, contribution, achievement, visibility, and the stories we have learned about what is safe or possible.\n\nThis assessment identifies the financial patterns that may feel most familiar to you right now. It is for reflection—not judgment, diagnosis, or financial advice.',
    intro: 'Read each statement and choose the number that most accurately reflects your current experience. Do not choose what you think you should believe or do. Choose what is true for you.',
    completionInstructions: 'Rate how true each statement feels for you right now.'
  },
  themeColor: '#38BDF8',
  resultMode: 'scores-only',
  scale: {
    values: [1, 2, 3, 4, 5],
    legend: [
      { value: 1, label: 'Not at all true' },
      { value: 2, label: 'Slightly true' },
      { value: 3, label: 'Neutral' },
      { value: 4, label: 'Often true' },
      { value: 5, label: 'Very true' }
    ]
  },
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
      color: '#0EA5E9',
      interpretationLead: 'The Empire Builder is motivated by',
      interpretationEmphasis: 'growth, achievement, and creating long-term impact',
      interpretationDetail: 'They often see money as a tool for building businesses, opportunities, and legacy.',
      healthyExpression: 'Strategic, visionary, willing to invest for the future.',
      overusedExpression: 'Work becomes the priority over balance, relationships, or personal well-being.'
    },
    guardian: {
      label: 'Guardian',
      color: '#F59E0B',
      interpretationLead: 'The Guardian seeks',
      interpretationEmphasis: 'security, stability, and preparedness',
      interpretationDetail: 'They prefer reducing uncertainty before making financial decisions.',
      healthyExpression: 'Careful planning, thoughtful decision-making, financial resilience.',
      overusedExpression: 'Excessive caution, overthinking, or delaying opportunities because certainty feels necessary.'
    },
    caretaker: {
      label: 'Caretaker',
      color: '#10B981',
      interpretationLead: 'The Caretaker experiences money as a way to',
      interpretationEmphasis: 'support and care for others',
      interpretationDetail: 'Giving often feels meaningful and connected to their values.',
      healthyExpression: 'Generous while maintaining healthy boundaries.',
      overusedExpression: "Prioritizing others' needs so consistently that personal financial well-being is overlooked."
    },
    idealist: {
      label: 'Idealist',
      color: '#6366F1',
      interpretationLead: 'The Idealist wants money to be',
      interpretationEmphasis: 'aligned with personal values and purpose',
      interpretationDetail: 'Financial decisions are often guided by ethics, contribution, and meaningful impact.',
      healthyExpression: 'Purpose-driven earning, investing, and giving.',
      overusedExpression: 'Rejecting practical financial opportunities because they seem inconsistent with personal ideals.'
    },
    innocent: {
      label: 'Innocent',
      color: '#A855F7',
      interpretationLead: 'The Innocent prefers',
      interpretationEmphasis: 'simplicity and trust',
      interpretationDetail: 'They often feel less interested in financial complexity and may hope money will naturally work itself out.',
      healthyExpression: 'Optimistic, trusting, and able to keep finances uncomplicated.',
      overusedExpression: 'Avoiding financial decisions or relying entirely on others to manage money.'
    },
    pleasure_seeker: {
      label: 'Pleasure Seeker',
      color: '#F43F5E',
      interpretationLead: 'The Pleasure Seeker values',
      interpretationEmphasis: 'enjoyment, experiences, and living fully in the present',
      interpretationDetail: 'Money is often associated with freedom and quality of life.',
      healthyExpression: 'Creating memorable experiences while spending consciously.',
      overusedExpression: 'Impulsive spending or focusing on immediate enjoyment without considering future needs.'
    },
    saver: {
      label: 'Saver',
      color: '#14B8A6',
      interpretationLead: 'The Saver finds comfort in',
      interpretationEmphasis: 'building financial reserves and preparing for the future',
      interpretationDetail: 'Saving creates a sense of stability and control.',
      healthyExpression: 'Disciplined, financially prepared, and patient.',
      overusedExpression: 'Difficulty enjoying money or investing in experiences, growth, or personal needs despite having sufficient resources.'
    },
    star: {
      label: 'Star',
      color: '#F97316',
      interpretationLead: 'The Star values',
      interpretationEmphasis: 'visibility, influence, and recognition',
      interpretationDetail: 'Money can become a way of expressing identity, success, and personal brand.',
      healthyExpression: 'Inspiring others through authentic leadership and visible achievements.',
      overusedExpression: 'Making financial decisions primarily to maintain an image or gain external validation.'
    }
  },
  bringingItTogether: {
    openingEmphasis: 'Every person contains elements of multiple archetypes.',
    openingText: 'Most people have one dominant archetype supported by one or two secondary patterns that influence different financial situations.',
    goalPrefix: 'The goal is',
    goalEmphasis: 'not to change your archetype',
    goalText: 'but to understand how it shapes your decisions so you can respond with greater awareness rather than habit.',
    closingEmphasis: 'Financial maturity begins when you recognize your patterns and realize that every pattern offers both strengths to leverage and blind spots to understand.'
  },
  mixedResult: {
    label: 'Mixed Archetype Pattern',
    subtitle: 'Multiple Strong Signals',
    interpretation: ''
  }
};
