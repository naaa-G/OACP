import type { Page } from '@playwright/test';

import { buildE2eSnapshot, E2E_TRACE_ID } from '../fixtures/snapshot.js';
import { buildE2eTraceGraph } from '../fixtures/trace-graph.js';

/** Mock snapshot + trace graph APIs for Console e2e (default trace: E2E_TRACE_ID). */
export async function mockObservabilityApi(
  page: Page,
  options: { readonly traceId?: string } = {},
): Promise<void> {
  const defaultTraceId = options.traceId ?? E2E_TRACE_ID;

  await page.route('**/v1/observability/snapshot**', async (route) => {
    const url = new URL(route.request().url());
    const traceId = url.searchParams.get('trace_id') ?? defaultTraceId;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        snapshot: buildE2eSnapshot(traceId),
      }),
    });
  });

  await page.route('**/v1/observability/traces/*/graph', async (route) => {
    const url = new URL(route.request().url());
    const traceId = url.pathname.split('/').at(-2) ?? defaultTraceId;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        graph: buildE2eTraceGraph(traceId),
      }),
    });
  });
}
