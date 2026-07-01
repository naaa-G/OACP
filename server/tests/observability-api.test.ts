import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, createDelegationGraphRecorder, getSchemasRoot } from '@oacp/core';

import type { PlaygroundSnapshot } from '../src/observability/playground-service.js';
import {
  LEGACY_PLAYGROUND_SNAPSHOT_PATH,
  OBSERVABILITY_SNAPSHOT_PATH,
} from '../src/observability/playground-service.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

interface SnapshotEnvelope {
  readonly ok: true;
  readonly snapshot: PlaygroundSnapshot;
}

function assertSnapshotContract(snapshot: PlaygroundSnapshot): void {
  expect(snapshot.server).toMatchObject({
    status: 'healthy',
    protocol_version: expect.any(String),
    registered_agents: expect.any(Number),
    bus_open: expect.any(Boolean),
  });
  expect(Array.isArray(snapshot.agents)).toBe(true);
  expect(Array.isArray(snapshot.traces)).toBe(true);
  expect(typeof snapshot.trace_count).toBe('number');
  expect(Array.isArray(snapshot.agent_links)).toBe(true);

  for (const trace of snapshot.traces) {
    expect(trace).toMatchObject({
      traceId: expect.any(String),
      startedAt: expect.any(String),
      lastActivityAt: expect.any(String),
      messageCount: expect.any(Number),
      messageTypes: expect.any(Array),
      agents: expect.any(Array),
    });
  }

  if (snapshot.active_trace !== undefined) {
    expect(snapshot.active_trace).toMatchObject({
      trace_id: expect.any(String),
      started_at: expect.any(String),
      last_activity_at: expect.any(String),
      message_count: expect.any(Number),
      message_types: expect.any(Array),
      agents: expect.any(Array),
      timeline: expect.any(Array),
    });
  }
}

