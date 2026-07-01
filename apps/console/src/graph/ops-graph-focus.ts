import type { TraceGraphEdge } from '@oacp/observability-client';

/** Opacity for nodes outside the focus neighborhood (Day 32). */
export const OPS_GRAPH_FOCUS_DIM_OPACITY = 0.2;

export type OpsGraphNodeFocusRole = 'none' | 'focused' | 'neighbor' | 'dimmed';

export interface OpsGraphFocusScope {
  readonly focusAgentId: string;
  readonly neighborhood: ReadonlySet<string>;
}

export interface OpsGraphEdgeFocusState {
  readonly touchesFocus: boolean;
  readonly isDimmed: boolean;
}

/** Undirected 1-hop neighborhood — focus agent plus direct delegation neighbors. */
export function computeOpsGraphFocusNeighborhood(
  focusAgentId: string,
  edges: readonly TraceGraphEdge[],
): ReadonlySet<string> {
  const neighborhood = new Set<string>([focusAgentId]);

  for (const edge of edges) {
    if (edge.from_agent === focusAgentId) {
      neighborhood.add(edge.to_agent);
    }
    if (edge.to_agent === focusAgentId) {
      neighborhood.add(edge.from_agent);
    }
  }

  return neighborhood;
}

export function buildOpsGraphFocusScope(
  focusAgentId: string | undefined,
  edges: readonly TraceGraphEdge[],
): OpsGraphFocusScope | undefined {
  if (focusAgentId === undefined) {
    return undefined;
  }

  return {
    focusAgentId,
    neighborhood: computeOpsGraphFocusNeighborhood(focusAgentId, edges),
  };
}

export function resolveOpsGraphNodeFocusRole(
  agentId: string,
  focusScope: OpsGraphFocusScope | undefined,
): OpsGraphNodeFocusRole {
  if (focusScope === undefined) {
    return 'none';
  }

  if (agentId === focusScope.focusAgentId) {
    return 'focused';
  }

  if (focusScope.neighborhood.has(agentId)) {
    return 'neighbor';
  }

  return 'dimmed';
}

export function resolveOpsGraphEdgeFocusState(
  fromAgent: string,
  toAgent: string,
  focusScope: OpsGraphFocusScope | undefined,
): OpsGraphEdgeFocusState {
  if (focusScope === undefined) {
    return { touchesFocus: false, isDimmed: false };
  }

  const touchesFocus = fromAgent === focusScope.focusAgentId || toAgent === focusScope.focusAgentId;

  return {
    touchesFocus,
    isDimmed: !touchesFocus,
  };
}
