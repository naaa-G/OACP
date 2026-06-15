import type { AgentClient } from '@oacp/sdk/client';

export interface ExecuteOacpTaskParams {
  readonly from: string;
  readonly capability: string;
  readonly input: Record<string, unknown>;
  readonly to?: string;
  readonly traceId?: string;
  readonly responseTimeoutMs?: number;
}

export interface CreateOacpToolOptions {
  readonly client: AgentClient;
  readonly coordinatorId: string;
  readonly capability: string;
  readonly name?: string;
  readonly description?: string;
  /** Zod schema describing tool input (LangChain StructuredTool). */
  readonly schema: import('zod').ZodObject<import('zod').ZodRawShape>;
}

export interface OacpToolDefinition {
  readonly capability: string;
  readonly name?: string;
  readonly description?: string;
  readonly schema: import('zod').ZodObject<import('zod').ZodRawShape>;
}

export interface CreateOacpToolkitOptions {
  readonly client: AgentClient;
  readonly coordinatorId: string;
  readonly tools: readonly OacpToolDefinition[];
}
