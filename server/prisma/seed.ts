import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const daysAhead = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

async function main() {
  console.log('Seeding Command Center...');

  // -- Wipe existing data (in dependency order)
  await prisma.aIMessage.deleteMany();
  await prisma.aIThread.deleteMany();
  await prisma.reminder.deleteMany();
  await prisma.telegramSubscriber.deleteMany();
  await prisma.pendingCapture.deleteMany();
  await prisma.integrationScan.deleteMany();
  await prisma.integrationToken.deleteMany();
  await prisma.trackedTag.deleteMany();
  await prisma.feedItem.deleteMany();
  await prisma.feedGroup.deleteMany();
  await prisma.appSetting.deleteMany();
  await prisma.log.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.taskRecurrence.deleteMany();
  await prisma.studyTopic.deleteMany();
  await prisma.task.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.track.deleteMany();
  await prisma.area.deleteMany();

  // -- Areas
  const aviation = await prisma.area.create({
    data: { name: 'Aviation', icon: 'Plane', color: '#00D9FF', order: 1 },
  });
  const study = await prisma.area.create({
    data: { name: 'Study', icon: 'BookOpen', color: '#35FFB6', order: 2 },
  });
  const food = await prisma.area.create({
    data: { name: 'Food', icon: 'ShoppingCart', color: '#FFB020', order: 3 },
  });
  const projects = await prisma.area.create({
    data: { name: 'Projects', icon: 'Code2', color: '#A78BFA', order: 4 },
  });
  const fitness = await prisma.area.create({
    data: { name: 'Fitness', icon: 'Dumbbell', color: '#F472B6', order: 5 },
  });
  const finance = await prisma.area.create({
    data: { name: 'Finance', icon: 'Wallet', color: '#22D3EE', order: 6 },
  });
  const admin = await prisma.area.create({
    data: { name: 'Personal Admin', icon: 'ClipboardList', color: '#94A3B8', order: 7 },
  });

  // -- Tracks
  const pplCommunication = await prisma.track.create({
    data: { areaId: aviation.id, name: 'PPL Communication' },
  });
  const pplAirLaw = await prisma.track.create({
    data: { areaId: aviation.id, name: 'PPL Air Law' },
  });
  const pplNavigation = await prisma.track.create({
    data: { areaId: aviation.id, name: 'PPL Navigation' },
  });
  const groceries = await prisma.track.create({
    data: { areaId: food.id, name: 'Groceries' },
  });
  const commandCenter = await prisma.track.create({
    data: { areaId: projects.id, name: 'Command Center' },
  });

  // -- Goals
  const goalPPL = await prisma.goal.create({
    data: {
      title: 'Finish PPL theory as fast as possible',
      description:
        'Complete all PPL theory subjects, focusing on weak areas (Communication, Air Law). Target: ready for solo prerequisites this quarter.',
      areaId: aviation.id,
      trackId: pplCommunication.id,
      status: 'active',
      priority: 'high',
      progress: 34,
      targetDate: daysAhead(60),
      nextAction: 'Communication mock questions',
    },
  });

  const goalCommandCenter = await prisma.goal.create({
    data: {
      title: 'Build Command Center MVP',
      description:
        'Ship the local-first AI dashboard for personal goals, tasks, study, and logs.',
      areaId: projects.id,
      trackId: commandCenter.id,
      status: 'active',
      priority: 'medium',
      progress: 12,
      nextAction: 'Create database schema',
    },
  });

  const goalFood = await prisma.goal.create({
    data: {
      title: 'Keep food at home',
      description: 'Always have at least 3 days of food at home, low effort.',
      areaId: food.id,
      trackId: groceries.id,
      status: 'active',
      priority: 'medium',
      progress: 20,
      nextAction: 'Grocery shopping',
    },
  });

  // -- Problem
  const problemRadio = await prisma.problem.create({
    data: {
      title: 'I do not remember radio communication well',
      description:
        'I forget standard radio calls when practicing. Worried about confidence before flight training.',
      areaId: aviation.id,
      trackId: pplCommunication.id,
      goalId: goalPPL.id,
      status: 'planning',
      priority: 'high',
      aiInterpretation:
        'This is a study weakness under Aviation -> PPL -> Communication. It directly blocks confidence for solo prerequisites.',
      suggestedPlan: JSON.stringify([
        'Review NATO alphabet',
        'Study standard expressions',
        'Practice example calls',
        'Do mock questions',
        'Review wrong answers',
      ]),
    },
  });

  // -- Tasks
  const tasks = await prisma.$transaction([
    prisma.task.create({
      data: {
        title: 'Review NATO alphabet',
        description: 'Memorize and recite the full NATO phonetic alphabet without mistakes.',
        status: 'todo',
        priority: 'high',
        priorityScore: 24,
        importance: 4,
        urgency: 4,
        effort: 1,
        areaId: aviation.id,
        trackId: pplCommunication.id,
        goalId: goalPPL.id,
        problemId: problemRadio.id,
        estimatedMinutes: 15,
        source: 'ai',
        reason: 'Required for radio communication confidence.',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Practice radio calls (10 examples)',
        description: 'Listen to standard ATC calls and read back correctly.',
        status: 'todo',
        priority: 'high',
        priorityScore: 22,
        importance: 5,
        urgency: 4,
        effort: 2,
        areaId: aviation.id,
        trackId: pplCommunication.id,
        goalId: goalPPL.id,
        problemId: problemRadio.id,
        estimatedMinutes: 25,
        source: 'ai',
        reason: 'Direct practice for the weakest topic.',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Add grocery list',
        description: 'Quick capture: protein, carbs, vegetables, breakfast, snacks.',
        status: 'todo',
        priority: 'medium',
        priorityScore: 12,
        importance: 3,
        urgency: 3,
        effort: 1,
        areaId: food.id,
        trackId: groceries.id,
        goalId: goalFood.id,
        estimatedMinutes: 5,
        source: 'manual',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Air Law: airspace classification recap',
        description: 'Review classes A-G, with at least 5 mock questions.',
        status: 'todo',
        priority: 'medium',
        priorityScore: 14,
        importance: 4,
        urgency: 3,
        effort: 2,
        areaId: aviation.id,
        trackId: pplAirLaw.id,
        goalId: goalPPL.id,
        estimatedMinutes: 30,
        source: 'manual',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Compare flight schools (Czech)',
        description: 'Compare 3 schools on price, schedule, English instruction.',
        status: 'in_progress',
        priority: 'medium',
        priorityScore: 11,
        importance: 4,
        urgency: 2,
        effort: 3,
        areaId: aviation.id,
        goalId: goalPPL.id,
        estimatedMinutes: 60,
        source: 'manual',
      },
    }),
    prisma.task.create({
      data: {
        title: 'Set up Command Center DB schema',
        description: 'Prisma + SQLite, all main entities and relations.',
        status: 'in_progress',
        priority: 'high',
        priorityScore: 18,
        importance: 5,
        urgency: 4,
        effort: 3,
        areaId: projects.id,
        trackId: commandCenter.id,
        goalId: goalCommandCenter.id,
        estimatedMinutes: 90,
        source: 'manual',
      },
    }),
  ]);

  // -- Study Topics
  await prisma.studyTopic.createMany({
    data: [
      {
        subject: 'PPL',
        topic: 'Communication',
        confidence: 'medium',
        mockScore: 82,
        weakTopics: JSON.stringify(['Blind transmission', 'Readback', 'NATO alphabet']),
        totalMinutes: 240,
        areaId: aviation.id,
        trackId: pplCommunication.id,
        goalId: goalPPL.id,
        lastStudiedAt: daysAgo(0),
        nextReviewAt: daysAhead(1),
      },
      {
        subject: 'PPL',
        topic: 'Air Law',
        confidence: 'high',
        mockScore: 91,
        weakTopics: JSON.stringify(['Airspace classification']),
        totalMinutes: 360,
        areaId: aviation.id,
        trackId: pplAirLaw.id,
        goalId: goalPPL.id,
        lastStudiedAt: daysAgo(2),
        nextReviewAt: daysAhead(3),
      },
      {
        subject: 'PPL',
        topic: 'Navigation',
        confidence: 'low',
        mockScore: 64,
        weakTopics: JSON.stringify(['Dead reckoning', 'VOR usage']),
        totalMinutes: 120,
        areaId: aviation.id,
        trackId: pplNavigation.id,
        goalId: goalPPL.id,
        lastStudiedAt: daysAgo(5),
        nextReviewAt: daysAhead(0),
      },
    ],
  });

  // -- Logs
  await prisma.log.createMany({
    data: [
      {
        title: 'Completed grocery shopping',
        content: 'Enough food for 5 days.',
        kind: 'expense',
        areaId: food.id,
        trackId: groceries.id,
        costAmount: 200,
        costCurrency: 'EUR',
        occurredAt: daysAgo(0),
      },
      {
        title: 'Studied Air Law',
        content: 'Focus on airspace classification.',
        kind: 'study',
        areaId: aviation.id,
        trackId: pplAirLaw.id,
        timeSpentMinutes: 80,
        occurredAt: daysAgo(1),
      },
      {
        title: 'Passed Communication mock test',
        content: 'Score 86%. Wrong on blind transmissions.',
        kind: 'study',
        areaId: aviation.id,
        trackId: pplCommunication.id,
        timeSpentMinutes: 30,
        occurredAt: daysAgo(2),
      },
      {
        title: 'Compared Czech flight schools',
        content: 'Shortlisted 2 with English instruction.',
        kind: 'note',
        areaId: aviation.id,
        occurredAt: daysAgo(3),
      },
      {
        title: 'Grocery shopping (small run)',
        kind: 'expense',
        areaId: food.id,
        trackId: groceries.id,
        costAmount: 90,
        costCurrency: 'EUR',
        occurredAt: daysAgo(7),
      },
      {
        title: 'Grocery shopping (weekly)',
        kind: 'expense',
        areaId: food.id,
        trackId: groceries.id,
        costAmount: 160,
        costCurrency: 'EUR',
        occurredAt: daysAgo(15),
      },
    ],
  });

  console.log(`Seeded ${tasks.length} tasks, 3 goals, 1 problem, 3 study topics, 6 logs.`);

  const motivationPhrases = [
    'Small steps compound.',
    'Focus on the next action.',
    'Progress beats perfection.',
    'Show up, even when it is hard.',
    'Clarity comes from doing.',
    'One thing at a time.',
  ];

  const motivationGroup = await prisma.feedGroup.create({
    data: {
      name: 'Motivation',
      sortOrder: 0,
      items: {
        create: motivationPhrases.map((content, index) => ({
          content,
          sortOrder: index,
        })),
      },
    },
  });

  await prisma.feedGroup.create({
    data: { name: 'Learning', sortOrder: 1 },
  });

  console.log(`Seeded sidebar feed: ${motivationGroup.name} (${motivationPhrases.length} items) + Learning group.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
