import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, createDelegationGraphRecorder, getSchemasRoot } from '@oacp/core';

import type { TraceGraphView } from '../src/observability/trace-graph.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

interface TraceGraphEnvelope {
  readonly ok: true;
  readonly graph: TraceGraphView;
}

describe('trace graph observability HTTP API (Day 26)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

  const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c77';

  const worker = createAgentRuntime({
    identity: {
      ...loadSummarizerIdentity(),
      id: 'agent://worker',
      name: 'Worker',
      capabilities: ['echo'],
      metadata: { fleet: 'mcplab', role: 'coder' },
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => ({
      output: { echo: task.input.text },
    }),
  });

  worker.start();

  let seeded = false;

  async function seedTraceWithIdleRegistry(): Promise<void> {
    if (seeded) {
      return;
    }

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://coordinator',
          name: 'Coordinator',
          capabilities: ['orchestrate'],
          metadata: { fleet: 'mcplab', role: 'coordinator' },
        },
      },
    });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity: worker.identity },
    });

    for (let index = 0; index < 5; index += 1) {
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: {
          identity: {
            ...loadSummarizerIdentity(),
            id: `agent://idle-registry-${index}`,
            name: `Idle Registry ${index}`,
            capabilities: ['idle'],
            metadata: { fleet: 'mcplab', role: 'researcher' },
          },
        },
      });
    }

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400f7',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'trace-graph-day-26' },
      },
    });

    expect(send.statusCode).toBe(200);
    seeded = true;
  }

  afterAll(async () => {
    worker.stop();
    await context.memoryStore.close();
    await app.close();
  });

  it('exposes GET /v1/observability/traces/:traceId/graph with trace-scoped nodes', async () => {
    await seedTraceWithIdleRegistry();

    const response = await app.inject({
      method: 'GET',
      url: `/v1/observability/traces/${traceId}/graph`,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<TraceGraphEnvelope>();
    expect(body.ok).toBe(true);
    expect(body.graph.trace_id).toBe(traceId);
    expect(body.graph.layout).toBe('hierarchical');

    const nodeIds = body.graph.nodes.map((node) => node.agent_id);
    expect(nodeIds).toContain('agent://coordinator');
    expect(nodeIds).toContain('agent://worker');
    expect(nodeIds.some((id) => id.startsWith('agent://idle-registry-'))).toBe(false);
    expect(body.graph.nodes.length).toBeLessThan(context.registry.size);

    for (const node of body.graph.nodes) {
      expect(node).toMatchObject({
        agent_id: expect.any(String),
        name: expect.any(String),
        depth: expect.any(Number),
        status: expect.stringMatching(/^(idle|active|error|offline)$/),
        capabilities: expect.any(Array),
      });
      expect(node.depth).toBeGreaterThanOrEqual(0);
      expect(node.depth).toBeLessThanOrEqual(body.graph.max_depth);
    }

    const coordinator = body.graph.nodes.find((node) => node.agent_id === 'agent://coordinator');
    const workerNode = body.graph.nodes.find((node) => node.agent_id === 'agent://worker');
    expect(coordinator).toMatchObject({ fleet: 'mcplab', role: 'coordinator' });
    expect(workerNode).toMatchObject({ fleet: 'mcplab', role: 'coder' });
    expect(workerNode?.depth).toBeGreaterThanOrEqual(coordinator?.depth ?? 0);
  });

  it('advertises the graph endpoint on server index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body: { api: { observability_trace_graph: string } } = response.json();
    expect(body.api.observability_trace_graph).toBe('/v1/observability/traces/:traceId/graph');
  });

  it('returns 404 for unknown trace graph', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/traces/00000000-0000-4000-8000-000000000099/graph',
    });

    expect(response.statusCode).toBe(404);
  });
});
