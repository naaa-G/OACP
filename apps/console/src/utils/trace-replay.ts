import type {
  TraceGraphEdge,
  TraceGraphNode,
  TraceGraphView,
  TraceTimelineEvent,
} from '@oacp/observability-client';

import { computeOpsGraphAgentDepths } from '../graph/ops-graph-depth.js';

const DELEGATION_MESSAGE_TYPES = new Set(['task_request', 'delegation']);

/** Inclusive upper bound for timeline prefix replay (0-based message index). */
export function clampReplayMessageIndex(index: number, messageCount: number): number {
  if (messageCount <= 0) {
    return 0;
  }
  return Math.min(Math.max(0, Math.floor(index)), messageCount - 1);
}

/** Timeline events visible at the scrubbed message index (inclusive). */
export function sliceTimelineForReplay(
  timeline: readonly TraceTimelineEvent[] | undefined,
  messageIndex: number,
): readonly TraceTimelineEvent[] {
  if (timeline === undefined || timeline.length === 0) {
    return [];
  }
  const clamped = clampReplayMessageIndex(messageIndex, timeline.length);
  return timeline.slice(0, clamped + 1);
}

/** Agent URIs participating in a timeline prefix. */
export function agentsInTimelinePrefix(events: readonly TraceTimelineEvent[]): ReadonlySet<string> {
  const agentIds = new Set<string>();
  for (const event of events) {
    agentIds.add(event.from);
    if (event.to !== undefined && event.to.length > 0) {
      agentIds.add(event.to);
    }
  }
  return agentIds;
}

/** Aggregate delegation edges from a timeline prefix (mirrors server timeline fallback). */
export function aggregateEdgesFromTimelinePrefix(
  events: readonly TraceTimelineEvent[],
): readonly TraceGraphEdge[] {
  const linkMap = new Map<string, TraceGraphEdge>();

  for (const event of events) {
    if (
      event.to === undefined ||
      event.to.length === 0 ||
      event.from === event.to ||
      !DELEGATION_MESSAGE_TYPES.has(event.type)
    ) {
      continue;
    }

    const kind = event.type === 'delegation' ? 'delegates' : 'subtask';
    const key = `${event.from}\0${event.to}\0${kind}\0${event.capability ?? ''}`;
    const existing = linkMap.get(key);
    if (existing !== undefined) {
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

/** Restrict a trace graph to nodes/edges revealed by messages up to `messageIndex`. */
export function sliceTraceGraphForReplay(
  graph: TraceGraphView,
  timeline: readonly TraceTimelineEvent[],
  messageIndex: number,
): TraceGraphView {
  const prefix = sliceTimelineForReplay(timeline, messageIndex);
  const activeAgents = agentsInTimelinePrefix(prefix);
  const edges = aggregateEdgesFromTimelinePrefix(prefix);
  const depths = computeOpsGraphAgentDepths([...activeAgents], edges);

  const nodes: TraceGraphNode[] = graph.nodes
    .filter((node) => activeAgents.has(node.agent_id))
    .map((node) => ({
      ...node,
      depth: depths.get(node.agent_id) ?? node.depth,
      status: 'active' as const,
    }))
    .sort((left, right) => {
      if (left.depth !== right.depth) {
        return left.depth - right.depth;
      }
      return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' });
    });

  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0);

  return {
    ...graph,
    max_depth: maxDepth,
    nodes,
    edges,
  };
}

export type TraceReplaySpeed = 1 | 2;

const DEFAULT_STEP_MS = 500;
const MIN_STEP_MS = 120;
const MAX_STEP_MS = 3000;

/** Playback delay before advancing from `fromIndex` to the next message. */
export function replayStepDelayMs(
  timeline: readonly TraceTimelineEvent[],
  fromIndex: number,
  speed: TraceReplaySpeed,
): number {
  if (fromIndex >= timeline.length - 1) {
    return DEFAULT_STEP_MS / speed;
  }

  const current = timeline[fromIndex];
  const next = timeline[fromIndex + 1];
  if (current === undefined || next === undefined) {
    return DEFAULT_STEP_MS / speed;
  }

  const currentTs = Date.parse(current.timestamp);
  const nextTs = Date.parse(next.timestamp);
  if (!Number.isFinite(currentTs) || !Number.isFinite(nextTs)) {
    return DEFAULT_STEP_MS / speed;
  }

  const delta = Math.max(nextTs - currentTs, MIN_STEP_MS);
  return Math.min(delta / speed, MAX_STEP_MS);
}

/** True when replay scrubber should render (multi-message traces only). */
export function traceReplaySupported(messageCount: number): boolean {
  return messageCount >= 2;
}
