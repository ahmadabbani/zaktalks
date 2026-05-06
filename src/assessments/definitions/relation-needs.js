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
  themeColor: '#2563EB',
  resultMode: 'ranked-needs',
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
      description: 'Receiving another person willingly and unconditionally, even when the other\'s behavior has been imperfect. In short: unconditional kindness.'
    },
    affection: {
      label: 'Affection',
      color: '#DB2777',
      description: 'Expressing care and closeness through words, actions, and physical touch. In short: loving words and touches.'
    },
    appreciation: {
      label: 'Appreciation',
      color: '#EA580C',
      description: 'Expressing gratitude, praise, and appreciation of accomplishment or effort. In short: praise for what a person does.'
    },
    approval: {
      label: 'Approval',
      color: '#16A34A',
      description: 'Building up or affirming another person. In short: praise for whom a person is.'
    },
    attention: {
      label: 'Attention',
      color: '#0891B2',
      description: 'Conveying interest, concern, and care for another; taking thought of another person\'s perspective and experience. In short: entering a person\'s world alongside them.'
    },
    comfort: {
      label: 'Comfort',
      color: '#7C3AED',
      description: 'Responding to a hurting person with words, feelings, and touch; hurting with another person so they are not alone in pain. In short: bearing emotional burdens.'
    },
    encouragement: {
      label: 'Encouragement',
      color: '#DC2626',
      description: 'Urging another person to persist and persevere toward a goal; stimulating toward loving and healthy actions. In short: being a cheerleader.'
    },
    security: {
      label: 'Security',
      color: '#4F46E5',
      description: 'Relieving fear of threat or harm through reassurances and practical measures, and promoting harmony through peacemaking and reconciliation. In short: being protective, proactive, and handling conflict gently.'
    },
    respect: {
      label: 'Respect',
      color: '#0F766E',
      description: 'Valuing and regarding another highly; treating another as important and worthy. In short: taking someone seriously.'
    },
    support: {
      label: 'Support',
      color: '#B45309',
      description: 'Coming alongside another person and helping with a problem or struggle through appropriate assistance. In short: bearing practical burdens.'
    }
  },
  mixedResult: {
    label: 'Mixed Relational Needs Pattern',
    subtitle: 'Multiple Strong Signals',
    interpretation: ''
  }
};
