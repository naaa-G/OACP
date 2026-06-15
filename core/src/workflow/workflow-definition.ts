import { OacpWorkflowError, WORKFLOW_ERROR_CODES } from './errors.js';
import type { WorkflowDefinition } from './workflow-definition-types.js';
import { validateSubtaskPlan } from './plan-validation.js';
import { workflowDefinitionToPlan } from './workflow-definition-types.js';

/** Validate a registered workflow definition. */
export function validateWorkflowDefinition(definition: WorkflowDefinition): void {
  if (!definition.id || definition.id.trim().length === 0) {
    throw new OacpWorkflowError(
      WORKFLOW_ERROR_CODES.PLAN_INVALID,
      'Workflow definition requires a non-empty id',
      [{ path: '/id', message: 'id is required' }],
    );
  }

  if (!definition.name || definition.name.trim().length === 0) {
    throw new OacpWorkflowError(
      WORKFLOW_ERROR_CODES.PLAN_INVALID,
      'Workflow definition requires a non-empty name',
      [{ path: '/name', message: 'name is required' }],
    );
  }

  validateSubtaskPlan(workflowDefinitionToPlan(definition));
}
