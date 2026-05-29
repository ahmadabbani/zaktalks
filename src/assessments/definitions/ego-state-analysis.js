const egoStates = [
  { id: 'CP', label: 'Critical Parent', color: '#DC2626' },
  { id: 'RP', label: 'Rescuing Parent', color: '#F97316' },
  { id: 'NP', label: 'Nurturing Parent', color: '#16A34A' },
  { id: 'A', label: 'Adult', color: '#2563EB' },
  { id: 'FC', label: 'Free Child', color: '#EAB308' },
  { id: 'HC', label: 'Helpless Child', color: '#9333EA' },
  { id: 'DC', label: 'Defensive Child', color: '#0F766E' }
]

export const egoStateAnalysis = {
  type: 'ego-state-analysis',
  id: 'ego-state-analysis-v1',
  title: 'EGO STATE ANALYSIS',
  externalOnly: true,
  description:
    'The next several pages contain a series of optional choice statements. Make 2 choices for each statement.',
  intro:
    'Score a 2 for the choice that BEST describes you and a 1 for the choice that describes the NEXT best. LEAVE THE OTHERS BLANK.',
  themeColor: '#F1C40F',
  egoStates,
  questions: [
    {
      id: 'q1',
      text: 'Disregarding income, the career I would like would be:',
      options: [
        { id: 'a', text: 'Owning and running my own business.' },
        { id: 'b', text: 'Being some type of counselor or advisor.' },
        { id: 'c', text: 'Being around and close to people.' },
        { id: 'd', text: 'About what I am doing now or where I am going.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP', d: 'A' }
    },
    {
      id: 'q2',
      text: 'Other people like me because:',
      options: [
        { id: 'a', text: 'They know they can depend on me in time of need.' },
        { id: 'b', text: 'I show care and concern for them as a person.' },
        { id: 'c', text: 'I am honest and straightforward with them.' },
        { id: 'd', text: 'I usually enjoy what I am doing.' }
      ],
      scoreMap: { a: 'RP', b: 'NP', c: 'A', d: 'FC' }
    },
    {
      id: 'q3',
      text: 'When family members or friends become upset or worried, I tend to:',
      options: [
        { id: 'a', text: 'Show my concern for their feelings but do not offer advice.' },
        { id: 'b', text: 'Listen closely but do not offer advice unless specifically asked.' },
        { id: 'c', text: 'Try to get them into a better mood by suggesting something fun to do.' },
        { id: 'd', text: 'Advise them on how I think they could solve their problems.' }
      ],
      scoreMap: { a: 'NP', b: 'A', c: 'FC', d: 'HC' }
    },
    {
      id: 'q4',
      text: 'When someone gets on me for doing something wrong, I usually:',
      options: [
        { id: 'a', text: 'Calmly hear them out before saying something.' },
        { id: 'b', text: 'Do what the situation calls for without getting upset.' },
        { id: 'c', text: 'Apologize for the mistake and try to do better.' },
        { id: 'd', text: 'Explain how or why the mistake happened.' }
      ],
      scoreMap: { a: 'A', b: 'FC', c: 'HC', d: 'DC' }
    },
    {
      id: 'q5',
      text: 'When I think about government and politicians in general:',
      options: [
        { id: 'a', text: 'I get fed up with the overall mess they have made.' },
        { id: 'b', text: 'I vote my convictions and do not hassle myself.' },
        { id: 'c', text: 'I realize how little I can do about it.' },
        { id: 'd', text: 'I get sort of angry at some of the ridiculous laws they have passed.' }
      ],
      scoreMap: { a: 'CP', b: 'FC', c: 'HC', d: 'DC' }
    },
    {
      id: 'q6',
      text: 'Many of my problems come from:',
      options: [
        { id: 'a', text: 'Getting others to do what they should.' },
        { id: 'b', text: 'Getting others to think for themselves.' },
        { id: 'c', text: 'Lacking courage and confidence in myself.' },
        { id: 'd', text: 'Convincing others to let me do things my own way.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'HC', d: 'DC' }
    },
    {
      id: 'q7',
      text: 'When someone is doing something that I think is wrong, I usually:',
      options: [
        { id: 'a', text: 'Show them the right way to do it.' },
        { id: 'b', text: 'Try to help them see what is really correct.' },
        { id: 'c', text: 'Ask if they have considered other ways.' },
        { id: 'd', text: 'Tell them what will happen if they do it wrong.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP', d: 'DC' }
    },
    {
      id: 'q8',
      text: 'Generally speaking, the most successful people:',
      options: [
        { id: 'a', text: 'Work hard and fulfill their responsibilities.' },
        { id: 'b', text: 'Seem to know who they are and what they want.' },
        { id: 'c', text: 'Have the courage and confidence to think and act on their own.' }
      ],
      scoreMap: { a: 'CP', b: 'A', c: 'HC' }
    },
    {
      id: 'q9',
      text: 'Generally speaking, people who get the most from life:',
      options: [
        { id: 'a', text: 'Are willing to give of themselves to help others.' },
        { id: 'b', text: 'Handle life’s problems in a very practical manner.' },
        { id: 'c', text: 'Don’t worry or concern themselves with small problems.' }
      ],
      scoreMap: { a: 'RP', b: 'A', c: 'DC' }
    },
    {
      id: 'q10',
      text: 'Most people would enjoy better health if they would:',
      options: [
        { id: 'a', text: 'Keep themselves in better physical condition.' },
        { id: 'b', text: 'Worry less and take better care of themselves.' },
        { id: 'c', text: 'Accept and like themselves more.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP' }
    },
    {
      id: 'q11',
      text: 'When a person makes a mistake, he/she should:',
      options: [
        { id: 'a', text: 'Learn from his/her error and not do it again.' },
        { id: 'b', text: 'Recognize that everyone makes mistakes.' },
        { id: 'c', text: 'Forgive him/herself for the error.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP' }
    },
    {
      id: 'q12',
      text: 'You are to take care of 3 four-year-old children for two hours while their mothers are shopping. You will:',
      options: [
        { id: 'a', text: 'Help them find something interesting and fun to do.' },
        { id: 'b', text: 'Observe their activities so they do not hurt themselves or others.' },
        { id: 'c', text: 'Get down on the floor and play with them.' }
      ],
      scoreMap: { a: 'NP', b: 'A', c: 'FC' }
    },
    {
      id: 'q13',
      text: 'You have been planning several weeks on a "fun" type weekend with another couple. At the last moment, they call and say they have decided not to go. You will probably:',
      options: [
        { id: 'a', text: 'Go ahead without them or find something else fun to do instead.' },
        { id: 'b', text: 'Postpone your plans and feel somewhat disappointed.' },
        { id: 'c', text: 'Try to talk them into changing their minds and going with you.' }
      ],
      scoreMap: { a: 'FC', b: 'HC', c: 'DC' }
    },
    {
      id: 'q14',
      text: 'At a party, someone accidentally spills ice cream on your clothing. You will:',
      options: [
        { id: 'a', text: 'Clean it up as best you can and enjoy yourself.' },
        { id: 'b', text: 'Go home and change or leave as soon as possible.' },
        { id: 'c', text: 'Feel anger at the person who was so clumsy.' }
      ],
      scoreMap: { a: 'FC', b: 'HC', c: 'DC' }
    },
    {
      id: 'q15',
      text: 'Others might describe you as:',
      options: [
        { id: 'a', text: 'Strong, firm, decisive.' },
        { id: 'b', text: 'Informed, wise, helpful.' },
        { id: 'c', text: 'Kind, loving, understanding.' },
        { id: 'd', text: 'Straightforward, self-confident, well-organized.' },
        { id: 'e', text: 'Fun to be with, very much alive, spontaneous.' },
        { id: 'f', text: 'Helpful, agreeable, cooperative.' },
        { id: 'g', text: 'Clever, somewhat rebellious, independent.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP', d: 'A', e: 'FC', f: 'HC', g: 'DC' }
    },
    {
      id: 'q16',
      text: 'As I think about myself, I find that:',
      options: [
        { id: 'a', text: 'I am often critical of others’ thoughts and actions.' },
        { id: 'b', text: 'Others seem to come to me for advice.' },
        { id: 'c', text: 'I demonstrate a real concern for others’ feelings.' },
        { id: 'd', text: 'I listen well when others are talking.' },
        { id: 'e', text: 'I do a lot of different things for enjoyment.' },
        { id: 'f', text: 'I am not as self-confident as I want to be.' },
        { id: 'g', text: 'I like to discuss controversial subjects.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP', d: 'A', e: 'FC', f: 'HC', g: 'DC' }
    },
    {
      id: 'q17',
      text: 'Perhaps my greatest personal assets are:',
      options: [
        { id: 'a', text: 'My ability to do a job well.' },
        { id: 'b', text: 'My concern to help others do better.' },
        { id: 'c', text: 'My sincerity in dealing with others.' },
        { id: 'd', text: 'My ability to evaluate situations and make decisions.' },
        { id: 'e', text: 'My ability to enjoy life and other people.' },
        { id: 'f', text: 'My loyalty to people, ideals and beliefs.' },
        { id: 'g', text: 'My ability to take care of myself.' }
      ],
      scoreMap: { a: 'CP', b: 'RP', c: 'NP', d: 'A', e: 'FC', f: 'HC', g: 'DC' }
    }
  ]
}
