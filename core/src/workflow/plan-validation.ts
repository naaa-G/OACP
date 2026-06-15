import { OacpWorkflowError, WORKFLOW_ERROR_CODES } from './errors.js';
import type { SubtaskPlan, SubtaskPlanStep } from './subtask-plan-types.js';

/** Validate a subtask plan structure (unique ids, valid dependencies). */
export function validateSubtaskPlan(plan: SubtaskPlan): void {
  if (plan.steps.length === 0) {
    throw new OacpWorkflowError(
      WORKFLOW_ERROR_CODES.PLAN_INVALID,
      'Subtask plan must contain at least one step',
      [{ path: '/steps', message: 'steps array is empty' }],
    );
  }

  const ids = new Set<string>();
  for (const step of plan.steps) {
    if (!step.id || step.id.trim().length === 0) {
      throw new OacpWorkflowError(
        WORKFLOW_ERROR_CODES.PLAN_INVALID,
        'Each step requires a non-empty id',
        [{ path: '/steps/id', message: 'step id is required' }],
      );
    }
    if (ids.has(step.id)) {
      throw new OacpWorkflowError(
        WORKFLOW_ERROR_CODES.PLAN_INVALID,
        `Duplicate step id "${step.id}"`,
        [{ path: `/steps/${step.id}`, message: 'step id must be unique' }],
      );
    }
    ids.add(step.id);

    if (!step.capability || step.capability.trim().length === 0) {
      throw new OacpWorkflowError(
        WORKFLOW_ERROR_CODES.PLAN_INVALID,
        `Step "${step.id}" requires a capability`,
        [{ path: `/steps/${step.id}/capability`, message: 'capability is required' }],
      );
    }

    if (step.mapInput === undefined && step.input === undefined) {
      throw new OacpWorkflowError(
        WORKFLOW_ERROR_CODES.PLAN_INVALID,
        `Step "${step.id}" requires input or mapInput`,
        [{ path: `/steps/${step.id}/input`, message: 'provide input or mapInput' }],
      );
    }

    for (const dep of step.dependsOn ?? []) {
      if (!ids.has(dep) && !plan.steps.some((candidate) => candidate.id === dep)) {
        throw new OacpWorkflowError(
          WORKFLOW_ERROR_CODES.PLAN_INVALID,
          `Step "${step.id}" depends on unknown step "${dep}"`,
          [{ path: `/steps/${step.id}/dependsOn`, message: `unknown dependency: ${dep}` }],
        );
      }
    }
  }

  assertAcyclic(plan.steps);
}

function assertAcyclic(steps: readonly SubtaskPlanStep[]): void {
  planExecutionBatches(steps);
}

/**
 * Group steps into execution batches (topological levels).
 * Steps in the same batch have no dependencies on each other and may run in parallel.
 */
export function planExecutionBatches(
  steps: readonly SubtaskPlanStep[],
): readonly (readonly string[])[] {
  const stepById = new Map(steps.map((step) => [step.id, step]));
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const step of steps) {
    inDegree.set(step.id, 0);
  }

  for (const step of steps) {
    for (const dep of step.dependsOn ?? []) {
      if (!stepById.has(dep)) {
        throw new OacpWorkflowError(
          WORKFLOW_ERROR_CODES.PLAN_INVALID,
          `Step "${step.id}" depends on unknown step "${dep}"`,
          [{ path: `/steps/${step.id}/dependsOn`, message: `unknown dependency: ${dep}` }],
        );
      }
      inDegree.set(step.id, (inDegree.get(step.id) ?? 0) + 1);
      const list = children.get(dep) ?? [];
      list.push(step.id);
      children.set(dep, list);
    }
  }

  const batches: string[][] = [];
  let queue = steps.filter((step) => (inDegree.get(step.id) ?? 0) === 0).map((step) => step.id);
  let visited = 0;

  while (queue.length > 0) {
    batches.push([...queue]);
    const nextQueue: string[] = [];

    for (const current of queue) {
      visited += 1;
      for (const childId of children.get(current) ?? []) {
        const nextDegree = (inDegree.get(childId) ?? 1) - 1;
        inDegree.set(childId, nextDegree);
        if (nextDegree === 0) {
          nextQueue.push(childId);
        }
      }
    }

    queue = nextQueue;
  }

  if (visited !== steps.length) {
    throw new OacpWorkflowError(
      WORKFLOW_ERROR_CODES.PLAN_CYCLE,
      'Subtask plan contains a dependency cycle',
      [{ path: '/steps', message: 'cyclic dependsOn graph' }],
    );
  }

  return batches;
}
