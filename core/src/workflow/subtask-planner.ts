import type { SubtaskPlan, SubtaskPlanner, SubtaskPlannerContext } from './subtask-plan-types.js';

/** Return a fixed plan regardless of input (tests and deterministic workflows). */
export class StaticSubtaskPlanner implements SubtaskPlanner {
  constructor(private readonly template: SubtaskPlan) {}

  plan(context: SubtaskPlannerContext): SubtaskPlan {
    void context;
    return this.template;
  }
}

/** Delegate planning to a function (LLM adapters, rules engines, etc.). */
export class FunctionSubtaskPlanner implements SubtaskPlanner {
  constructor(
    private readonly plannerFn: (
      context: SubtaskPlannerContext,
    ) => SubtaskPlan | Promise<SubtaskPlan>,
  ) {}

  plan(context: SubtaskPlannerContext): SubtaskPlan | Promise<SubtaskPlan> {
    return this.plannerFn(context);
  }
}

export function createStaticSubtaskPlanner(plan: SubtaskPlan): StaticSubtaskPlanner {
  return new StaticSubtaskPlanner(plan);
}

export function createFunctionSubtaskPlanner(
  plannerFn: (context: SubtaskPlannerContext) => SubtaskPlan | Promise<SubtaskPlan>,
): FunctionSubtaskPlanner {
  return new FunctionSubtaskPlanner(plannerFn);
}
