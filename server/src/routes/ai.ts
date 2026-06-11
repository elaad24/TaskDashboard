import { Router } from 'express';
import {
  confirmParseInputSchema,
  goalBreakdownInputSchema,
  nextActionInputSchema,
  overviewBriefingInputSchema,
  parseInputSchema,
  solveProblemInputSchema,
  type ConfirmParseInput,
  type ConfirmParseResponse,
} from '@command-center/shared';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import {
  breakdownGoal,
  nextBestAction,
  parseBrainDump,
  solveProblem,
  generateOverviewBriefing,
} from '../ai/navigator.js';
import { createGoal, updateGoal } from '../services/goalService.js';
import { createTask } from '../services/taskService.js';
import { createProblem, updateProblem } from '../services/problemService.js';
import { createStudyTopic } from '../services/studyService.js';
import { createLog } from '../services/logService.js';
import { createResource } from '../services/resourceService.js';

export const aiRouter = Router();

aiRouter.use(aiLimiter);

aiRouter.post(
  '/parse',
  validate(parseInputSchema),
  asyncHandler(async (req, res) =>
    res.json(await parseBrainDump(req.body.text, req.body.correction)),
  ),
);

aiRouter.post(
  '/confirm',
  validate(confirmParseInputSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as ConfirmParseInput;
    const out: ConfirmParseResponse = {
      createdTaskIds: [],
      createdGoalIds: [],
      createdProblemIds: [],
      createdStudyTopicIds: [],
      createdLogIds: [],
    };

    if (body.tasks) {
      for (const t of body.tasks) {
        const task = await createTask({ ...t, source: 'ai' });
        out.createdTaskIds.push(task.id);
      }
    }
    if (body.goals) {
      for (const g of body.goals) {
        const goal = await createGoal(g);
        out.createdGoalIds.push(goal.id);
      }
    }
    if (body.problems) {
      for (const p of body.problems) {
        const problem = await createProblem(p);
        out.createdProblemIds.push(problem.id);
      }
    }
    if (body.studyTopics) {
      for (const s of body.studyTopics) {
        const topic = await createStudyTopic(s);
        out.createdStudyTopicIds.push(topic.id);
      }
    }
    if (body.logs) {
      for (const l of body.logs) {
        const log = await createLog(l);
        out.createdLogIds.push(log.id);
      }
    }
    if (body.resources) {
      for (const resource of body.resources) {
        await createResource(resource);
      }
    }
    res.status(201).json(out);
  }),
);

aiRouter.post(
  '/overview-briefing',
  validate(overviewBriefingInputSchema),
  asyncHandler(async (req, res) => {
    res.json(await generateOverviewBriefing(req.body.snapshot));
  }),
);

aiRouter.post(
  '/next-action',
  validate(nextActionInputSchema),
  asyncHandler(async (req, res) => res.json(await nextBestAction(req.body))),
);

aiRouter.post(
  '/breakdown-goal',
  validate(goalBreakdownInputSchema),
  asyncHandler(async (req, res) => {
    const result = await breakdownGoal(req.body.goalId);
    // Persist nextAction on the goal so the dashboard can show it.
    if (result.firstAction) {
      await updateGoal(req.body.goalId, { nextAction: result.firstAction });
    }
    res.json(result);
  }),
);

aiRouter.post(
  '/solve-problem',
  validate(solveProblemInputSchema),
  asyncHandler(async (req, res) => {
    const result = await solveProblem(req.body.problemId);
    await updateProblem(req.body.problemId, {
      aiInterpretation: result.interpretation,
      suggestedPlan: JSON.stringify(result.plan),
      status: 'planning',
    });
    res.json(result);
  }),
);
