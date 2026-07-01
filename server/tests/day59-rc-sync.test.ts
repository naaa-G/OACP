/**
 * Day 59 — RC sync test: MCPLab Postgres with N prior runs → fresh OACP container → backfill.
 *
 * Simulates:
 * 1. MCPLab export holds N historical traces (Postgres unchanged)
 * 2. Fresh OACP SQLite (recreate container) → startup sync → Console snapshot lists N traces
 * 3. Second recreate → same count (idempotent backfill)
 */
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { runMcplabStartupSync } from '../src/observability/mcplab-sync.js';
import { SqliteObservabilityPersistence } from '../src/storage/sqlite-observability-persistence.js';
import { createTestApp } from './helpers.js';
import { DAY55_SYNC_TRACE_COUNT, buildDay55ExportBundle, day55TraceId } from './load-fixtures.js';

const RC_TRACE_COUNT = DAY55_SYNC_TRACE_COUNT;
const exportUrl = 'http://mcplab.test/internal/observability/export';

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

function stubMcplabExport(traceCount: number): void {
  const bundle = buildDay55ExportBundle(traceCount);
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
}

async function syncFreshOacp(sqlitePath: string) {
  const { app, context } = createTestApp({
    config: {
      memoryBackend: 'sqlite',
      memorySqlitePath: sqlitePath,
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    },
  });

  const syncResult = await runMcplabStartupSync(context, {
    importFromMcplabOnStartup: true,
    mcplabExportUrl: exportUrl,
  });

  const snapshot = await app.inject({
    method: 'GET',
    url: OBSERVABILITY_SNAPSHOT_PATH,
    headers: { Accept: 'application/json' },
  });

  return { app, context, syncResult, snapshot };
}

describe('Day 59 RC sync (recreate OACP → backfill N traces)', () => {
  if (!SQLITE_OK) {
    it.skip('requires sqlite persistence (better-sqlite3 native module)', () => {});
    return;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it(`fresh OACP RC imports ${RC_TRACE_COUNT} MCPLab traces and snapshot trace_count matches`, async () => {
    stubMcplabExport(RC_TRACE_COUNT);
    const sqlitePath = join(process.cwd(), `.oacp/test-day59-rc-${Date.now()}.db`);

    const { app, context, syncResult, snapshot } = await syncFreshOacp(sqlitePath);

    expect(syncResult).toMatchObject({
      imported_traces: RC_TRACE_COUNT,
      skipped_traces: 0,
      failed_traces: 0,
    });
    expect(snapshot.statusCode).toBe(200);

    const body = snapshot.json();

    expect(body.snapshot.trace_count).toBeGreaterThanOrEqual(RC_TRACE_COUNT);
    expect(body.snapshot.traces.length).toBeGreaterThanOrEqual(RC_TRACE_COUNT);

    const firstTraceId = day55TraceId(0);
    expect(
      body.snapshot.traces.some((row: { traceId: string }) => row.traceId === firstTraceId),
    ).toBe(true);
    expect(context.observabilityPersistence.hasTrace(firstTraceId)).toBe(true);

    await context.observabilityPersistence.close();
    await context.memoryStore.close();
    await app.close();
  });

  it('recreate OACP container (new empty SQLite) re-backfills same trace count from unchanged MCPLab export', async () => {
    stubMcplabExport(RC_TRACE_COUNT);
    const firstDb = join(process.cwd(), `.oacp/test-day59-rc-first-${Date.now()}.db`);
    const secondDb = join(process.cwd(), `.oacp/test-day59-rc-second-${Date.now()}.db`);

    const first = await syncFreshOacp(firstDb);
    expect(first.syncResult?.imported_traces).toBe(RC_TRACE_COUNT);
    const firstBody = first.snapshot.json();
    const firstCount = firstBody.snapshot.trace_count;

    await first.context.observabilityPersistence.close();
    await first.context.memoryStore.close();
    await first.app.close();

    const second = await syncFreshOacp(secondDb);
    expect(second.syncResult?.imported_traces).toBe(RC_TRACE_COUNT);

    const secondBody = second.snapshot.json();
    expect(secondBody.snapshot.trace_count).toBe(firstCount);
    expect(secondBody.snapshot.traces.length).toBeGreaterThanOrEqual(RC_TRACE_COUNT);

    const secondSync = await runMcplabStartupSync(second.context, {
      importFromMcplabOnStartup: true,
      mcplabExportUrl: exportUrl,
    });
    expect(secondSync).toMatchObject({
      imported_traces: 0,
      skipped_traces: RC_TRACE_COUNT,
      failed_traces: 0,
    });

    await second.context.observabilityPersistence.close();
    await second.context.memoryStore.close();
    await second.app.close();
  });
});
