import {
  PROTOCOL_VERSION,
  createAgentRuntime,
  parseAgentIdentity,
  type AgentIdentity,
  type AgentRuntime,
  type WorkflowRunResult,
} from '@oacp/core';

import type { ServerContext } from '../api/http/types.js';

const DEFAULT_WORKFLOW_COORDINATOR = parseAgentIdentity({
  id: 'agent://workflow-coordinator',
  name: 'Workflow Coordinator',
  version: PROTOCOL_VERSION,
  capabilities: ['orchestrate.workflow'],
  publicKey: {
    kty: 'EC',
    crv: 'P-256',
    x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
    y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
    use: 'sig',
    alg: 'ES256',
    kid: 'workflow-coordinator',
  },
});

export interface WorkflowCoordinatorOptions {
  readonly identity?: AgentIdentity;
}

/** Ephemeral coordinator runtime for server-side DAG workflow execution. */
export function createWorkflowCoordinator(
  context: ServerContext,
  options: WorkflowCoordinatorOptions = {},
): AgentRuntime {
  const identity = options.identity ?? DEFAULT_WORKFLOW_COORDINATOR;

  return createAgentRuntime({
    identity,
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: context.delegationGraphRecorder,
  });
}

export async function runServerWorkflow(
  context: ServerContext,
  workflowId: string,
  input: Record<string, unknown>,
): Promise<WorkflowRunResult> {
  const coordinator = createWorkflowCoordinator(context);
  coordinator.start();
  try {
    return await context.workflowEngine.run(workflowId, coordinator, input);
  } finally {
    coordinator.stop();
  }
}
