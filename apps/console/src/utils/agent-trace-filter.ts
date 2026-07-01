import type { AgentObservabilityRecord } from '@oacp/observability-client';

export interface AgentTraceScopeInput {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly activeAgentIds: ReadonlySet<string>;
  readonly traceSelected: boolean;
  readonly showAllRegistered: boolean;
}

export interface AgentTraceScopeResult {
  /** Agents to render after trace scope (before search). */
  readonly scopedAgents: readonly AgentObservabilityRecord[];
  /** Agents participating in the selected trace. */
  readonly traceAgentCount: number;
  /** Full registry size from snapshot. */
  readonly registeredCount: number;
  /** Whether the list is narrowed to trace participants only. */
  readonly isTraceScoped: boolean;
}

/** Day 16 — default to trace participants; optional show-all with dimmed out-of-trace rows. */
export function resolveAgentTraceScope(input: AgentTraceScopeInput): AgentTraceScopeResult {
  const registeredCount = input.agents.length;
  const traceAgentCount = countAgentsInTrace(input.agents, input.activeAgentIds);

  const isTraceScoped =
    input.traceSelected && !input.showAllRegistered && input.activeAgentIds.size > 0;

  const scopedAgents = isTraceScoped
    ? input.agents.filter((agent) => input.activeAgentIds.has(agent.id))
    : input.agents;

  return {
    scopedAgents,
    traceAgentCount,
    registeredCount,
    isTraceScoped,
  };
}

export function countAgentsInTrace(
  agents: readonly AgentObservabilityRecord[],
  activeAgentIds: ReadonlySet<string>,
): number {
  let count = 0;
  for (const agent of agents) {
    if (activeAgentIds.has(agent.id)) {
      count += 1;
    }
  }
  return count;
}

export function formatAgentScopeLabel(visibleCount: number, registeredCount: number): string {
  if (registeredCount <= 0) {
    return '0 agents';
  }
  if (visibleCount >= registeredCount) {
    return `${registeredCount} agent${registeredCount === 1 ? '' : 's'}`;
  }
  return `${visibleCount} of ${registeredCount} agents`;
}
