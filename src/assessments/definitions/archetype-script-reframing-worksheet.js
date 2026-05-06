export const archetypeScriptReframingWorksheet = {
  type: 'fillable-worksheet',
  id: 'archetype-script-reframing-worksheet-v1',
  title: 'Archetype Script Reframing Worksheet',
  description:
    'Reflect on the emotional roots of your money beliefs, then write a new story from your Adult ego-state.',
  themeColor: '#38BDF8',
  intro:
    'This expanded worksheet allows each financial archetype to reflect deeply on their internalized money beliefs. Use the prompts below to explore the emotional roots of your "Old Story" (typically formed in childhood) and consciously craft a "New Story" from your Adult ego-state.',
  sections: [
    {
      id: 'guardian',
      title: 'Guardian',
      oldStory: [
        { parts: ['When I think about spending or taking risks with money, I feel ', { id: 'spending_risks_feel' }, '.'] },
        { parts: ['This is because I believe that if I spend too much, ', { id: 'spend_too_much_happen' }, ' might happen.'] },
        { parts: ['Growing up, I learned that money is ', { id: 'money_is' }, ' and that safety means ', { id: 'safety_means' }, '.'] }
      ],
      newStory: [
        { parts: ['Now, as an adult, I understand that money can also be ', { id: 'money_can_be' }, '.'] },
        { parts: ['Spending mindfully allows me to ', { id: 'spending_mindfully_allows' }, ' without sacrificing my sense of security.'] },
        { text: "My new belief is: 'I can trust myself to make balanced and safe financial choices.'" }
      ]
    },
    {
      id: 'pleasure_seeker',
      title: 'Pleasure Seeker',
      oldStory: [
        { parts: ['When I see something I want to buy or do, I immediately feel ', { id: 'want_buy_feel' }, '.'] },
        { parts: ["I often think, 'If I don't enjoy this now, ", { id: 'dont_enjoy_now' }, ".'"] },
        { parts: ['As a child, I learned that money should be used for ', { id: 'money_used_for' }, ' and that planning was ', { id: 'planning_was' }, '.'] }
      ],
      newStory: [
        { text: 'Today, I recognize that true joy includes planning and balance.' },
        { text: 'Money is a tool for both spontaneous fun and thoughtful security.' },
        { text: "My new belief is: 'I deserve pleasure and peace through conscious choices.'" }
      ]
    },
    {
      id: 'idealist',
      title: 'Idealist',
      oldStory: [
        { parts: ['When I deal with money or think about charging for my services, I feel ', { id: 'charging_feel' }, '.'] },
        { parts: ['This is rooted in my belief that caring about money makes me ', { id: 'caring_money_makes_me' }, '.'] },
        { parts: ['In my family or culture, wealth was associated with ', { id: 'wealth_associated_with' }, '.'] }
      ],
      newStory: [
        { text: 'Now I believe that being financially healthy empowers me to serve better.' },
        { text: 'Money is a neutral tool - it takes on the values I assign to it.' },
        { text: "My new belief is: 'I can live my values and thrive financially.'" }
      ]
    },
    {
      id: 'saver',
      title: 'Saver',
      oldStory: [
        { parts: ['When I spend money, especially on non-essentials, I feel ', { id: 'spend_feel' }, '.'] },
        { parts: ["I tend to think, 'What if ", { id: 'what_if_happens' }, " happens? I need to save just in case.'"] },
        { parts: ['I was taught that saving is ', { id: 'saving_is' }, ', while spending is ', { id: 'spending_is' }, '.'] }
      ],
      newStory: [
        { text: 'Now I realize that intentional spending can be a form of self-care and trust.' },
        { text: 'Saving is still important, but joy and presence are part of financial wellness too.' },
        { text: "My new belief is: 'I am allowed to enjoy what I've earned in ways that nourish me.'" }
      ]
    },
    {
      id: 'star',
      title: 'Star',
      oldStory: [
        { parts: ["When I don't appear successful, I feel ", { id: 'not_successful_feel' }, '.'] },
        { parts: ["I often think, 'People won't respect me unless ", { id: 'respect_unless' }, ".'"] },
        { parts: ['I grew up believing that being seen and admired was tied to ', { id: 'admired_tied_to' }, '.'] }
      ],
      newStory: [
        { text: 'Today I understand that my true power lies in authenticity, not appearance.' },
        { text: "I don't need to prove my value through image." },
        { text: "My new belief is: 'I am enough without performing. My essence shines beyond status.'" }
      ]
    },
    {
      id: 'innocent',
      title: 'Innocent',
      oldStory: [
        { parts: ['When I think about money management, I feel ', { id: 'management_feel' }, ' and tend to ', { id: 'tend_to' }, '.'] },
        { parts: ["I believe that if I look too closely at my finances, I'll feel ", { id: 'look_closely_feel' }, '.'] },
        { parts: ['Growing up, money seemed ', { id: 'money_seemed' }, ' and no one showed me ', { id: 'no_one_showed' }, '.'] }
      ],
      newStory: [
        { text: 'Now I realize that learning about money is possible one step at a time.' },
        { text: 'I am capable of building financial knowledge gently and consistently.' },
        { text: "My new belief is: 'I am learning, growing, and becoming financially confident.'" }
      ]
    },
    {
      id: 'caretaker',
      title: 'Caretaker',
      oldStory: [
        { parts: ['When someone needs financial help, I feel ', { id: 'help_feel' }, ' and responsible for ', { id: 'responsible_for' }, '.'] },
        { parts: ['I often give because I believe ', { id: 'give_because' }, '.'] },
        { parts: ['In my past, caring meant ', { id: 'caring_meant' }, ', even if it cost me ', { id: 'cost_me' }, '.'] }
      ],
      newStory: [
        { text: 'Today I know that sustainable giving begins with self-care.' },
        { text: 'I can support others without self-sacrifice.' },
        { text: "My new belief is: 'Saying no at times is a form of love and strength.'" }
      ]
    },
    {
      id: 'empire_builder',
      title: 'Empire Builder',
      oldStory: [
        { parts: ['When I consider slowing down or taking a break, I feel ', { id: 'slowing_down_feel' }, '.'] },
        { parts: ['I believe that if I rest, ', { id: 'if_rest_happen' }, ' might happen.'] },
        { parts: ['Success was always defined by ', { id: 'success_defined_by' }, ', and I learned that rest meant ', { id: 'rest_meant' }, '.'] }
      ],
      newStory: [
        { text: 'Now I understand that rest fuels resilience.' },
        { text: 'My long-term vision thrives when I include joy, connection, and well-being.' },
        { text: "My new belief is: 'Success is sustainable when it includes rest and balance.'" }
      ]
    }
  ]
};
