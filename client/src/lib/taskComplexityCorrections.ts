export const MAKE_SIMPLE_TASK_CORRECTION =
  'The user is telling you to take the literal meaning of the text — exactly what was written, nothing more. ' +
  'This is one single action, not a project. Do NOT break it into steps, do NOT add sub-tasks, do NOT infer preparation or dependencies. ' +
  'Set isSimpleTask to true. Return exactly one task item whose title closely mirrors the original text, with an empty suggestedTasks array ([]).';

export const MAKE_COMPLEX_TASK_CORRECTION =
  'The user is telling you this task needs to be broken down — it is NOT a single action. ' +
  'Set isSimpleTask to false. You MUST populate suggestedTasks with 2-5 concrete, ordered steps, each with a realistic estimatedMinutes value. ' +
  'Do NOT return an empty suggestedTasks array. Do NOT set isSimpleTask to true.';
