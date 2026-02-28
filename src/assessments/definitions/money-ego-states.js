export const moneyEgoStates = {
  type: 'correct-incorrect',
  id: 'money-ego-states-v1',
  title: 'Money & Ego-States Awareness',
  description: 'Read each statement below. Mark which ego-state do you think is speaking: Parent, Child, or Adult.',
  themeColor: '#4CAF50',
  options: [
    { label: 'Parent', value: 'parent' },
    { label: 'Child', value: 'child' },
    { label: 'Adult', value: 'adult' }
  ],
  questions: [
    { id: 'q1', text: '"You should never waste money; it\'s dangerous to spend."', correctAnswer: 'parent' },
    { id: 'q2', text: '"I really want that new watch, even if I don\'t have enough now."', correctAnswer: 'child' },
    { id: 'q3', text: '"Let\'s look at the budget and see if we can plan for it realistically."', correctAnswer: 'adult' },
    { id: 'q4', text: '"If I buy this, people will think I\'m irresponsible."', correctAnswer: 'child' },
    { id: 'q5', text: '"Money always stresses me out, I feel small when I deal with it."', correctAnswer: 'child' },
    { id: 'q6', text: '"I can handle this step by step, one decision at a time."', correctAnswer: 'adult' },
    { id: 'q7', text: '"You must save every penny; spending is reckless."', correctAnswer: 'parent' },
    { id: 'q8', text: '"I deserve to enjoy life, even if I can\'t really afford it."', correctAnswer: 'child' },
    { id: 'q9', text: '"What\'s the most balanced way to approach this purchase?"', correctAnswer: 'adult' },
    { id: 'q10', text: '"If I don\'t have money, it means I\'m a failure."', correctAnswer: 'child' },
    { id: 'q11', text: '"I feel so guilty when I spend on myself."', correctAnswer: 'child' },
    { id: 'q12', text: '"We can plan together for both needs and wants."', correctAnswer: 'adult' },
    { id: 'q13', text: '"You\'re irresponsible with money; you should know better."', correctAnswer: 'parent' },
    { id: 'q14', text: '"I want it now! I don\'t care about tomorrow."', correctAnswer: 'child' },
    { id: 'q15', text: '"What are the facts? Let\'s look at the numbers clearly."', correctAnswer: 'adult' },
    { id: 'q16', text: '"If I ask about money, people will reject me."', correctAnswer: 'child' },
    { id: 'q17', text: '"Spending money makes me feel loved or validated."', correctAnswer: 'child' },
    { id: 'q18', text: '"It\'s possible to create safety without clinging to fear."', correctAnswer: 'adult' },
    { id: 'q19', text: '"Money should always be controlled, or chaos will come."', correctAnswer: 'parent' },
    { id: 'q20', text: '"I trust myself to make wise money choices over time."', correctAnswer: 'adult' }
  ]
};
