import type { OacpMessage } from '../protocol/message-schemas.js';
import type { DelegationGraph } from '../memory/delegation-graph-types.js';
import type { MemoryEntry } from '../memory/types.js';
import type { TraceRecord } from '../routing/trace-store.js';

import { messagesFromDelegationGraph } from './graph-messages.js';
import { buildTraceTimeline, type TraceTimelineEvent } from './trace-timeline.js';

/** Aggregated observability view for a single `trace_id`. */
export interface TraceBundle {
  readonly trace_id: string;
  readonly started_at: string;
  readonly last_activity_at: string;
  readonly message_count: number;
  readonly message_types: readonly string[];
  readonly agents: readonly string[];
  readonly messages: readonly OacpMessage[];
  readonly timeline: readonly TraceTimelineEvent[];
  readonly graph?: DelegationGraph;
  readonly memory_entries?: readonly MemoryEntry[];
}

export interface BuildTraceBundleInput {
  readonly traceId: string;
  readonly messages?: readonly OacpMessage[];
  readonly graph?: DelegationGraph;
  readonly memoryEntries?: readonly MemoryEntry[];
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function collectAgents(messages: readonly OacpMessage[]): readonly string[] {
  const agents = new Set<string>();
  for (const message of messages) {
    agents.add(message.from);
    if (message.type === 'task_request' || message.type === 'delegation') {
      if (message.to !== undefined) {
        agents.add(message.to);
      }
    }
  }
  return uniqueSorted([...agents]);
}

/** Build a unified trace bundle from bus messages and optional graph/memory sources. */
export function buildTraceBundle(input: BuildTraceBundleInput): TraceBundle | undefined {
  let messages = input.messages ?? [];

  if (messages.length === 0 && input.graph !== undefined && input.graph.nodes.length > 0) {
    messages = messagesFromDelegationGraph(input.graph);
  }

  if (messages.length === 0) {
    return undefined;
  }

  const sorted = [...messages].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) {
    return undefined;
  }

  const timeline = buildTraceTimeline(sorted);

  return {
    trace_id: input.traceId,
    started_at: first.timestamp,
    last_activity_at: last.timestamp,
    message_count: sorted.length,
    message_types: uniqueSorted(sorted.map((message) => message.type)),
    agents: collectAgents(sorted),
    messages: sorted,
    timeline,
    ...(input.graph !== undefined ? { graph: input.graph } : {}),
    ...(input.memoryEntries !== undefined ? { memory_entries: input.memoryEntries } : {}),
  };
}

/** Build a trace bundle from an in-process `TraceRecord`. */
export function buildTraceBundleFromRecord(
  record: TraceRecord,
  extras?: Omit<BuildTraceBundleInput, 'traceId' | 'messages'>,
): TraceBundle {
  const bundle = buildTraceBundle({
    traceId: record.traceId,
    messages: record.messages,
    ...(extras?.graph !== undefined ? { graph: extras.graph } : {}),
    ...(extras?.memoryEntries !== undefined ? { memoryEntries: extras.memoryEntries } : {}),
  });

  if (!bundle) {
    throw new Error(`Trace "${record.traceId}" has no messages`);
  }

  return bundle;
}
