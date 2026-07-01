import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { runMcplabStartupSync } from '../src/observability/mcplab-sync.js';
import { SqliteObservabilityPersistence } from '../src/storage/sqlite-observability-persistence.js';
import { createTestApp } from './helpers.js';
import {
  DAY55_SYNC_TRACE_COUNT,
  buildDay55ExportBundle,
  day55TraceId,
  measureSnapshotLatencyMs,
} from './load-fixtures.js';

const SYNC_BUDGET_MS = 60_000;
const SNAPSHOT_P95_BUDGET_MS = 200;

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

describe('Day 55 MCPLab sync backfill smoke', () => {
  if (!SQLITE_OK) {
    it.skip('requires sqlite persistence (better-sqlite3 native module)', () => {});
    return;
  }

  const exportUrl = 'http://mcplab.test/internal/observability/export';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(`imports ${DAY55_SYNC_TRACE_COUNT} historical runs under ${SYNC_BUDGET_MS / 1000}s and keeps snapshot p95 under ${SNAPSHOT_P95_BUDGET_MS}ms`, async () => {
    const sqlitePath = join(process.cwd(), `.oacp/test-day55-sync-${Date.now()}.db`);
    const bundle = buildDay55ExportBundle(DAY55_SYNC_TRACE_COUNT);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        if (String(input) === exportUrl) {
          return new Response(JSON.stringify(bundle), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`unexpected fetch: ${input}`);
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

    const firstTraceId = day55TraceId(0);
    expect(context.observabilityPersistence.hasTrace(firstTraceId)).toBe(false);

    const syncStarted = performance.now();
    const syncResult = await runMcplabStartupSync(context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });
    const syncElapsedMs = performance.now() - syncStarted;

    expect(syncResult).toMatchObject({
      imported_traces: DAY55_SYNC_TRACE_COUNT,
      skipped_traces: 0,
      failed_traces: 0,
    });
    expect(syncElapsedMs).toBeLessThan(SYNC_BUDGET_MS);
    expect(context.observabilityPersistence.hasTrace(firstTraceId)).toBe(true);
    expect(
      context.observabilityPersistence.hasTrace(day55TraceId(DAY55_SYNC_TRACE_COUNT - 1)),
    ).toBe(true);

    const { p95 } = await measureSnapshotLatencyMs(app, {
      path: OBSERVABILITY_SNAPSHOT_PATH,
      samples: 20,
      warmup: 3,
    });
    expect(p95).toBeLessThan(SNAPSHOT_P95_BUDGET_MS);

    await context.observabilityPersistence.close();
    await context.memoryStore.close();
    await app.close();
  });

  it('post-recreate OACP backfill path imports only missing traces', async () => {
    const sqlitePath = join(process.cwd(), `.oacp/test-day55-recreate-${Date.now()}.db`);
    const bundle = buildDay55ExportBundle(DAY55_SYNC_TRACE_COUNT);

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL) => {
        if (String(input) === exportUrl) {
          return new Response(JSON.stringify(bundle), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`unexpected fetch: ${input}`);
      }),
    );

    const first = createTestApp({
      config: {
        memoryBackend: 'sqlite',
        memorySqlitePath: sqlitePath,
        mcplabExportUrl: exportUrl,
      },
    });

    await runMcplabStartupSync(first.context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });

    await first.context.observabilityPersistence.close();
    await first.context.memoryStore.close();
    await first.app.close();

    const recreated = createTestApp({
      config: {
        memoryBackend: 'sqlite',
        memorySqlitePath: sqlitePath,
        mcplabExportUrl: exportUrl,
      },
    });

    const syncResult = await runMcplabStartupSync(recreated.context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });

    expect(syncResult).toEqual({
      imported_traces: DAY55_SYNC_TRACE_COUNT,
      skipped_traces: 0,
      failed_traces: 0,
    });

    const snapshot = await recreated.app.inject({
      method: 'GET',
      url: `${OBSERVABILITY_SNAPSHOT_PATH}?trace_id=${day55TraceId(0)}`,
      headers: { Accept: 'application/json' },
    });
    expect(snapshot.statusCode).toBe(200);
    const body = snapshot.json();
    expect(body.snapshot.active_trace?.trace_id).toBe(day55TraceId(0));

    await recreated.context.observabilityPersistence.close();
    await recreated.context.memoryStore.close();
    await recreated.app.close();
  });
});
