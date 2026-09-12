export const relationNeeds = {
  type: 'cathexis',
  id: 'relation-needs-v1',
  title: 'Relational Needs Assessment',
  description: 'We all share the same relational needs, but each person prioritizes them differently.',
  intro: `We all have the same relational needs, but the priority of those needs is different for each person.

This assessment can help you discover and label your most strongly felt relational needs right now.
Answer the questions honestly (don’t worry about right or wrong answers or how you should feel).

Also, an important aspect of learning to love others is taking the time to understand their relational needs, so you can also have family members, friends, parents, etc. complete the assessment and see how well you guessed what needs they prioritize!

How to complete the assessment:
On the line next to each numbered statement, write a score based on how strongly you agree with what the statement says. Here are the different scores to use:
1 = I strongly disagree.
2 = I disagree.
3 = Neutral - I don’t have an opinion either way.
4 = I agree.
5 = I strongly agree.`,
  externalPresentation: {
    description: 'This assessment helps you identify the relational needs that most influence the way you connect with others. There are no right or wrong answers. The purpose is to notice what helps you feel safe, valued, heard, and close and to recognise what may happen when these needs go unspoken or unmet.',
    intro: 'On the line next to each numbered statement, write a score based on how strongly you agree with what the statement says. Here are the different scores to use:',
    introVariant: 'scale',
    scaleLegend: [
      { value: 1, label: 'Strongly disagree' },
      { value: 2, label: 'Disagree' },
      { value: 3, label: 'Neutral - I don’t have an opinion either way' },
      { value: 4, label: 'I agree' },
      { value: 5, label: 'Strongly agree' }
    ],
    completionInstructions: 'On the line next to each numbered statement, write a score based on how strongly you agree with what the statement says.'
  },
  themeColor: '#2563EB',
  resultMode: 'ranked-needs',
  scale: {
    values: [1, 2, 3, 4, 5],
    legend: [
      { value: 1, label: 'I strongly disagree' },
      { value: 2, label: 'I disagree' },
      { value: 3, label: 'Neutral' },
      { value: 4, label: 'I agree' },
      { value: 5, label: 'I strongly agree' }
    ]
  },
  questions: [
    { id: 'q1', text: 'It\'s important to me that people receive me for who I am, even if I\'m a little "different."', category: 'acceptance' },
    { id: 'q2', text: 'It is important to me that my world is in order.', category: 'security' },
    { id: 'q3', text: 'I sometimes grow tired of trying to do my best.', category: 'encouragement' },
    { id: 'q4', text: 'It is significant to me when others ask my opinion.', category: 'respect' },
    { id: 'q5', text: 'It is important that I receive frequent physical hugs, warm embraces, etc.', category: 'affection' },
    { id: 'q6', text: 'I feel good when someone takes a special interest in the things that are important to me.', category: 'attention' },
    { id: 'q7', text: 'It is important for me to know "where I stand" with those who are in authority over me.', category: 'approval' },
    { id: 'q8', text: 'It is meaningful when someone notices that I need help and then offers to get involved.', category: 'support' },
    { id: 'q9', text: 'When I feel overwhelmed, I especially need someone to come alongside me and help.', category: 'support' },
    { id: 'q10', text: 'I feel pleased when someone recognizes and shows concern for how I\'m feeling emotionally.', category: 'comfort' },
    { id: 'q11', text: 'I like to know that I am significant and valued by others.', category: 'appreciation' },
    { id: 'q12', text: 'Generally speaking, I don\'t like a lot of solitude.', category: 'attention' },
    { id: 'q13', text: 'I like it when my loved ones say to me, "I love you."', category: 'affection' },
    { id: 'q14', text: 'I don\'t like being seen only as a part of a large group - my individuality is important.', category: 'respect' },
    { id: 'q15', text: 'I am pleased when a friend calls to listen to me and encourage me.', category: 'encouragement' },
    { id: 'q16', text: 'It is important to me that people acknowledge me not just for what I do but for who I am.', category: 'approval' },
    { id: 'q17', text: 'I feel best when my world is orderly and somewhat predictable.', category: 'security' },
    { id: 'q18', text: 'When I\'ve worked hard on a project, I am pleased to have people acknowledge my work and express gratitude.', category: 'appreciation' },
    { id: 'q19', text: 'When I "blow it" it is important to me to be reassured that I am still loved.', category: 'acceptance' },
    { id: 'q20', text: 'It is encouraging to me when I realize that others notice my skills and strengths.', category: 'approval' },
    { id: 'q21', text: 'I sometimes feel overwhelmed and discouraged.', category: 'encouragement' },
    { id: 'q22', text: 'It\'s important to me to be treated with kindness and equality, regardless of my race, gender, looks, and status.', category: 'respect' },
    { id: 'q23', text: 'To have someone I care about touch me on the arm or shoulder or give me a hug feels good.', category: 'affection' },
    { id: 'q24', text: 'I enjoy it when someone wants to spend time with just me.', category: 'attention' },
    { id: 'q25', text: 'It is meaningful when someone I look up to says, "Good job."', category: 'appreciation' },
    { id: 'q26', text: 'It is important to me for someone to show concern for me after I\'ve had a hard day.', category: 'comfort' },
    { id: 'q27', text: 'While I may feel confident about what I "do" (my talents, gifts, etc.), I also believe that I need other people\'s input and help.', category: 'support' },
    { id: 'q28', text: 'Written notes and calls expressing sympathy after the death of a loved one, health problems, or other stressful events are (or would be) very meaningful to me.', category: 'comfort' },
    { id: 'q29', text: 'I feel good when someone shows satisfaction with the way I am.', category: 'approval' },
    { id: 'q30', text: 'I enjoy being spoken well of or affirmed in front of a group of people.', category: 'attention' },
    { id: 'q31', text: 'I would be described as an "affectionate" person.', category: 'affection' },
    { id: 'q32', text: 'When a decision is going to affect my life, it is important to me that my input is sought and given serious consideration.', category: 'respect' },
    { id: 'q33', text: 'I am pleased when someone shows interest in current projects on which I am working.', category: 'encouragement' },
    { id: 'q34', text: 'I appreciate trophies, plaques, and special gifts, which are permanent reminders of something significant that I have done.', category: 'appreciation' },
    { id: 'q35', text: 'It is not unusual for me to worry about the future.', category: 'security' },
    { id: 'q36', text: 'When I am introduced into a new environment, I typically search for a group of people with whom I can connect.', category: 'acceptance' },
    { id: 'q37', text: 'The possibility of major change (moving, new job...etc.) produces anxiety for me.', category: 'security' },
    { id: 'q38', text: 'It bothers me when people are prejudiced against others just because they dress or act different.', category: 'acceptance' },
    { id: 'q39', text: 'It is necessary for me to be surrounded by friends and loved ones who will be there "through thick and thin."', category: 'security' },
    { id: 'q40', text: 'Receiving written notes and expressions of gratitude particularly pleases me.', category: 'appreciation' },
    { id: 'q41', text: 'To know that someone is thinking of me is very meaningful.', category: 'encouragement' },
    { id: 'q42', text: 'People who try to control me or others annoy me.', category: 'respect' },
    { id: 'q43', text: 'I am pleased by unexpected and spontaneous expressions of care.', category: 'affection' },
    { id: 'q44', text: 'I feel important when someone looks me in the eye and listens to me without distractions.', category: 'attention' },
    { id: 'q45', text: 'I am grateful when people commend me for a positive characteristic I exhibit.', category: 'approval' },
    { id: 'q46', text: 'I don\'t like to be alone when experiencing hurt and trouble; it is important for me to have a companion who will be with me.', category: 'comfort' },
    { id: 'q47', text: 'I don\'t enjoy working on a project by myself; I prefer to have a "partner" on important projects.', category: 'support' },
    { id: 'q48', text: 'It is important for me to know I am "part of the group."', category: 'acceptance' },
    { id: 'q49', text: 'I respond to someone who tries to understand me emotionally and who shows me caring concern.', category: 'comfort' },
    { id: 'q50', text: 'When working on a project, I would rather work with a team of people than by myself.', category: 'support' }
  ],
  categories: {
    acceptance: {
      label: 'Acceptance',
      color: '#2563EB',
      description: 'Receiving another person willingly and unconditionally, even when the other\'s behavior has been imperfect. In short: unconditional kindness.',
      highScoreMeaning: 'Acceptance and belonging may feel especially important to you. Rejection, exclusion, or criticism may hurt deeply, while being welcomed as you are helps you feel connected.',
      lowScoreMeaning: 'You may feel comfortable being different and less dependent on others\' acceptance. This can reflect confidence and self-sufficiency, though sometimes it can also reflect emotional self-protection.',
      possibleReasons: ['Past rejection or exclusion', 'Conditional love or approval in childhood', 'A secure sense of identity', 'Self-protection after repeated disappointments']
    },
    affection: {
      label: 'Affection',
      color: '#DB2777',
      description: 'Expressing care and closeness through words, actions, and physical touch. In short: loving words and touches.',
      highScoreMeaning: 'Warmth, closeness, loving words, or physical touch may be important ways you feel cared for. Frequent expressions of affection can help you feel connected.',
      lowScoreMeaning: 'You may be comfortable with fewer outward expressions of affection, value personal space, or prefer showing care through actions rather than words or touch.',
      possibleReasons: ['Affection as a preferred way of receiving care', 'Earlier emotional deprivation', 'Family or cultural norms around affection', 'Comfort or discomfort with vulnerability and closeness']
    },
    appreciation: {
      label: 'Appreciation',
      color: '#EA580C',
      description: 'Expressing gratitude, praise, and appreciation of accomplishment or effort. In short: praise for what a person does.',
      highScoreMeaning: 'Recognition for your effort and contributions may matter a great deal. Gratitude and acknowledgment can help you feel valued and motivated.',
      lowScoreMeaning: 'You may find satisfaction in your own achievements without needing much praise from others. You may also be used to minimizing your accomplishments.',
      possibleReasons: ['Being overlooked or taken for granted', 'An achievement-oriented outlook', 'Strong internal motivation', 'A habit of minimizing accomplishments']
    },
    approval: {
      label: 'Approval',
      color: '#16A34A',
      description: 'Building up or affirming another person. In short: praise for whom a person is.',
      highScoreMeaning: 'Affirmation of who you are, not only what you do, may be important to you. Others\' confidence can encourage you, while criticism or disapproval may feel particularly painful.',
      lowScoreMeaning: 'You may rely more on your own judgment and confidence than on others\' opinions. This can support independent decisions and emotional steadiness.',
      possibleReasons: ['A critical upbringing or frequent judgment', 'Self-doubt', 'Secure self-esteem', 'Learned emotional independence']
    },
    attention: {
      label: 'Attention',
      color: '#0891B2',
      description: 'Conveying interest, concern, and care for another; taking thought of another person\'s perspective and experience. In short: entering a person\'s world alongside them.',
      highScoreMeaning: 'Quality time, active listening, and someone\'s full presence may help you feel loved. Meaningful conversation and undivided attention can be especially connecting.',
      lowScoreMeaning: 'You may feel comfortable with time alone, value privacy, and need less frequent interaction. In some cases, distance can also protect against emotional intimacy.',
      possibleReasons: ['Loneliness or emotional neglect', 'A busy family or work environment', 'An introverted temperament', 'Protecting yourself from emotional intimacy']
    },
    comfort: {
      label: 'Comfort',
      color: '#7C3AED',
      description: 'Responding to a hurting person with words, feelings, and touch; hurting with another person so they are not alone in pain. In short: bearing emotional burdens.',
      highScoreMeaning: 'Empathy, reassurance, and emotional support may be especially important during difficult times. You may feel better when you do not have to face a struggle alone.',
      lowScoreMeaning: 'You may usually handle emotional challenges on your own and prefer to solve problems independently. It may also be worth noticing whether asking for comfort feels difficult.',
      possibleReasons: ['Current stress, grief, or anxiety', 'Earlier emotional neglect', 'Resilience and self-reliance', 'Difficulty expressing vulnerable feelings']
    },
    encouragement: {
      label: 'Encouragement',
      color: '#DC2626',
      description: 'Urging another person to persist and persevere toward a goal; stimulating toward loving and healthy actions. In short: being a cheerleader.',
      highScoreMeaning: 'Supportive words and belief in your potential may help you keep going. Positive reinforcement can be a meaningful source of motivation when things feel difficult.',
      lowScoreMeaning: 'You may be largely self-motivated and rely on your own determination rather than frequent encouragement from others.',
      possibleReasons: ['Current life challenges', 'Self-doubt or fear of failure', 'A growth-oriented outlook', 'Strong intrinsic motivation']
    },
    security: {
      label: 'Security',
      color: '#4F46E5',
      description: 'Relieving fear of threat or harm through reassurances and practical measures, and promoting harmony through peacemaking and reconciliation. In short: being protective, proactive, and handling conflict gently.',
      highScoreMeaning: 'Trust, consistency, and reliability may help you feel safe in relationships. Uncertainty or sudden change can feel unsettling when stability matters strongly to you.',
      lowScoreMeaning: 'You may be comfortable with change, uncertainty, and taking risks. Adaptability and independence may make predictability less central to your sense of connection.',
      possibleReasons: ['An unstable childhood or past trauma', 'Recent major life changes', 'Secure attachment and confidence', 'A habit of relying primarily on yourself']
    },
    respect: {
      label: 'Respect',
      color: '#0F766E',
      description: 'Valuing and regarding another highly; treating another as important and worthy. In short: taking someone seriously.',
      highScoreMeaning: 'Dignity, fairness, and having your voice heard may matter strongly to you. Being ignored or treated as less than an equal can feel especially hurtful.',
      lowScoreMeaning: 'You may be easygoing and less focused on status or recognition. A lower relative score does not mean disrespect is acceptable; it may also be worth noticing whether you avoid speaking up for your rights.',
      possibleReasons: ['Past experiences of disrespect', 'Leadership responsibilities', 'A humble outlook', 'A tendency to underestimate your own worth']
    },
    support: {
      label: 'Support',
      color: '#B45309',
      description: 'Coming alongside another person and helping with a problem or struggle through appropriate assistance. In short: bearing practical burdens.',
      highScoreMeaning: 'Practical help, shared responsibility, and dependable teamwork may help you feel supported. You may feel strengthened when you do not have to carry everything alone.',
      lowScoreMeaning: 'You may prefer to solve problems independently and rarely ask for help. Self-sufficiency can be a strength, while trust or asking for support may still be worth exploring.',
      possibleReasons: ['Feeling overwhelmed by responsibilities', 'Experience of reliable support', 'Strong independence', 'Difficulty trusting others or asking for help']
    }
  },
  mixedResult: {
    label: 'Mixed Relational Needs Pattern',
    subtitle: 'Multiple Strong Signals',
    interpretation: ''
  }
};