describe('observability snapshot HTTP API (Day 6)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

  const worker = createAgentRuntime({
    identity: {
      ...loadSummarizerIdentity(),
      id: 'agent://worker',
      name: 'Worker',
      capabilities: ['echo'],
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => ({
      output: { echo: task.input.text },
    }),
  });

  worker.start();

  const traceId = '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c66';
  let seeded = false;

  async function seedTrace(): Promise<void> {
    if (seeded) {
      return;
    }

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity: worker.identity },
    });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://coordinator',
          name: 'Coordinator',
          capabilities: ['orchestrate'],
        },
      },
    });

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '550e8400-e29b-41d4-4716-4466554400f1',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'echo',
        input: { text: 'observability-v1-test' },
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

  describe.each([
    [OBSERVABILITY_SNAPSHOT_PATH, 'v1'],
    [LEGACY_PLAYGROUND_SNAPSHOT_PATH, 'legacy playground'],
  ] as const)('GET %s (%s)', (path, _label) => {
    it('returns unified snapshot envelope', async () => {
      await seedTrace();

      const response = await app.inject({
        method: 'GET',
        url: `${path}?trace_id=${traceId}`,
        headers: { Accept: 'application/json' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');

      const body = response.json<SnapshotEnvelope>();
      expect(body.ok).toBe(true);
      assertSnapshotContract(body.snapshot);
      expect(body.snapshot.agents.length).toBeGreaterThanOrEqual(2);
      expect(body.snapshot.traces.some((trace) => trace.traceId === traceId)).toBe(true);
      expect(body.snapshot.active_trace?.trace_id).toBe(traceId);
      expect(body.snapshot.active_trace?.message_count).toBeGreaterThanOrEqual(1);
    });

    it('omits active_trace when trace_id is absent', async () => {
      const response = await app.inject({
        method: 'GET',
        url: path,
        headers: { Accept: 'application/json' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<SnapshotEnvelope>();
      expect(body.snapshot.active_trace).toBeUndefined();
      expect(body.snapshot.trace_count).toBeGreaterThanOrEqual(0);
    });

    it('respects limit query param for trace listing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `${path}?limit=1`,
        headers: { Accept: 'application/json' },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<SnapshotEnvelope>();
      expect(body.snapshot.traces.length).toBeLessThanOrEqual(1);
    });
  });

  it('v1 and legacy endpoints return identical snapshots', async () => {
    await seedTrace();

    const query = `trace_id=${traceId}&limit=10`;
    const v1 = await app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?${query}`,
      headers: { Accept: 'application/json' },
    });
    const legacy = await app.inject({
      method: 'GET',
      url: `${LEGACY_PLAYGROUND_SNAPSHOT_PATH}?${query}`,
      headers: { Accept: 'application/json' },
    });

    expect(v1.statusCode).toBe(200);
    expect(legacy.statusCode).toBe(200);

    const v1Body = v1.json<SnapshotEnvelope>();
    const legacyBody = legacy.json<SnapshotEnvelope>();
    expect(v1Body.snapshot).toEqual(legacyBody.snapshot);
  });

  it('advertises v1 snapshot path on server index', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      api: { observability_snapshot: string; playground_snapshot: string };
    }>();

    expect(body.api.observability_snapshot).toBe(OBSERVABILITY_SNAPSHOT_PATH);
    expect(body.api.playground_snapshot).toBe(LEGACY_PLAYGROUND_SNAPSHOT_PATH);
  });
});

describe('observability snapshot agent enrichment (Day 9)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

  const plannerRuntime = createAgentRuntime({
    identity: {
      ...loadSummarizerIdentity(),
      id: 'agent://mcplab-planner',
      name: 'MCPLab Planner',
      capabilities: ['plan'],
      metadata: { fleet: 'mcplab', role: 'planner' },
    },
    bus: context.bus,
    taskRecorder: context.taskRecorder,
    delegationGraphRecorder: graphRecorder,
    onTask: (task) => ({
      output: { plan: task.input.text },
    }),
  });

  plannerRuntime.start();

  const traceId = '1a2b3c4d-5e6f-7890-abcd-ef1234567890';

  afterAll(async () => {
    plannerRuntime.stop();
    await context.memoryStore.close();
    await app.close();
  });

  it('includes fleet, role, status, and last_seen_at on enriched agents', async () => {
    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: { identity: plannerRuntime.identity },
    });

    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://coordinator',
          name: 'Coordinator',
          capabilities: ['orchestrate'],
        },
      },
    });

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '660e8400-e29b-41d4-4716-4466554400f2',
        trace_id: traceId,
        from: 'agent://coordinator',
        capability: 'plan',
        input: { text: 'enrichment-test' },
      },
    });
    expect(send.statusCode).toBe(200);

    const response = await app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${traceId}`,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<SnapshotEnvelope>();
    const planner = body.snapshot.agents.find((row) => row.id === 'agent://mcplab-planner');
    const coordinator = body.snapshot.agents.find((row) => row.id === 'agent://coordinator');

    expect(planner).toMatchObject({
      fleet: 'mcplab',
      role: 'planner',
      status: 'active',
    });
    expect(planner?.last_seen_at).toEqual(expect.any(String));

    expect(coordinator).toMatchObject({
      status: 'active',
    });
    expect(coordinator?.fleet).toBeUndefined();
  });

  it('infers mcplab fleet and role for mcplab URIs without registration metadata', async () => {
    await app.inject({
      method: 'POST',
      url: '/agents',
      payload: {
        identity: {
          ...loadSummarizerIdentity(),
          id: 'agent://mcplab-synthesizer-crew-demo',
          name: 'Synthesizer (crew demo)',
          capabilities: ['synthesize'],
        },
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: OBSERVABILITY_SNAPSHOT_PATH,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<SnapshotEnvelope>();
    const synthesizer = body.snapshot.agents.find(
      (row) => row.id === 'agent://mcplab-synthesizer-crew-demo',
    );

    expect(synthesizer).toMatchObject({
      fleet: 'mcplab',
      role: 'synthesizer',
    });
  });
});
