import type { TraceBundle } from '@oacp/core';

/** Agent-to-agent link aggregated from a trace delegation graph or timeline. */
export interface PlaygroundAgentLink {
  readonly from_agent: string;
  readonly to_agent: string;
  readonly kind: string;
  readonly capability?: string;
  readonly message_count: number;
}

const DELEGATION_EDGE_KINDS = new Set(['delegates', 'subtask']);

/** Aggregate message-level delegation edges into agent-to-agent links. */
export function aggregateAgentLinksFromGraph(
  graph: TraceBundle['graph'],
): readonly PlaygroundAgentLink[] {
  if (!graph || graph.edges.length === 0) {
    return [];
  }

  const linkMap = new Map<string, PlaygroundAgentLink>();

  for (const edge of graph.edges) {
    const toAgent = edge.to_agent;
    if (!toAgent || edge.from_agent === toAgent) {
      continue;
    }

    const key = `${edge.from_agent}\0${toAgent}\0${edge.kind}\0${edge.capability ?? ''}`;
    const existing = linkMap.get(key);
    if (existing) {
      linkMap.set(key, {
        ...existing,
        message_count: existing.message_count + 1,
      });
      continue;
    }

    linkMap.set(key, {
      from_agent: edge.from_agent,
      to_agent: toAgent,
      kind: edge.kind,
      ...(edge.capability !== undefined ? { capability: edge.capability } : {}),
      message_count: 1,
    });
  }

  return [...linkMap.values()].sort((left, right) =>
    left.from_agent.localeCompare(right.from_agent),
  );
}

/** Infer agent links from timeline senders/recipients when graph edges lack `to_agent`. */
export function aggregateAgentLinksFromTimeline(
  timeline: TraceBundle['timeline'],
): readonly PlaygroundAgentLink[] {
  const linkMap = new Map<string, PlaygroundAgentLink>();

  for (const event of timeline) {
    if (event.to === undefined || event.to.length === 0 || event.from === event.to) {
      continue;
    }

    if (event.type !== 'task_request' && event.type !== 'delegation') {
      continue;
    }

    const kind = event.type === 'delegation' ? 'delegates' : 'subtask';
    const key = `${event.from}\0${event.to}\0${kind}\0${event.capability ?? ''}`;
    const existing = linkMap.get(key);
    if (existing) {
      linkMap.set(key, {
        ...existing,
        message_count: existing.message_count + 1,
      });
      continue;
    }

    linkMap.set(key, {
      from_agent: event.from,
      to_agent: event.to,
      kind,
      ...(event.capability !== undefined ? { capability: event.capability } : {}),
      message_count: 1,
    });
  }

  return [...linkMap.values()].sort((left, right) =>
    left.from_agent.localeCompare(right.from_agent),
  );
}

export function resolveTraceAgentLinks(trace: TraceBundle): readonly PlaygroundAgentLink[] {
  const graphLinks = aggregateAgentLinksFromGraph(trace.graph);
  if (graphLinks.length > 0) {
    return graphLinks;
  }

  return aggregateAgentLinksFromTimeline(trace.timeline);
}

export { DELEGATION_EDGE_KINDS };
