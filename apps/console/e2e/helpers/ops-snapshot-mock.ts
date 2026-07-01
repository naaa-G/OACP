import type { Page } from '@playwright/test';
import type { PlaygroundSnapshot, TraceGraphView } from '@oacp/observability-client';

import { buildE2eSnapshot } from '../fixtures/snapshot.js';

const publicKey = {
  kty: 'OKP',
  crv: 'Ed25519',
  x: 'e2e-test-public-key',
} as const;

/** Build a snapshot whose ops graph is derived from trace-scoped links (ops mode ignores graph API). */
export function buildOpsSnapshotFromGraph(graph: TraceGraphView): PlaygroundSnapshot {
  const traceId = graph.trace_id;
  const base = buildE2eSnapshot(traceId);

  const traceAgents = graph.nodes.map((node) => ({
    id: node.agent_id,
    name: node.name,
    version: '1.0',
    capabilities: [...node.capabilities],
    publicKey,
    status: node.status,
    ...(node.fleet !== undefined
      ? {
          fleet: node.fleet,
          role: node.role,
          metadata: { fleet: node.fleet, role: node.role },
        }
      : {}),
    ...(node.role !== undefined && node.fleet === undefined ? { role: node.role } : {}),
  }));

  return {
    ...base,
    server: {
      ...base.server,
      registered_agents: traceAgents.length,
    },
    agents: traceAgents,
    traces: base.traces.map((trace) =>
      trace.traceId === traceId
        ? {
            ...trace,
            agents: graph.nodes.map((node) => node.agent_id),
            messageCount: graph.edges.length,
          }
        : trace,
    ),
    active_trace:
      base.active_trace === undefined
        ? undefined
        : {
            ...base.active_trace,
            trace_id: traceId,
            agents: graph.nodes.map((node) => node.agent_id),
            message_count: graph.edges.length,
            timeline: [],
          },
    agent_links: graph.edges.map((edge) => ({
      from_agent: edge.from_agent,
      to_agent: edge.to_agent,
      kind: edge.kind,
      ...(edge.capability !== undefined ? { capability: edge.capability } : {}),
      message_count: edge.message_count,
    })),
  };
}

export interface OpsSnapshotMockHandle {
  readonly getSnapshotVersion: () => number;
}

/** Mock observability snapshot for ops-mode graph tests (version increments on each snapshot fetch). */
export async function mockOpsSnapshotGraph(
  page: Page,
  buildSnapshot: (snapshotVersion: number) => PlaygroundSnapshot,
): Promise<OpsSnapshotMockHandle> {
  let snapshotVersion = 0;

  await page.route('**/v1/observability/snapshot**', async (route) => {
    snapshotVersion += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: buildSnapshot(snapshotVersion),
      }),
    });
  });

  return {
    getSnapshotVersion: () => snapshotVersion,
  };
}
