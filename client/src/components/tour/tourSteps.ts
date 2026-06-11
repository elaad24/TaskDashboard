export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export type TourStep = {
  target: string | null;
  title: string;
  body: string;
  placement: TourPlacement;
  route?: string;
};

export const TOUR_STEPS: Array<TourStep> = [
  {
    target: null,
    title: "Hey, I'm Navigator",
    body: "I'll be your co-pilot in here. Give me 60 seconds and I'll show you how to turn the chaos in your head into a system that actually runs. Ready?",
    placement: 'center',
    route: '/',
  },
  {
    target: '[data-test-id="command-input"]',
    title: 'Just talk to me',
    body: "This is where the magic starts. Dump any thought here — a task, a problem, money you spent — and I'll untangle it into something structured. No forms, no fuss.",
    placement: 'bottom',
    route: '/',
  },
  {
    target: '[data-test-id="sidebar-link-command-center"]',
    title: 'Your home base',
    body: "Start every day right here. I surface what's urgent, what's next, and what I'd recommend — so you never stare at a blank screen wondering where to begin.",
    placement: 'right',
    route: '/',
  },
  {
    target: '[data-test-id="sidebar-link-overview"]',
    title: 'The big picture',
    body: 'Want to zoom out? This is your trends, streaks, and reminders in one glance. I can even read you an audio summary if your hands are busy.',
    placement: 'right',
    route: '/overview',
  },
  {
    target: '[data-test-id="sidebar-link-work"]',
    title: 'Where it gets done',
    body: 'Tasks, Goals, Study, and a Mission Map that unlocks step by step. This is your cockpit for actually moving the needle.',
    placement: 'right',
    route: '/work',
  },
  {
    target: '[data-test-id="sidebar-link-areas"]',
    title: 'Your life, organized',
    body: 'Work, health, aviation, whatever matters to you — group it into Areas. I keep urgency and streaks honest within each one.',
    placement: 'right',
    route: '/areas',
  },
  {
    target: '[data-test-id="sidebar-link-logs"]',
    title: 'Track time & money',
    body: 'Tell me "I spent 200 EUR on groceries today" and I\'ll log it for you. Time and spend, captured in plain language.',
    placement: 'right',
    route: '/logs',
  },
  {
    target: '[data-test-id="sidebar-link-search"]',
    title: 'Find anything, fast',
    body: 'Lost something? Search across everything you\'ve captured, and I\'ll summarize the results so you get answers, not just a list.',
    placement: 'right',
    route: '/search',
  },
  {
    target: '[data-test-id="xp-badge"]',
    title: 'Level up as you go',
    body: 'Every task you finish feeds your XP and streak. Clear the right things and you unlock new nodes on the Mission Map. Yes, it\'s a little addictive.',
    placement: 'right',
    route: '/',
  },
  {
    target: '[data-test-id="settings-start-here"]',
    title: 'Make me yours',
    body: 'Pick your AI brain (OpenAI or Ollama), wire up Telegram reminders, tweak your feed. This Start here card always has your back too.',
    placement: 'top',
    route: '/settings',
  },
  {
    target: null,
    title: "You're cleared for takeoff",
    body: "That's the whole loop: capture, review, execute, track. Go throw something at the command bar — I'll handle the rest. Find me again anytime from the sidebar.",
    placement: 'center',
    route: '/',
  },
];

export const TOUR_STORAGE_KEY = 'cc:tourSeen';
