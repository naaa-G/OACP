import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

import { getSchemasRoot, parseAgentIdentity } from '@oacp/core';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { SqliteObservabilityPersistence } from '../src/storage/sqlite-observability-persistence.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';
import { isolatedSqlitePath } from './sqlite-test-path.js';

function sqlitePersistenceAvailable(): boolean {
  try {
    const probe = new SqliteObservabilityPersistence();
    void probe.close();
    return true;
  } catch {
    return false;
  }
}

const SQLITE_OK = sqlitePersistenceAvailable();

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}

if (SQLITE_OK) {
  describe('observability SQLite persistence (Day 53)', () => {
    const persistence = new SqliteObservabilityPersistence();
    const traceId = 'd53-persist-trace-0001';
    const agentId = 'agent://persist-worker';

    afterAll(async () => {
      await persistence.close();
    });

    it('persists agents and messages with last_seen_at', () => {
      const identity = {
        ...loadSummarizerIdentity(),
        id: agentId,
        name: 'Persist Worker',
        capabilities: ['echo'],
      };

      persistence.upsertAgent(identity);
      persistence.appendMessage({
        ...loadTaskRequestExample(),
        type: 'task_request',
        message_id: 'd53-msg-0001',
        trace_id: traceId,
        from: agentId,
        timestamp: '2026-06-30T12:00:00.000Z',
        capability: 'echo',
        input: { text: 'persist' },
      } as never);

      expect(persistence.hasTrace(traceId)).toBe(true);
      expect(persistence.getAgentLastSeen(agentId)).toBe('2026-06-30T12:00:00.000Z');
      expect(persistence.getTraceMessages(traceId)).toHaveLength(1);
    });

    it('appendMessage is idempotent by message_id', () => {
      const before = persistence.getTraceMessages(traceId).length;
      const appended = persistence.appendMessage({
        ...loadTaskRequestExample(),
        type: 'task_request',
        message_id: 'd53-msg-0001',
        trace_id: traceId,
        from: agentId,
        timestamp: '2026-06-30T12:00:00.000Z',
        capability: 'echo',
        input: { text: 'persist' },
      } as never);

      expect(appended).toBe(false);
      expect(persistence.getTraceMessages(traceId)).toHaveLength(before);
    });
  });
}

describe('observability import API (Day 53)', () => {
  const { app, context } = createTestApp();
  const importTraceId = 'd53-import-trace-0002';

  afterAll(async () => {
    await context.observabilityPersistence.close();
    await app.close();
  });

  it('POST /v1/observability/import registers agents and replays messages', async () => {
    const identity = {
      ...loadSummarizerIdentity(),
      id: 'agent://imported-planner',
      name: 'Imported Planner',
      capabilities: ['plan'],
      metadata: { fleet: 'mcplab', role: 'planner' },
    };

    const response = await app.inject({
      method: 'POST',
      url: '/v1/observability/import',
      payload: {
        trace_id: importTraceId,
        agents: [identity],
        messages: [
          {
            ...loadTaskRequestExample(),
            type: 'task_request',
            message_id: 'd53-import-msg-1',
            trace_id: importTraceId,
            from: identity.id,
            timestamp: '2026-06-30T13:00:00.000Z',
            capability: 'plan',
            input: { goal: 'imported trace' },
          },
        ],
        source: 'mcplab',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      result: {
        trace_id: importTraceId,
        imported_messages: 1,
        registered_agents: 1,
      },
    });

    const snapshot = await app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${importTraceId}`,
      headers: { Accept: 'application/json' },
    });

    expect(snapshot.statusCode).toBe(200);
    const body = snapshot.json();
    expect(body.snapshot.active_trace?.trace_id).toBe(importTraceId);
    expect(parseAgentIdentity(context.registry.get(identity.id)!)).toMatchObject({
      id: identity.id,
    });
  });

  it('import is idempotent for duplicate message ids', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/observability/import',
      payload: {
        trace_id: importTraceId,
        messages: [
          {
            ...loadTaskRequestExample(),
            type: 'task_request',
            message_id: 'd53-import-msg-1',
            trace_id: importTraceId,
            from: 'agent://imported-planner',
            timestamp: '2026-06-30T13:00:00.000Z',
            capability: 'plan',
            input: { goal: 'imported trace' },
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      result: { skipped_messages: 1, imported_messages: 0 },
    });
  });
});

if (SQLITE_OK) {
  describe('observability persistence with sqlite backend (Day 53)', () => {
    it('hydrates bus traces after simulated restart', async () => {
      const sqlitePath = isolatedSqlitePath('test-restart');
      const first = createTestApp({
        config: { memoryBackend: 'sqlite', memorySqlitePath: sqlitePath },
      });

      const identity = {
        ...loadSummarizerIdentity(),
        id: 'agent://restart-demo',
        name: 'Restart Demo',
        capabilities: ['echo'],
      };

      await first.app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity },
      });

      const traceId = '550e8400-e29b-41d4-4716-4466554400d3';
      const sendResponse = await first.app.inject({
        method: 'POST',
        url: '/send-message',
        payload: {
          ...loadTaskRequestExample(),
          message_id: '550e8400-e29b-41d4-4716-4466554400d4',
          trace_id: traceId,
          from: identity.id,
          capability: 'echo',
          input: { text: 'survive restart' },
        },
      });

      expect(sendResponse.statusCode).toBe(200);
      expect(first.context.observabilityPersistence.hasTrace(traceId)).toBe(true);

      await first.context.observabilityPersistence.close();
      await first.context.memoryStore.close();
      await first.app.close();

      const second = createTestApp({
        config: { memoryBackend: 'sqlite', memorySqlitePath: sqlitePath },
      });

      const listing = await second.app.inject({
        method: 'GET',
        url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${traceId}`,
        headers: { Accept: 'application/json' },
      });

      expect(listing.statusCode).toBe(200);
      const body = listing.json();
      expect(body.snapshot.active_trace?.trace_id).toBe(traceId);
      expect(body.snapshot.traces.some((row: { traceId: string }) => row.traceId === traceId)).toBe(
        true,
      );

      await second.context.observabilityPersistence.close();
      await second.context.memoryStore.close();
      await second.app.close();
    });
  });
}
