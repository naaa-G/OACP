import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSchemasRoot } from '@oacp/core';
import { readFileSync } from 'node:fs';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { runMcplabStartupSync } from '../src/observability/mcplab-sync.js';
import { SqliteObservabilityPersistence } from '../src/storage/sqlite-observability-persistence.js';
import { createTestApp, loadSummarizerIdentity } from './helpers.js';

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

describe('MCPLab startup observability backfill (Day 53)', () => {
  if (!SQLITE_OK) {
    it.skip('requires sqlite persistence (better-sqlite3 native module)', () => {});
    return;
  }

  const exportUrl = 'http://mcplab.test/internal/observability/export';
  const traceId = 'd53-startup-sync-trace-0001';
  const agentId = 'agent://mcplab-startup-planner';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('imports missing traces from mocked MCPLab export after recreate', async () => {
    const sqlitePath = join(process.cwd(), `.oacp/test-mcplab-startup-${Date.now()}.db`);
    const identity = {
      ...loadSummarizerIdentity(),
      id: agentId,
      name: 'Startup Planner',
      capabilities: ['plan'],
      metadata: { fleet: 'mcplab', role: 'planner' },
    };

    const exportBundle = {
      ok: true,
      exports: [
        {
          trace_id: traceId,
          run_id: 'mcplab-run-1',
          agents: [identity],
          messages: [
            {
              ...loadTaskRequestExample(),
              type: 'task_request',
              message_id: 'd53-startup-sync-msg-1',
              trace_id: traceId,
              from: agentId,
              timestamp: '2026-06-30T15:00:00.000Z',
              capability: 'plan',
              input: { goal: 'backfill from mcplab' },
            },
          ],
          completed_at: '2026-06-30T15:00:00.000Z',
          source: 'mcplab',
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === exportUrl) {
          return new Response(JSON.stringify(exportBundle), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`unexpected fetch: ${url}`);
      }),
    );

    const { app, context } = createTestApp({
      config: {
        memoryBackend: 'sqlite',
        memorySqlitePath: sqlitePath,
        importFromMcplabOnStartup: true,
        mcplabExportUrl: exportUrl,
      },
    });

    expect(context.observabilityPersistence.hasTrace(traceId)).toBe(false);

    const syncResult = await runMcplabStartupSync(context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });

    expect(syncResult).toEqual({
      imported_traces: 1,
      skipped_traces: 0,
      failed_traces: 0,
    });
    expect(context.observabilityPersistence.hasTrace(traceId)).toBe(true);

    const snapshot = await app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${traceId}`,
      headers: { Accept: 'application/json' },
    });

    expect(snapshot.statusCode).toBe(200);
    const body = snapshot.json();
    expect(body.snapshot.active_trace?.trace_id).toBe(traceId);
    expect(body.snapshot.agents.some((row: { id: string }) => row.id === agentId)).toBe(true);

    const secondSync = await runMcplabStartupSync(context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });
    expect(secondSync).toEqual({
      imported_traces: 0,
      skipped_traces: 1,
      failed_traces: 0,
    });

    await context.observabilityPersistence.close();
    await context.memoryStore.close();
    await app.close();
  });
});

function loadTaskRequestExample(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(getSchemasRoot(), 'examples', 'task_request.example.json'), 'utf8'),
  ) as Record<string, unknown>;
}
