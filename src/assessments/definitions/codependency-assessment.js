export const codependencyAssessment = {
  type: 'binary-scored',
  id: 'codependency-assessment-v1',
  title: 'Friel Co-Dependency Assessment Inventory',
  externalOnly: true,
  logo: '/Codependancylogo.jpg',
  description:
    'Below are a number of True / False statements dealing with how you feel about yourself, your life and those around you.',
  intro:
    'As your mark True or False for each question, be sure to answer honestly, but do not spend too much time dwelling on any one question. There are no right or wrong answers. Take each question as it comes and answer as you usually feel.',
  themeColor: '#F1C40F',
  options: [
    { label: 'True', value: true },
    { label: 'False', value: false }
  ],
  questions: [
    { id: 'q1', text: 'I make enough time to do things for myself every week.', scoreWhen: false },
    { id: 'q2', text: 'I spend lots of time criticizing myself after an interaction with someone.', scoreWhen: true },
    { id: 'q3', text: 'I would not be embarrassed if people knew certain things about me.', scoreWhen: false },
    { id: 'q4', text: "Sometimes I feel like I just waste a lot of time and don't get anywhere.", scoreWhen: true },
    { id: 'q5', text: 'I take good enough care of myself.', scoreWhen: false },
    { id: 'q6', text: 'It is usually best not to tell someone they bother you; it only causes fights and gets everyone upset.', scoreWhen: true },
    { id: 'q7', text: 'I am happy about the way my family communicated when I was growing up.', scoreWhen: false },
    { id: 'q8', text: "Sometimes I don't know how I really feel.", scoreWhen: true },
    { id: 'q9', text: 'I am very satisfied with my intimate love life.', scoreWhen: false },
    { id: 'q10', text: "I've been feeling tired lately.", scoreWhen: true },
    { id: 'q11', text: 'When I was growing up, my family liked to talk openly about problems.', scoreWhen: false },
    { id: 'q12', text: 'I often look happy when I am sad or angry.', scoreWhen: true },
    { id: 'q13', text: 'I am satisfied with the number and kind of relationships I have in my life.', scoreWhen: false },
    { id: 'q14', text: 'Even if I had the time and money to do it, I would feel uncomfortable taking a vacation by myself.', scoreWhen: true },
    { id: 'q15', text: 'I have enough help with everything that I must do every day.', scoreWhen: false },
    { id: 'q16', text: 'I with that I could accomplish a lot more than I do now.', scoreWhen: true },
    { id: 'q17', text: 'My family taught me to express feelings and affection openly when I was growing up.', scoreWhen: false },
    { id: 'q18', text: 'It is hard for me to talk to someone in authority (boss, teachers, etc.).', scoreWhen: true },
    { id: 'q19', text: 'When I am in a relationship that becomes too confusing and complicated, I have no trouble getting out of it.', scoreWhen: false },
    { id: 'q20', text: 'I sometimes feel pretty confused about who I am and where I want to go with my life.', scoreWhen: true },
    { id: 'q21', text: 'I am satisfied with the way I take care of my own needs.', scoreWhen: false },
    { id: 'q22', text: 'I am not satisfied with my career.', scoreWhen: true },
    { id: 'q23', text: 'I usually handle my problems calmly and directly.', scoreWhen: false },
    { id: 'q24', text: "I hold back my feelings much of the time because I don't want to hurt other people or have them think less of me.", scoreWhen: true },
    { id: 'q25', text: 'I don\'t feel like I\'m "in a rut" very often.', scoreWhen: false },
    { id: 'q26', text: 'I am not satisfied with my friendships.', scoreWhen: true },
    { id: 'q27', text: "When someone hurts my feelings or does something I don't like, I have little difficulty telling them about it.", scoreWhen: false },
    { id: 'q28', text: 'When a close friend or relative asks for my help more than I\'d like, I usually say "yes" anyway.', scoreWhen: true },
    { id: 'q29', text: 'I love to face new problems and am good at finding solutions for them.', scoreWhen: false },
    { id: 'q30', text: 'I do not feel good about my childhood.', scoreWhen: true },
    { id: 'q31', text: 'I am not concerned about my health a lot.', scoreWhen: false },
    { id: 'q32', text: 'I often feel like no one really knows me.', scoreWhen: true },
    { id: 'q33', text: 'I feel calm and peaceful most of the time.', scoreWhen: false },
    { id: 'q34', text: 'I find it difficult to ask for what I want.', scoreWhen: true },
    { id: 'q35', text: "I don't let people take advantage of me.", scoreWhen: false },
    { id: 'q36', text: 'I am dissatisfied with at least one of my close relationships.', scoreWhen: true },
    { id: 'q37', text: 'I make major decisions quite easily.', scoreWhen: false },
    { id: 'q38', text: "I don't trust myself in new situations as much as I'd like.", scoreWhen: true },
    { id: 'q39', text: "I am very good at knowing when to speak up and when to go along with others' wishes.", scoreWhen: false },
    { id: 'q40', text: 'I wish I had more time away from my work.', scoreWhen: true },
    { id: 'q41', text: "I am as spontaneous as I'd like to be.", scoreWhen: false },
    { id: 'q42', text: 'Being alone is a problem for me.', scoreWhen: true },
    { id: 'q43', text: 'When someone I love is bothering me, I have no problem telling them so.', scoreWhen: false },
    { id: 'q44', text: "I often have so many things going on at once that I'm really not doing justice to any one of them.", scoreWhen: true },
    { id: 'q45', text: 'I am very comfortable letting others into my life and letting them see the "real me".', scoreWhen: false },
    { id: 'q46', text: 'I apologize to others too much for what I say or do.', scoreWhen: true },
    { id: 'q47', text: 'I have no problem telling people when I am angry with them.', scoreWhen: false },
    { id: 'q48', text: "There's so much to do and not enough time.", scoreWhen: true },
    { id: 'q49', text: 'I have few regrets about what I have done with my life.', scoreWhen: false },
    { id: 'q50', text: 'I tend to think of others more than I do of myself.', scoreWhen: true },
    { id: 'q51', text: 'More often than not, my life has gone the way I wanted it to.', scoreWhen: false },
    { id: 'q52', text: "People admire me because I'm so understanding of others, even when they do something that annoys me.", scoreWhen: true },
    { id: 'q53', text: 'I am comfortable with my own sexuality.', scoreWhen: false },
    { id: 'q54', text: 'I sometimes feel embarrassed by the behavior of those close to me.', scoreWhen: true },
    { id: 'q55', text: 'The important people in my life know the "real me" and I am okay with them knowing.', scoreWhen: false },
    { id: 'q56', text: 'I do my share of work and often do a bit more.', scoreWhen: true },
    { id: 'q57', text: 'I do not feel that everything would fall apart without my efforts and attention.', scoreWhen: false },
    { id: 'q58', text: 'I do too much for other people and then later wonder why I did so.', scoreWhen: true },
    { id: 'q59', text: 'I am happy about the way my family coped with problems when I was growing up.', scoreWhen: false },
    { id: 'q60', text: 'I wish that I had more people to do things with.', scoreWhen: true }
  ],
  scoring: {
    instructions:
      'Give yourself one point for the number of "False" answers to the odd-numbered questions and one point for the number of "True" answers to the even-numbered questions to get your score.',
    thresholds: [
      {
        min: 0,
        max: 20,
        rangeLabel: 'Below 20',
        label: 'You have Little Need for Concern',
        category: 'Healthy Interdependence',
        points: [
          'Maintains a balance between independence and connection in relationships.',
          'Capable of setting boundaries and expressing needs.',
          'Supports others without sacrificing personal well-being.'
        ]
      },
      {
        min: 21,
        max: 30,
        rangeLabel: '21 - 30',
        label: 'Moderate Need for Concern.',
        category: 'Mild Codependency',
        points: [
          'Displays occasional codependent tendencies.',
          "May prioritize others' needs over personal needs.",
          'Struggles with setting boundaries but not pervasive or severely detrimental.'
        ]
      },
      {
        min: 31,
        max: 45,
        rangeLabel: '31 - 45',
        label: 'Moderate to Severe Need for Concern.',
        category: 'Moderate Codependency',
        points: [
          'Exhibits more pronounced codependent behaviors.',
          'Difficulty making independent decisions.',
          'Strong need for validation, and anxiety when not in a relationship.',
          'Challenges in setting and maintaining boundaries.'
        ]
      },
      {
        min: 46,
        max: 50,
        rangeLabel: '46 - 50',
        label: 'Severe Need for Concern & Intervention',
        category: 'Severe Codependency',
        points: [
          'Significant loss of self-identity.',
          'Overwhelming need to please others.',
          'Low self-esteem and struggles with assertiveness.',
          'Difficulty functioning independently, intense fear of abandonment.'
        ]
      },
      {
        min: 51,
        max: 60,
        rangeLabel: '51 - 60',
        label: 'Severe Need for Concern & Intervention',
        category: 'Pathological Codependency',
        points: [
          'Complete loss of sense of self.',
          'Relies entirely on others for identity.',
          'Extreme anxiety when alone.',
          'Engages in self-destructive behaviors to maintain relationships.',
          'Requires professional intervention and therapeutic support for recovery.'
        ]
      }
    ]
  }
}
