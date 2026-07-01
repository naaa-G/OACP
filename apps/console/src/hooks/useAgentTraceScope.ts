import { useMemo } from 'react';

import type { AgentLink, AgentObservabilityRecord } from '@oacp/observability-client';

import { useSelectionStore } from '../store/selection-store.js';
import { resolveAgentTraceScope } from '../utils/agent-trace-filter.js';

export interface UseAgentTraceScopeInput {
  readonly agents?: readonly AgentObservabilityRecord[] | undefined;
  readonly activeAgentIds?: ReadonlySet<string> | undefined;
  readonly hasActiveTrace?: boolean | undefined;
  readonly agentLinks?: readonly AgentLink[] | undefined;
}

export function useAgentTraceScope({
  agents = [],
  activeAgentIds = new Set<string>(),
  hasActiveTrace = false,
  agentLinks = [],
}: UseAgentTraceScopeInput) {
  const showAllRegisteredAgents = useSelectionStore((state) => state.showAllRegisteredAgents);
  const setShowAllRegisteredAgents = useSelectionStore((state) => state.setShowAllRegisteredAgents);

  const traceSelected = hasActiveTrace;

  const traceScope = useMemo(
    () =>
      resolveAgentTraceScope({
        agents,
        activeAgentIds,
        traceSelected,
        showAllRegistered: showAllRegisteredAgents,
      }),
    [activeAgentIds, agents, showAllRegisteredAgents, traceSelected],
  );

  const scopedAgentLinks = useMemo(() => {
    if (!traceScope.isTraceScoped) {
      return agentLinks;
    }

    const visibleIds = new Set(traceScope.scopedAgents.map((agent) => agent.id));
    return agentLinks.filter(
      (link) => visibleIds.has(link.from_agent) && visibleIds.has(link.to_agent),
    );
  }, [agentLinks, traceScope.isTraceScoped, traceScope.scopedAgents]);

  return {
    traceScope,
    traceSelected,
    showAllRegisteredAgents,
    setShowAllRegisteredAgents,
    scopedAgents: traceScope.scopedAgents,
    scopedAgentLinks,
  };
}
