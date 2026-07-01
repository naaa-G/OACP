import { afterAll, describe, expect, it } from 'vitest';

import { OBSERVABILITY_SNAPSHOT_PATH } from '../src/observability/playground-service.js';
import { createTestApp } from './helpers.js';
import {
  DAY55_AGENT_COUNT,
  DAY55_TRACE_COUNT,
  buildDay55AgentIdentity,
  importDay55ExportBundle,
  measureSnapshotLatencyMs,
} from './load-fixtures.js';

const SNAPSHOT_P95_BUDGET_MS = 200;

describe('Day 55 snapshot performance smoke', () => {
  const { app, context } = createTestApp();

  afterAll(async () => {
    await context.observabilityPersistence.close();
    await app.close();
  });

  it(`GET ${OBSERVABILITY_SNAPSHOT_PATH} p95 stays under ${SNAPSHOT_P95_BUDGET_MS}ms with ${DAY55_AGENT_COUNT} agents`, async () => {
    for (let index = 0; index < DAY55_AGENT_COUNT; index += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/agents',
        payload: { identity: buildDay55AgentIdentity(index) },
      });
      expect(response.statusCode).toBe(200);
    }

    await importDay55ExportBundle(app, DAY55_TRACE_COUNT);

    const { p95, p50 } = await measureSnapshotLatencyMs(app, {
      path: OBSERVABILITY_SNAPSHOT_PATH,
      samples: 30,
      warmup: 5,
    });

    expect(p50).toBeLessThan(SNAPSHOT_P95_BUDGET_MS);
    expect(p95).toBeLessThan(SNAPSHOT_P95_BUDGET_MS);
  });

  it('post-import dataset keeps snapshot p95 under budget', async () => {
    await importDay55ExportBundle(app, DAY55_TRACE_COUNT);

    const { p95 } = await measureSnapshotLatencyMs(app, {
      path: OBSERVABILITY_SNAPSHOT_PATH,
      samples: 20,
      warmup: 3,
    });

    expect(p95).toBeLessThan(SNAPSHOT_P95_BUDGET_MS);
  });
});
