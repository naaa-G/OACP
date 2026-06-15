import type { AgentClient } from '@oacp/sdk/client';

import type { ExecuteOacpTaskParams } from './types.js';

/** Thrown when an OACP task returns `status: error`. */
export class OacpToolError extends Error {
  readonly code: string;
  readonly details?: readonly { readonly path: string; readonly message: string }[];

  constructor(
    message: string,
    options: {
      readonly code?: string;
      readonly details?: readonly { readonly path: string; readonly message: string }[];
    } = {},
  ) {
    super(message);
    this.name = 'OacpToolError';
    this.code = options.code ?? 'OACP_TASK_FAILED';
    if (options.details !== undefined) {
      this.details = options.details;
    }
  }
}

/**
 * Execute a remote OACP task and return structured output.
 * Framework-agnostic — used by LangChain tools and custom orchestrators.
 */
export async function executeOacpCapabilityTask(
  client: AgentClient,
  params: ExecuteOacpTaskParams,
): Promise<Record<string, unknown>> {
  const result = await client.sendTask({
    from: params.from,
    capability: params.capability,
    input: params.input,
    ...(params.to !== undefined ? { to: params.to } : {}),
    ...(params.traceId !== undefined ? { traceId: params.traceId } : {}),
    ...(params.responseTimeoutMs !== undefined
      ? { responseTimeoutMs: params.responseTimeoutMs }
      : {}),
  });

  if (result.status === 'error') {
    throw new OacpToolError(result.error?.message ?? `OACP task "${params.capability}" failed`, {
      ...(result.error?.code !== undefined ? { code: result.error.code } : {}),
    });
  }

  return result.output ?? {};
}

/** Normalize capability strings into LangChain-safe tool names. */
export function capabilityToToolName(capability: string): string {
  return capability.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}
