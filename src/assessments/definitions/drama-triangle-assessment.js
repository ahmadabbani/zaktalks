export const dramaTriangleAssessment = {
  type: 'cathexis',
  id: 'drama-triangle-assessment-v1',
  title: 'Drama triangle assessment',
  externalOnly: true,
  description: 'Identify your prominent role in the Drama Triangle.',
  intro: `Assign a score to each of these statements as they apply to you:

Score 0: You can't relate to it
Score 1: You can somewhat identify yourself with it
Score 2: It defines you strongly`,
  themeColor: '#3B8FD6',
  resultMode: 'role-ranges',
  scale: {
    values: [0, 1, 2],
    minLabel: "CAN'T RELATE",
    maxLabel: 'DEFINES YOU STRONGLY',
    legend: [
      { value: 0, label: "Can't relate to it" },
      { value: 1, label: 'Somewhat identify with it' },
      { value: 2, label: 'Defines you strongly' }
    ]
  },
  roleRanges: [
    { min: 0, max: 6, label: "This isn't your prominent role" },
    { min: 7, max: 12, label: 'You sometimes play this role (Secondary Role)' },
    { min: 13, max: 20, label: 'You adopt this role most of the time (Primary Role)' }
  ],
  questions: [
    { id: 'q1', text: 'Others are at fault for not doing the right thing', category: 'persecutor' },
    { id: 'q2', text: 'I actively look for opportunities to help those in need', category: 'rescuer' },
    { id: 'q3', text: 'My situation is beyond my control', category: 'victim' },
    { id: 'q4', text: 'Bad things just happen to me', category: 'victim' },
    { id: 'q5', text: "I go out of my way to fix others' problems", category: 'rescuer' },
    { id: 'q6', text: 'I have strong beliefs about how certain things should be done', category: 'persecutor' },
    { id: 'q7', text: "I get irritated when things don't go my way", category: 'persecutor' },
    { id: 'q8', text: 'Other situations and circumstances force me to behave in certain ways', category: 'victim' },
    { id: 'q9', text: 'I worry about others while brushing my own problems aside', category: 'rescuer' },
    { id: 'q10', text: 'I feel responsible for people around me', category: 'rescuer' },
    { id: 'q11', text: 'I cannot fix my own problems', category: 'victim' },
    { id: 'q12', text: 'I am always right', category: 'persecutor' },
    { id: 'q13', text: 'I am not capable of making my own decisions', category: 'victim' },
    { id: 'q14', text: "I understand that some people can't help themselves and need my support", category: 'rescuer' },
    { id: 'q15', text: 'I feel good when helping others', category: 'rescuer' },
    { id: 'q16', text: 'I need someone to unblock me to move forward', category: 'victim' },
    { id: 'q17', text: 'I feel helpless as well as hopeless', category: 'victim' },
    { id: 'q18', text: 'I have to push others to get things moving', category: 'persecutor' },
    { id: 'q19', text: 'Others find me considerate, compassionate and self-sacrificing', category: 'rescuer' },
    { id: 'q20', text: 'I believe some people are reckless, stupid, lazy and incompetent', category: 'persecutor' },
    { id: 'q21', text: "I feel people don't care about me", category: 'victim' },
    { id: 'q22', text: 'People tell me that I criticize a lot', category: 'persecutor' },
    { id: 'q23', text: 'I feel guilty to see people suffer', category: 'rescuer' },
    { id: 'q24', text: 'My problems are small compared to others', category: 'rescuer' },
    { id: 'q25', text: 'I feel angry at others for not doing their job', category: 'persecutor' },
    { id: 'q26', text: 'I sometimes work extra hard to help those who are struggling', category: 'rescuer' },
    { id: 'q27', text: 'I have to live with how things turned out', category: 'victim' },
    { id: 'q28', text: 'I find myself blaming others quite often', category: 'persecutor' },
    { id: 'q29', text: 'I feel ashamed of myself', category: 'victim' },
    { id: 'q30', text: 'I judge others harshly', category: 'persecutor' }
  ],
  categories: {
    victim: {
      label: 'Victim',
      color: '#2563EB'
    },
    persecutor: {
      label: 'Persecutor',
      color: '#DC2626'
    },
    rescuer: {
      label: 'Rescuer',
      color: '#16A34A'
    }
  },
  mixedResult: {
    label: 'Mixed Drama Triangle Pattern',
    subtitle: 'Multiple roles are showing similar strength.',
    interpretation: ''
  }
};
