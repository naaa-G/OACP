import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { createAgentRuntime, createDelegationGraphRecorder, getSchemasRoot } from '@oacp/core';

import type { PlaygroundSnapshot } from '../src/observability/playground-service.js';
import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

/** Mirror @oacp/sdk buildConsoleTraceUrl — MCPLab Day 12/15 contract. */
function buildConsoleTraceUrl(baseUrl: string, traceId: string): string {
  const origin = baseUrl
    .replace(/\/+$/, '')
    .replace(/\/playground$/, '')
    .replace(/\/console$/, '');
  return `${origin}/console/?trace_id=${traceId}&mode=showcase`;
}

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

interface SnapshotEnvelope {
  readonly ok: true;
  readonly snapshot: PlaygroundSnapshot;
}

/** MCPLab research crew roster (Day 15 full-loop contract). */
const MCPLAB_RESEARCH_CREW = [
  { role: 'coordinator', capability: 'orchestrate' },
  { role: 'planner', capability: 'plan' },
  { role: 'researcher', capability: 'research' },
  { role: 'synthesizer', capability: 'synthesize' },
  { role: 'publisher', capability: 'publish' },
] as const;

describe('MCPLab full-loop Console contract (Day 15)', () => {
  const graphRecorder = createDelegationGraphRecorder();
  const { app, context } = createTestApp({
    context: { delegationGraphRecorder: graphRecorder },
  });

  const traceId = 'd15ecb0a-0001-4000-8000-000000000015';
  const serverOrigin = 'http://127.0.0.1:3847';
  let seeded = false;

  const runtimes = MCPLAB_RESEARCH_CREW.map(({ role, capability }) => {
    const runtime = createAgentRuntime({
      identity: {
        ...loadSummarizerIdentity(),
        id: `agent://mcplab-${role}-full-loop`,
        name: `${role} (full loop)`,
        capabilities: [capability],
        metadata: { fleet: 'mcplab', role },
      },
      bus: context.bus,
      taskRecorder: context.taskRecorder,
      delegationGraphRecorder: graphRecorder,
      onTask: (task) => ({
        output: { role, echo: task.input.text ?? task.input.goal },
      }),
    });
    runtime.start();
    return runtime;
  });

  async function seedMcplabResearchTrace(): Promise<void> {
    if (seeded) {
      return;
    }

    for (const runtime of runtimes) {
      await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity: runtime.identity },
      });
    }

    const coordinator = `agent://mcplab-${MCPLAB_RESEARCH_CREW[0].role}-full-loop`;

    const send = await app.inject({
      method: 'POST',
      url: '/send-message',
      payload: {
        ...loadTaskRequestExample(),
        message_id: '770e8400-e29b-41d4-4716-4466554400d1',
        trace_id: traceId,
        from: coordinator,
        capability: 'plan',
        input: { goal: 'MCPLab research crew full-loop' },
      },
    });

    expect(send.statusCode).toBe(200);
    seeded = true;
  }

  afterAll(async () => {
    for (const runtime of runtimes) {
      runtime.stop();
    }
    await context.memoryStore.close();
    await app.close();
  });

  it('builds Console showcase deep link for trace', async () => {
    await seedMcplabResearchTrace();

    const url = buildConsoleTraceUrl(serverOrigin, traceId);
    expect(url).toContain('/console/?');
    expect(url).toContain(`trace_id=${traceId}`);
    expect(url).toContain('mode=showcase');
    expect(url).not.toContain('/playground');
  });

  it('v1 snapshot exposes five MCPLab agents in active trace', async () => {
    await seedMcplabResearchTrace();

    const response = await app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${traceId}`,
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<SnapshotEnvelope>();
    expect(body.ok).toBe(true);

    const snapshot = body.snapshot;
    expect(snapshot.active_trace?.trace_id).toBe(traceId);
    expect(snapshot.active_trace?.timeline.length).toBeGreaterThanOrEqual(1);

    const mcplabAgents = snapshot.agents.filter((row) => row.fleet === 'mcplab');
    expect(mcplabAgents.length).toBeGreaterThanOrEqual(5);

    for (const agent of mcplabAgents) {
      expect(agent.role).toEqual(expect.any(String));
      expect(agent.role?.length).toBeGreaterThan(0);
    }

    const roles = new Set(mcplabAgents.map((row) => row.role));
    expect(roles.has('coordinator')).toBe(true);
    expect(roles.has('planner')).toBe(true);
    expect(roles.has('researcher')).toBe(true);
  });

  it('rejects legacy-only snapshot path when v1 is required (MCPLab Day 15)', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/observability/snapshot',
      headers: { Accept: 'application/json' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
  });
});
