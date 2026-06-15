import {
  buildDelegationGraphFromMemoryEntries,
  buildTraceBundle,
  type DelegationGraph,
  type InMemoryMessageBus,
  type MemoryStore,
  type OacpMessage,
  type TraceBundle,
  type TraceListEntry,
} from '@oacp/core';
import type { DelegationGraphRecorder } from '@oacp/core';

export interface TraceServiceContext {
  readonly bus: InMemoryMessageBus;
  readonly memoryStore: MemoryStore;
  readonly delegationGraphRecorder: DelegationGraphRecorder;
}

export interface ListTracesResult {
  readonly traces: readonly TraceListEntry[];
  readonly count: number;
  readonly total: number;
}

/** Resolve a unified trace bundle from bus, memory, and delegation graph sources. */
export async function resolveTraceBundle(
  context: TraceServiceContext,
  traceId: string,
): Promise<TraceBundle | undefined> {
  const busRecord = context.bus.getTrace(traceId);
  const memoryEntries = await context.memoryStore.query({ trace_id: traceId, limit: 1000 });

  const messages: readonly OacpMessage[] =
    busRecord !== undefined && busRecord.messages.length > 0 ? busRecord.messages : [];

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

/** List traces from the in-process bus trace store. */
export function listActiveTraces(
  context: TraceServiceContext,
  options?: { limit?: number; offset?: number },
): ListTracesResult {
  const total = context.bus.getStats().traceCount;
  const traces = context.bus.listTraces(options);
  return {
    traces,
    count: traces.length,
    total,
  };
}
