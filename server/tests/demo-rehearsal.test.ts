import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { createTestApp } from './helpers.js';

interface DemoCrewCatalog {
  readonly crews: ReadonlyArray<{
    readonly id: string;
    readonly label: string;
    readonly trace_id: string;
    readonly console_query: string;
    readonly goal: string;
    readonly agents: ReadonlyArray<{ readonly role: string; readonly capability: string }>;
  }>;
}

function loadCatalog(): DemoCrewCatalog {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  return JSON.parse(
    readFileSync(join(repoRoot, 'scripts/demo-fixtures/crews.json'), 'utf8'),
  ) as DemoCrewCatalog;
}

function buildExportFromCrew(crew: DemoCrewCatalog['crews'][number], crewIndex: number) {
  const devPublicKey = {
    kty: 'EC' as const,
    crv: 'P-256' as const,
    x: 'WKn-ZIGevcwGIyyrzFoZNBdaq9_TsqzGl96oc0CWlibY',
    y: 'ALOpExF7nDwyk9V4ToWo3L5v_6Y1sQJCrcn_6OlOWf5',
    use: 'sig' as const,
    alg: 'ES256' as const,
    kid: 'summarizer-2026',
  };

  const agents = crew.agents.map(({ role, capability }) => ({
    id: `agent://mcplab-${role}-demo-${crew.id}`,
    name: `${role} (${crew.id})`,
    version: '1.0',
    capabilities: [capability],
    publicKey: devPublicKey,
    metadata: { fleet: 'mcplab', role, crew: crew.id },
  }));

  const coordinator = agents[0]!;
  const worker = agents[Math.min(2, agents.length - 1)]!;
  const messageId = (step: number) => {
    const hex = (crewIndex * 16 + step).toString(16).padStart(12, '0');
    return `d5600de0-0000-4000-8000-${hex}`;
  };

  const started = `2026-07-01T12:${String(crewIndex).padStart(2, '0')}:00.000Z`;
  const replied = `2026-07-01T12:${String(crewIndex).padStart(2, '0')}:05.000Z`;

  return {
    trace_id: crew.trace_id,
    run_id: `demo-${crew.id}`,
    agents,
    messages: [
      {
        type: 'task_request',
        version: '1.0',
        message_id: messageId(1),
        trace_id: crew.trace_id,
        from: coordinator.id,
        timestamp: started,
        capability: coordinator.capabilities[0],
        input: { goal: crew.goal },
        deadline_ms: 60_000,
      },
      {
        type: 'task_request',
        version: '1.0',
        message_id: messageId(2),
        trace_id: crew.trace_id,
        from: coordinator.id,
        to: worker.id,
        timestamp: started,
        capability: worker.capabilities[0],
        input: { goal: crew.goal, delegated: true },
        deadline_ms: 60_000,
      },
      {
        type: 'task_response',
        version: '1.0',
        message_id: messageId(3),
        trace_id: crew.trace_id,
        from: worker.id,
        in_reply_to: messageId(2),
        timestamp: replied,
        status: 'success',
        output: { crew: crew.id, summary: `Demo fixture for ${crew.label}` },
      },
    ],
    completed_at: replied,
    source: 'mcplab-demo-fixture',
  };
}

describe('Day 56 demo rehearsal (fixture import + snapshot contract)', () => {
  const { app, context } = createTestApp();
  const catalog = loadCatalog();

  afterAll(async () => {
    await context.observabilityPersistence.close();
    await app.close();
  });

  it('imports all three crew fixtures twice without blocking errors (rehearsal)', async () => {
    for (let round = 1; round <= 2; round += 1) {
      for (let index = 0; index < catalog.crews.length; index += 1) {
        const crew = catalog.crews[index]!;
        const response = await app.inject({
          method: 'POST',
          url: '/v1/observability/import',
          payload: buildExportFromCrew(crew, index),
        });
        expect(response.statusCode).toBe(200);

        const snapshot = await app.inject({
          method: 'GET',
          url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${crew.trace_id}`,
          headers: { Accept: 'application/json' },
        });

        expect(snapshot.statusCode).toBe(200);
        const body = snapshot.json();

        const mcplabAgents = body.snapshot.agents.filter(
          (row: { fleet?: string }) => row.fleet === 'mcplab',
        );
        expect(mcplabAgents.length).toBeGreaterThanOrEqual(5);
        expect(body.snapshot.active_trace?.trace_id).toBe(crew.trace_id);
        expect((body.snapshot.active_trace?.timeline ?? []).length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});
