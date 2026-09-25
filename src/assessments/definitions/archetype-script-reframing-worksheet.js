export const archetypeScriptReframingWorksheet = {
  type: 'fillable-worksheet',
  id: 'archetype-script-reframing-worksheet-v1',
  title: 'Archetype Script Reframing',
  introVariant: 'archetype-worksheet',
  archetypeSelection: true,
  description:
    'This guided worksheet helps you examine the money beliefs connected to one financial archetype. You will explore the feelings, assumptions, and learned messages shaping your Old Story, then reflect on a more balanced New Story from the Adult ego-state.',
  themeColor: '#38BDF8',
  intro:
    'Choose the archetype identified in your previous assessment. Complete both its Old Story and New Story prompts from your real experience rather than what feels ideal.',
  completionInstructions:
    'Select the archetype that matched your result in the Unlock Your Financial Frequency assessment. You will complete only that archetype\'s worksheet.',
  archetypeSelectionPrompt: 'Choose your financial archetype:',
  worksheetIntro:
    'Complete every blank in your Old Story and New Story.',
  sections: [
    {
      id: 'guardian',
      title: 'Guardian',
      oldStory: [
        { parts: ['When I think about spending money or taking financial risks, I feel ', { id: 'spending_risks_feel' }, '.'] },
        { parts: ['The first thing I imagine might happen is ', { id: 'spend_too_much_happen' }, '.'] },
        { parts: ['Growing up, I learned that money meant ', { id: 'money_is' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'guardian_decision' }, '.'] },
        { parts: ['Since then, I have often told myself: "', { id: 'guardian_carried_story' }, '."'] },
        { parts: ['This belief has affected the way I earn, spend, save, or invest by ', { id: 'guardian_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I recognize that my childhood decision helped me feel safe, but it does not have to guide every financial decision I make.' },
        { parts: ['I now choose to believe that ', { id: 'money_can_be' }, '.'] },
        { parts: ['When I make financial decisions from my Adult self, I can ', { id: 'spending_mindfully_allows' }, '.'] },
        { parts: ['My new financial story is: "', { id: 'guardian_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'pleasure_seeker',
      title: 'Pleasure Seeker',
      oldStory: [
        { parts: ['When I want something, I usually feel ', { id: 'want_buy_feel' }, '.'] },
        { parts: ["I often tell myself that if I don't have it now, ", { id: 'dont_enjoy_now' }, '.'] },
        { parts: ['Growing up, I learned that money was for ', { id: 'money_used_for' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'pleasure_seeker_decision' }, '.'] },
        { parts: ['Since then, my financial story has been: "', { id: 'pleasure_seeker_carried_story' }, '."'] },
        { parts: ['This has influenced my financial choices by ', { id: 'pleasure_seeker_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I understand that enjoyment and responsibility can exist together.' },
        { parts: ['I choose to believe that ', { id: 'pleasure_seeker_new_belief' }, '.'] },
        { text: 'I can experience pleasure while also honoring my future.' },
        { parts: ['My new financial story is: "', { id: 'pleasure_seeker_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'idealist',
      title: 'Idealist',
      oldStory: [
        { parts: ['When I think about earning or having more money, I sometimes feel ', { id: 'charging_feel' }, '.'] },
        { parts: ['Part of me believes that money is ', { id: 'caring_money_makes_me' }, '.'] },
        { parts: ['Growing up, I learned that wealth was associated with ', { id: 'wealth_associated_with' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'idealist_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'idealist_carried_story' }, '."'] },
        { parts: ['This has affected my financial choices by ', { id: 'idealist_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I understand that money is a resource that reflects the intentions of the person using it.' },
        { parts: ['I choose to believe that ', { id: 'idealist_new_belief' }, '.'] },
        { text: 'Financial prosperity can support both my wellbeing and my values.' },
        { parts: ['My new financial story is: "', { id: 'idealist_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'saver',
      title: 'Saver',
      oldStory: [
        { parts: ['When I spend money on myself, I usually feel ', { id: 'spend_feel' }, '.'] },
        { parts: ['My biggest financial fear is ', { id: 'what_if_happens' }, '.'] },
        { parts: ['Growing up, I learned that having money meant ', { id: 'saving_is' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'saver_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'saver_carried_story' }, '."'] },
        { parts: ['This has affected my financial life by ', { id: 'saver_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I recognize that security comes from wise decisions, not fear alone.' },
        { parts: ['I choose to believe that ', { id: 'saver_new_belief' }, '.'] },
        { text: 'I can save intentionally while also enjoying what I have created.' },
        { parts: ['My new financial story is: "', { id: 'saver_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'star',
      title: 'Star',
      oldStory: [
        { parts: ['When people notice my success, I feel ', { id: 'not_successful_feel' }, '.'] },
        { parts: ["When they don't, I feel ", { id: 'respect_unless' }, '.'] },
        { parts: ['Growing up, I learned that being valued depended on ', { id: 'admired_tied_to' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'star_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'star_carried_story' }, '."'] },
        { parts: ['This has shaped my financial decisions by ', { id: 'star_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I recognize that my value is not determined by recognition or appearance.' },
        { parts: ['I choose to believe that ', { id: 'star_new_belief' }, '.'] },
        { text: 'My financial choices can reflect my authentic values rather than my need for approval.' },
        { parts: ['My new financial story is: "', { id: 'star_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'innocent',
      title: 'Innocent',
      oldStory: [
        { parts: ['When I think about managing money, I feel ', { id: 'management_feel' }, '.'] },
        { parts: ['I tend to avoid it because ', { id: 'tend_to' }, '.'] },
        { parts: ['Growing up, I learned that money was ', { id: 'money_seemed' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'innocent_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'innocent_carried_story' }, '."'] },
        { parts: ['This has affected my financial confidence by ', { id: 'innocent_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I recognize that financial confidence is built through small, consistent steps.' },
        { parts: ['I choose to believe that ', { id: 'innocent_new_belief' }, '.'] },
        { text: 'I am capable of learning, making informed decisions, and growing over time.' },
        { parts: ['My new financial story is: "', { id: 'innocent_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'caretaker',
      title: 'Caretaker',
      oldStory: [
        { parts: ['When someone needs help, I immediately feel ', { id: 'help_feel' }, '.'] },
        { parts: ["I believe that if I don't help, ", { id: 'responsible_for' }, '.'] },
        { parts: ['Growing up, I learned that love meant ', { id: 'caring_meant' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'caretaker_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'caretaker_carried_story' }, '."'] },
        { parts: ['This has influenced my relationship with money by ', { id: 'caretaker_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I understand that caring for myself allows me to care for others more sustainably.' },
        { parts: ['I choose to believe that ', { id: 'caretaker_new_belief' }, '.'] },
        { text: 'I can give generously without abandoning my own wellbeing.' },
        { parts: ['My new financial story is: "', { id: 'caretaker_new_financial_story' }, '."'] }
      ]
    },
    {
      id: 'empire_builder',
      title: 'Empire Builder',
      oldStory: [
        { parts: ['When I slow down or rest, I feel ', { id: 'slowing_down_feel' }, '.'] },
        { parts: ['I worry that if I stop striving, ', { id: 'if_rest_happen' }, '.'] },
        { parts: ['Growing up, I learned that success meant ', { id: 'success_defined_by' }, '.'] },
        { parts: ['Because of those experiences, I decided that ', { id: 'empire_builder_decision' }, '.'] },
        { parts: ['The story I have carried is: "', { id: 'empire_builder_carried_story' }, '."'] },
        { parts: ['This has influenced the way I work and manage money by ', { id: 'empire_builder_financial_effect' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I understand that sustainable success includes balance, rest, and meaningful relationships.' },
        { parts: ['I choose to believe that ', { id: 'empire_builder_new_belief' }, '.'] },
        { text: 'Achievement can enhance my life without defining my worth.' },
        { parts: ['My new financial story is: "', { id: 'empire_builder_new_financial_story' }, '."'] }
      ]
    }
  ]
};
