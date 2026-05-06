export const strokingQuestionnaire = {
  type: 'stroke-profile',
  id: 'stroking-questionnaire-v1',
  title: 'Stroking Questionnaire',
  description: 'Give each statement the number corresponding to that which best describes you',
  intro: `FILL IN THE BLANK WITH THE NUMBER CORRESPONDING TO THAT WHICH BEST DESCRIBES YOU.

0 = NEVER
1 = RARELY
2 = SELDOM
3 = SOMETIMES
4 = OFTEN
5 = USUALLY
6 = ALWAYS`,
  resultTitle: 'MY STROKE ECONOMY',
  profileTitle: 'STROKE PROFILE',
  profileInstructions: 'Take your totals from the boxes on the -- Stroking Questionnaire -- and put the score in the appropriate column. Shade in the area to make a bar chart. You can use the extra chart to make a stroke profile on your spouse, a friend, your boss or some other person significant in your life. How do the profiles look together? Is there a problem area? For example you give a lot of positive strokes and they won\'t take positive strokes. Maybe you ask for a lot of strokes and they refuse to give positive strokes. Look for any patterns.',
  themeColor: '#5B3B91',
  scale: {
    values: [0, 1, 2, 3, 4, 5, 6],
    legend: [
      { value: 0, label: 'NEVER' },
      { value: 1, label: 'RARELY' },
      { value: 2, label: 'SELDOM' },
      { value: 3, label: 'SOMETIMES' },
      { value: 4, label: 'OFTEN' },
      { value: 5, label: 'USUALLY' },
      { value: 6, label: 'ALWAYS' }
    ]
  },
  groups: [
    {
      id: 'giving_positive_strokes',
      number: 1,
      title: 'Total - Giving Positive Strokes',
      profileLabel: 'GIVE',
      polarity: 'positive',
      statements: [
        'I am quick to praise a job well done.',
        'I tell others what I like.',
        'I enjoy complimenting others.',
        'I like to help others feel good.'
      ]
    },
    {
      id: 'giving_negative_strokes',
      number: 2,
      title: 'Total - Giving Negative Strokes',
      profileLabel: 'GIVE',
      polarity: 'negative',
      statements: [
        'I am quick to criticize a sloppy job',
        'I tease those that I like.',
        'I criticize what I don\'t like.',
        'I am outspoken with my opinions.'
      ]
    },
    {
      id: 'taking_positive_strokes',
      number: 3,
      title: 'Total - Taking Positive Strokes',
      profileLabel: 'TAKE',
      polarity: 'positive',
      statements: [
        'I feel comfortable when complimented.',
        'I feel comfortable in front of a group.',
        'I enjoy being bragged on.',
        'I enjoy being physically "stroked".'
      ]
    },
    {
      id: 'taking_negative_strokes',
      number: 4,
      title: 'Total - Taking Negative Strokes',
      profileLabel: 'TAKE',
      polarity: 'negative',
      statements: [
        'I accept criticism very well.',
        'I listen intently when criticized.',
        'I take teasing very well.',
        'I try to follow the advice of others.'
      ]
    },
    {
      id: 'asking_for_positive_strokes',
      number: 5,
      title: 'Total - Asking for Positive Strokes',
      profileLabel: 'ASK FOR',
      polarity: 'positive',
      statements: [
        'I openly ask for praise.',
        'I ask for reassurance when I am in doubt.',
        'I openly ask for what I want.',
        'I tell others when I\'ve done something well.'
      ]
    },
    {
      id: 'asking_for_attention',
      number: 6,
      title: 'Total - Asking for Attention',
      profileLabel: 'ASK FOR',
      polarity: 'negative',
      statements: [
        'I want others to offer help without my asking.',
        'I hint for praise rather than ask for it.',
        'I talk about my problems, troubles, or faults.',
        'I expect people to listen to my accomplishments or what I\'ve done.'
      ]
    },
    {
      id: 'refusing_to_give_positive_strokes',
      number: 7,
      title: 'Total - Refusing to Give Positive Strokes',
      profileLabel: 'REFUSE TO GIVE',
      polarity: 'positive',
      statements: [
        'I refuse to give unearned praise or insincere compliments.',
        'I refuse to do for others what they can do for themselves.',
        'I insist that others ask specifically for what they want.',
        'I find it easy to say "no" to others.'
      ]
    },
    {
      id: 'refusing_to_give_negative_strokes',
      number: 8,
      title: 'Total - Refusing to Give Negative Strokes',
      profileLabel: 'REFUSE TO GIVE',
      polarity: 'negative',
      statements: [
        'I allow interruptions when I am busy.',
        'I avoid criticizing others.',
        'I keep my anger and opinions to myself.',
        'I try to be agreeable rather than argue a point.'
      ]
    }
  ]
};
