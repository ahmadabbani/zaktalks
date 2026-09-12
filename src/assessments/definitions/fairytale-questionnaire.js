export const fairytaleQuestionnaire = {
  type: 'free-text-questionnaire',
  id: 'fairytale-questionnaire-v1',
  title: 'Fairytale Questionnaire',
  externalOnly: true,
  description:
    'Welcome to the Fairy Tale Questionnaire.\n\nThis short exercise invites you to remember a favorite children’s fairy tale and explore its world, characters, hero, challenges, and magical elements.',
  intro:
    'As you answer, try to describe the story as you remember it, in your own words. There are no right or wrong answers: the goal is to reflect on the hero’s journey, the obstacles they face, the help they receive, and what their life might look like after the story ends.',
  completionInstructions:
    'Please answer each question as fully as you can. If you are unsure about any part, simply write what feels most relevant to you.',
  resultTitle: 'Your Fairytale Reflection',
  resultDescription:
    'Here is the story you described, in your own words. As you read it, notice the hero’s choices, obstacles, sources of help, and the future you imagined. This is a reflection, not a score or diagnosis.',
  questions: [
    {
      id: 'q1',
      text: 'Name of favorite children’s fairy tale which you remember?',
      example: 'The name of your fairy tale might be the motto you are wearing as “T-shirt”'
    },
    {
      id: 'q2',
      text: 'Where does the fairy tale take place? In a magical land, real world, etc.?',
      example: 'Reflect the decoration of the script that is wrapping the script, some people are in the palace, some people are in the forest, on the beach, or elsewhere.'
    },
    {
      id: 'q3',
      text: 'Who is the main hero in it? Is it a person? And animal? A symbol?\nWhat Power or ability is he/she gifted with?',
      example: 'The main hero is your identification. Mainly people identify themselves as the heroes, some, the villains.'
    },
    {
      id: 'q4',
      text: 'Specify other Characters from Fairy tale.',
      example: 'The characters in your fairy tales could be both your sub personalities, for example you can be the princess and you can be the witch (some traits from both). They are the people we choose from our surroundings to identify our script.'
    },
    {
      id: 'q5',
      text: 'Maleficent, sorcery, evil...',
      example: 'injunctions'
    },
    {
      id: 'q6',
      text: 'What is the goal of the hero?',
      example: 'The script decision (HOW THE CHILD UNDERSTOOD THE POSSIBLE WAY to reach the goal.'
    },
    {
      id: 'q7',
      text: 'What tasks should the hero accomplish?',
      example: 'Parent Program'
    },
    {
      id: 'q8',
      text: 'What happens to the hero when he faces the obstacles on the way? What obstacles does the hero overcome?',
      example: 'What obstacles will you crea'
    },
    {
      id: 'q9',
      text: 'Who or what helps the hero accomplish tasks or overcome the obstacles?',
      example: 'Who do you INVITE to help? (Games?)'
    },
    {
      id: 'q10',
      text: 'What is the magic, magical object or alchemy?',
      example: 'Martian Thinking. Unconscious resources.'
    },
    {
      id: 'q11',
      text: 'Does the hero reach his goal?',
      example: 'Winners, Losers, and Non winners.'
    },
    {
      id: 'q12',
      text: 'Is it possible to reach this goal in a different way?',
      example: 'Permission. Choice option. NB: “Ask the children”. If you have children ask them. If not find children around and ask them this question. (Is it possible to reach this goal in a different way?) Children are very good about doing things in a different way.'
    },
    {
      id: 'q13',
      text: 'Imagine: How did your hero’s life turn out after the end of the fairy tale:',
      example: 'How do you want the story to end?',
      fields: [
        { id: 'afterFiveYears', label: 'After 5 years:' },
        { id: 'afterTenYears', label: 'After 10 years:' }
      ]
    }
  ]
};
