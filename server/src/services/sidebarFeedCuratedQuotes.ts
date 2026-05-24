/** Curated sidebar feed quotes — idempotently seeded under Motivation. */
export type CuratedFeedFolder = {
  name: string;
  sortOrder: number;
  items: Array<string>;
};

export const CURATED_MOTIVATION_FOLDERS: Array<CuratedFeedFolder> = [
  {
    name: 'General',
    sortOrder: 0,
    items: [
      'Small steps compound.',
      'Focus on the next action.',
      'Progress beats perfection.',
      'Show up, even when it is hard.',
      'Clarity comes from doing.',
      'One thing at a time.',
      'It does not matter how slowly you go as long as you do not stop. — Confucius',
      'Start where you are. Use what you have. Do what you can. — Arthur Ashe',
      'You miss 100% of the shots you do not take. — Wayne Gretzky',
      'The only way to do great work is to love what you do. — Steve Jobs',
      'Believe you can and you are halfway there. — Theodore Roosevelt',
      'Fall seven times, stand up eight. — Japanese proverb',
    ],
  },
  {
    name: 'Movies',
    sortOrder: 1,
    items: [
      'It ain\'t about how hard you hit. It\'s about how hard you can get hit and keep moving forward. — Rocky Balboa, Rocky',
      'Get busy living, or get busy dying. — Andy Dufresne, The Shawshank Redemption',
      'Hope is a good thing, maybe the best of things, and no good thing ever dies. — Andy Dufresne, The Shawshank Redemption',
      'You got a dream. You gotta protect it. If you want something, go get it. Period. — Chris Gardner, The Pursuit of Happyness',
      'Do. Or do not. There is no try. — Yoda, Star Wars',
      'Yesterday is history, tomorrow is a mystery, but today is a gift. That is why it is called the present. — Master Oogway, Kung Fu Panda',
      'Life moves pretty fast. If you do not stop and look around once in a while, you could miss it. — Ferris Bueller',
      'Why do we fall? So we can learn to pick ourselves up. — Alfred, The Dark Knight',
    ],
  },
  {
    name: 'Naruto & Shippuden',
    sortOrder: 2,
    items: [
      'I\'m not gonna run away. I never go back on my word. That\'s my nindo: my ninja way. — Naruto Uzumaki',
      'A dropout will beat a genius through hard work. — Rock Lee',
      'When people get hurt, they learn to hate. When people hurt others, they become hated. But knowing that pain allows people to be kind. — Jiraiya',
      'It\'s not the number of jutsu you possess. All you need is the guts to never give up. — Jiraiya',
      'Failing doesn\'t give you a reason to give up, as long as you believe. — Naruto Uzumaki',
      'Those who forgive themselves, and accept their true nature, are the strong ones. — Itachi Uchiha',
      'I believe in you, even if you don\'t believe in yourself. — Naruto Uzumaki',
      'Hard work is worthless for those that don\'t believe in themselves. — Naruto Uzumaki',
      'A real ninja is one who endures no matter what gets thrown at him. — Jiraiya',
      'Never give up! No matter what. That is the true choice. — Jiraiya',
      'Growth occurs when one goes beyond one\'s limits. — Itachi Uchiha',
    ],
  },
  {
    name: 'ADHD',
    sortOrder: 3,
    items: [
      'Anything worth doing is worth doing poorly — poorly beats not at all.',
      'There are no rules. Do it the way that works for your brain.',
      '10% done is better than 0% done.',
      'Start messy. Momentum matters more than perfection.',
      'Your brain runs on interest and urgency more than importance — use that.',
      'Rest is not a reward. It is fuel for the next rep.',
      'You are not lazy. You need the right kind of hard.',
      'Name the smallest possible next step and do only that.',
      'Motivation is not missing — capacity or connection might be.',
      'There is always tomorrow. Talk to yourself like your best friend.',
      'Done is better than perfect when perfection keeps you stuck.',
      'Body doubling works. You do not have to white-knuckle alone.',
    ],
  },
];

export const CURATED_MOTIVATION_ROOT = 'Motivation';
