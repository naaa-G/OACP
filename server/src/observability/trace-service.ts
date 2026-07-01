import {
  buildDelegationGraphFromMemoryEntries,
  buildTraceBundle,
  type DelegationGraph,
  type InMemoryMessageBus,
  type MemoryStore,
  type TraceBundle,
  type TraceListEntry,
} from '@oacp/core';
import type { DelegationGraphRecorder } from '@oacp/core';

import type { ObservabilityPersistence } from './observability-persistence.js';
import { resolveTraceMessages } from './observability-trace-listing.js';

export interface TraceServiceContext {
  readonly bus: InMemoryMessageBus;
  readonly memoryStore: MemoryStore;
  readonly delegationGraphRecorder: DelegationGraphRecorder;
  readonly observabilityPersistence: ObservabilityPersistence;
}

export interface ListTracesResult {
  readonly traces: readonly TraceListEntry[];
  readonly count: number;
  readonly total: number;
}

/** Resolve a unified trace bundle from bus, persistence, memory, and delegation graph sources. */
export async function resolveTraceBundle(
  context: TraceServiceContext,
  traceId: string,
): Promise<TraceBundle | undefined> {
  const messages = resolveTraceMessages(context, traceId);
  const memoryEntries = await context.memoryStore.query({ trace_id: traceId, limit: 1000 });

  let graph: DelegationGraph | undefined =
    (await context.delegationGraphRecorder.getGraph(traceId)) ?? undefined;

  if (!graph || graph.nodes.length === 0) {
    const rebuilt = buildDelegationGraphFromMemoryEntries(memoryEntries);
    if (rebuilt !== undefined && rebuilt.nodes.length > 0) {
      graph = rebuilt;
    }
  }

  return buildTraceBundle({
    traceId,
    messages,
    ...(graph !== undefined && graph.nodes.length > 0 ? { graph } : {}),
    ...(memoryEntries.length > 0 ? { memoryEntries } : {}),
  });
}

/** List traces from bus + persistence (Day 53). */
export function listActiveTraces(
  context: TraceServiceContext,
  options?: { limit?: number; offset?: number },
): ListTracesResult {
  const busTotal = context.bus.getStats().traceCount;
  const persistedTotal = context.observabilityPersistence.enabled
    ? context.observabilityPersistence.listTraceIds().length
    : 0;
  const total = Math.max(busTotal, persistedTotal);
  const traces = context.observabilityPersistence.enabled
    ? mergeTraceEntries(
        context.bus.listTraces(options),
        context.observabilityPersistence.listTraces(options),
      )
    : context.bus.listTraces(options);

  return {
    traces,
    count: traces.length,
    total,
  };
}

function mergeTraceEntries(
  busTraces: readonly TraceListEntry[],
  persistedTraces: readonly TraceListEntry[],
): readonly TraceListEntry[] {
  const byId = new Map<string, TraceListEntry>();
  for (const entry of [...busTraces, ...persistedTraces]) {
    const existing = byId.get(entry.traceId);
    if (existing === undefined || entry.lastActivityAt > existing.lastActivityAt) {
      byId.set(entry.traceId, entry);
    }
  }
  return [...byId.values()].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
}
