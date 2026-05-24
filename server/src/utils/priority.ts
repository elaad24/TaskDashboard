/**
 * Priority scoring engine.
 *
 * The product spec defines:
 *
 *   priorityScore =
 *     importance * 3 +
 *     urgency * 2 +
 *     deadlinePressure +
 *     blockerImpact -
 *     effortPenalty;
 *
 * - importance, urgency, effort: 1..5 user-set sliders
 * - deadlinePressure: derived from how close the dueDate is
 * - blockerImpact: bumped if the task unblocks a goal/problem
 * - effortPenalty: smaller effort tasks score slightly higher (quick wins)
 *
 * Why compute this server-side instead of inline in the dashboard query?
 * - The dashboard needs to ORDER BY priorityScore. Recomputing in JS each
 *   request would be wasteful and would prevent SQLite from using the
 *   `priorityScore` index.
 * - We persist the score on write, which makes "next best action" sorting
 *   trivially fast for any DB size.
 */

export type PriorityInputs = {
  importance: number; // 1..5
  urgency: number; // 1..5
  effort: number; // 1..5
  dueDate?: Date | null;
  hasGoal?: boolean;
  hasProblem?: boolean;
  status?: string;
};

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

const deadlinePressure = (dueDate?: Date | null): number => {
  if (!dueDate) return 0;
  const now = Date.now();
  const due = dueDate.getTime();
  const days = (due - now) / (1000 * 60 * 60 * 24);
  // Past due: heavy weight (10). Today: 8. Tomorrow: 5. Soon: 1-3. Far: 0.
  if (days < 0) return 10;
  if (days < 1) return 8;
  if (days < 2) return 5;
  if (days < 4) return 3;
  if (days < 7) return 2;
  if (days < 14) return 1;
  return 0;
};

const blockerImpact = (hasGoal?: boolean, hasProblem?: boolean): number => {
  let bonus = 0;
  if (hasGoal) bonus += 2;
  if (hasProblem) bonus += 3;
  return bonus;
};

export const computePriorityScore = (inputs: PriorityInputs): number => {
  const importance = clamp(inputs.importance, 1, 5);
  const urgency = clamp(inputs.urgency, 1, 5);
  const effort = clamp(inputs.effort, 1, 5);

  const effortPenalty = (effort - 1) * 0.6; // 0..2.4

  const score =
    importance * 3 +
    urgency * 2 +
    deadlinePressure(inputs.dueDate) +
    blockerImpact(inputs.hasGoal, inputs.hasProblem) -
    effortPenalty;

  // Done/cancelled tasks should never appear high in next-best-action lists
  if (inputs.status === 'done' || inputs.status === 'cancelled') return 0;

  return Math.round(score * 100) / 100;
};

/**
 * Map a numeric priority slider (1..5) into the spec's 4-bucket priority enum.
 * Used when AI-generated tasks come in with a `priority` enum but no slider.
 */
export const priorityToImportance: Record<string, number> = {
  low: 2,
  medium: 3,
  high: 4,
  critical: 5,
};

export const importanceToPriority = (importance: number): 'low' | 'medium' | 'high' | 'critical' => {
  if (importance >= 5) return 'critical';
  if (importance >= 4) return 'high';
  if (importance >= 3) return 'medium';
  return 'low';
};
