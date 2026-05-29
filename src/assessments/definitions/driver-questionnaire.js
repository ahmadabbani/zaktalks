export const driverQuestionnaire = {
  type: 'driver-questionnaire',
  id: 'driver-questionnaire-v1',
  title: 'THE DRIVER QUESTIONNAIRE',
  externalOnly: true,
  introVariant: 'driver',
  description:
    'This questionnaire is not a ‘personality test’. It is intended to stimulate your self-awareness and indicate that kind of stress behaviour you may typically or frequently get into.',
  intro:
    'Beside each question write the most appropriate response for you.\n‘YES’, ‘NO’ or ‘TO SOME EXTENT’.',
  themeColor: '#F1C40F',
  options: [
    { label: 'YES', value: 1 },
    { label: 'NO', value: 0 },
    { label: 'TO SOME EXTENT', value: 0.5 }
  ],
  questions: [
    { id: 'q1', text: 'Do you set yourself high standards and then criticize yourself for failing to meet them?' },
    { id: 'q2', text: 'Is it important for you to be right?' },
    { id: 'q3', text: 'Do you feel discomforted (e.g. annoyed, irritated) by small messes or discrepancies such as a spot on a garment or the wallpaper; an ornament or tool out of place; a disorderly presentation of work?' },
    { id: 'q4', text: 'Do you hate to be interrupted?' },
    { id: 'q5', text: 'Do you like to explain things in detail and precisely?' },
    { id: 'q6', text: 'Do you do things (especially for others) that you don’t really want to do?' },
    { id: 'q7', text: 'Is it important for you to be liked?' },
    { id: 'q8', text: 'Are you fairly easily persuaded?' },
    { id: 'q9', text: 'Do you dislike being different?' },
    { id: 'q10', text: 'Do you dislike conflict?' },
    { id: 'q11', text: 'Do you have a tendency to do a lot of things simultaneously?' },
    { id: 'q12', text: 'Would you describe yourself as ‘quick’ and find yourself getting impatient with others?' },
    { id: 'q13', text: 'Do you have a tendency to talk at the same time as others, or finish their sentences for them?' },
    { id: 'q14', text: 'Do you like to ‘get on with the job’ rather than talk about it?' },
    { id: 'q15', text: 'Do you set unrealistic time limits (especially too short)?' },
    { id: 'q16', text: 'Do you hide or control your feelings?' },
    { id: 'q17', text: 'Are you reluctant to ask for help?' },
    { id: 'q18', text: 'Do you have a tendency to put yourself (or find yourself) in the position of being depended upon?' },
    { id: 'q19', text: 'Do you have a tendency not to realize how tired, or hungry, or ill you are, but instead ‘keep going’?' },
    { id: 'q20', text: 'Do you prefer to do things on your own?' },
    { id: 'q21', text: 'Do you hate ‘giving up’ or ‘giving in’, always hoping that this time what you are doing will work?' },
    { id: 'q22', text: 'Do you have a tendency to start things and not finish them?' },
    { id: 'q23', text: 'Do you tend to compare yourself (or your performance) with others and feel inferior or superior accordingly?' },
    { id: 'q24', text: 'Do you find yourself going round in circles with a problem, feeling stuck but unable to let go of it?' },
    { id: 'q25', text: 'Do you have a tendency to be the ‘rebel’ or the ‘odd one out’ in a group?' }
  ],
  sections: [
    { id: 'be_perfect', label: 'Be Perfect Driver', rangeLabel: '1 - 5', questionIds: ['q1', 'q2', 'q3', 'q4', 'q5'] },
    { id: 'please', label: 'Please Driver', rangeLabel: '6 - 10', questionIds: ['q6', 'q7', 'q8', 'q9', 'q10'] },
    { id: 'hurry_up', label: 'Hurry Up Driver', rangeLabel: '11 - 15', questionIds: ['q11', 'q12', 'q13', 'q14', 'q15'] },
    { id: 'be_strong', label: 'Be Strong Driver', rangeLabel: '16 - 20', questionIds: ['q16', 'q17', 'q18', 'q19', 'q20'] },
    { id: 'try_hard', label: 'Try Hard Driver', rangeLabel: '21 - 25', questionIds: ['q21', 'q22', 'q23', 'q24', 'q25'] }
  ],
  scoring: {
    tendencyThreshold: 3,
    instructions:
      'A score of 3 or more in any section indicates a tendency towards that particular driver. Most people experience all the drivers at different times, but generally have two or three drivers which crop up regularly.\nYES = 1 POINT\nNO = 0\nTO SOME EXTENT = ½ POINT'
  },
  characteristics: [
    {
      id: 'be_perfect',
      title: 'Be Perfect',
      description:
        'Be Perfect people draw energy from doing the ‘right’ things. We aim for perfection in everything, check carefully, produce accurate work and set high standards. The drawback to this driver is sometimes we miss deadlines because we are still checking our work. We tend to have a weak sense of priorities and insist everything is done perfectly.'
    },
    {
      id: 'be_strong',
      title: 'Be Strong',
      description:
        'Be Strong individuals have the ability to stay calm in any circumstance. We are driven by the need to cope with crises, and difficult people, and will work steadily through any workload. However, our desire to have everything under control means we can come across as aloof and may not always ask for help.'
    },
    {
      id: 'hurry_up',
      title: 'Hurry Up',
      description:
        'People with Hurry Up styles like to do everything as quickly as they can, which means we get a lot done. We are energised by having deadlines to meet, and always seem able to fit in extra tasks. However, give us time to spare and we delay starting until the job becomes urgent. This can backfire because in our haste we make mistakes.'
    },
    {
      id: 'please_others',
      title: 'Please Others',
      description:
        'This working style means we are nice to have around because we are so understanding. We use intuition a lot and will notice body language and other signals that others may overlook. The drawbacks to this are serious, we avoid the slightest risk of upsetting someone. We may be so cautious with criticism that our information is ignored.'
    },
    {
      id: 'try_hard',
      title: 'Try Hard',
      description:
        'Try Hard people are enthusiastic, we get involved in lots of different activities, and tend to volunteer for things. We are energised by having something new to try. But sometimes we turn small jobs into major projects because we want to chase every possibility. We may even become bored with the detailed work that follows, even to the point of leaving work undone so we can move on to a new, exciting activity.'
    }
  ]
}
