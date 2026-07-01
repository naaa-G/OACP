import { expect, test } from '@playwright/test';

import { buildE2eSnapshot, buildRunningE2eSnapshot, E2E_TRACE_ID } from './fixtures/snapshot.js';
import { seedFastReconcileInterval } from './helpers/live-feed.js';

test.describe('Console errors and empty states (Day 14)', () => {
  test('shows actionable banner when snapshot API is unreachable', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.abort('failed');
    });
    await page.route('**/playground/snapshot**', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/');

    await expect(page.getByTestId('global-error-banner')).toContainText('OACP server unreachable');
    await expect(page.locator('header').getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByTestId('graph-empty-state')).toContainText('Snapshot unavailable');
    await expect(page.getByTestId('feed-empty-state')).toContainText('Snapshot unavailable');
  });

  test('shows server error banner for HTTP 500', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { message: 'Internal snapshot failure', code: 'INTERNAL' },
        }),
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('global-error-banner')).toContainText('OACP server error');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('shows authentication banner for HTTP 401', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        }),
      });
    });

    await page.goto('/');

    await expect(page.getByTestId('global-error-banner')).toContainText('Authentication required');
  });

  test('graph and feed empty states without trace selection', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: {
            server: {
              status: 'healthy',
              protocol_version: '1.0',
              registered_agents: 0,
              bus_open: true,
            },
            agents: [],
            traces: [],
            trace_count: 0,
            active_trace: undefined,
            agent_links: [],
          },
        }),
      });
    });

    await page.goto('/?mode=legacy');

    await expect(page.getByTestId('graph-empty-state')).toContainText(
      'Select a trace or run an MCPLab demo',
    );
    await expect(page.getByTestId('feed-empty-state')).toContainText('Select a trace');
  });

  test('feed shows waiting when trace has no messages yet', async ({ page }) => {
    await page.route('**/v1/observability/snapshot**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          snapshot: {
            server: {
              status: 'healthy',
              protocol_version: '1.0',
              registered_agents: 1,
              bus_open: true,
            },
            agents: [
              {
                id: 'agent://solo',
                name: 'Solo',
                version: '1.0',
                capabilities: ['echo'],
                publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'k' },
              },
            ],
            traces: [
              {
                traceId: E2E_TRACE_ID,
                startedAt: '2026-06-20T00:00:00.000Z',
                lastActivityAt: '2026-06-20T00:00:00.000Z',
                messageCount: 0,
                messageTypes: [],
                agents: ['agent://solo'],
              },
            ],
            trace_count: 1,
            active_trace: {
              trace_id: E2E_TRACE_ID,
              started_at: '2026-06-20T00:00:00.000Z',
              last_activity_at: '2026-06-20T00:00:00.000Z',
              message_count: 0,
              message_types: [],
              agents: ['agent://solo'],
              timeline: [],
            },
            agent_links: [],
          },
        }),
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.getByTestId('feed-empty-state')).toContainText('Waiting for messages');
  });

  test('clears stale UI when polling fails after a successful snapshot', async ({ page }) => {
    let failRequests = false;

    await seedFastReconcileInterval(page);

    await page.route('**/v1/observability/snapshot**', async (route) => {
      if (!failRequests) {
        const url = new URL(route.request().url());
        const traceId = url.searchParams.get('trace_id') ?? E2E_TRACE_ID;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, snapshot: buildRunningE2eSnapshot(traceId) }),
        });
        return;
      }

      await route.abort('failed');
    });

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();
    await expect(page.getByText('task_request from coordinator')).toBeVisible();

    failRequests = true;

    await expect(page.getByTestId('global-error-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('header').getByText('Offline', { exact: true })).toBeVisible();
    await expect(page.getByTestId('graph-empty-state')).toContainText('Snapshot unavailable');
    await expect(page.getByRole('list', { name: 'Agent list' })).toHaveCount(0);
    await expect(page.getByText('task_request from coordinator')).toHaveCount(0);
  });

  test('shows reconnecting copy instead of loading skeletons while retrying', async ({ page }) => {
    let phase: 'success' | 'abort' | 'hang' = 'success';

    await seedFastReconcileInterval(page);

    await page.route('**/v1/observability/snapshot**', async (route) => {
      if (phase === 'success') {
        const url = new URL(route.request().url());
        const traceId = url.searchParams.get('trace_id') ?? E2E_TRACE_ID;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, snapshot: buildRunningE2eSnapshot(traceId) }),
        });
        return;
      }

      if (phase === 'abort') {
        await route.abort('failed');
        return;
      }

      await new Promise(() => {
        /* keep poll retry in-flight for reconnecting UI */
      });
    });

    await page.route('**/v1/observability/events**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: ': connected\n\n',
      });
    });

    await page.goto(`/?trace_id=${E2E_TRACE_ID}&mode=legacy`);

    await expect(page.locator('button[data-agent-id="agent://coordinator"]')).toBeVisible();

    phase = 'abort';

    await expect(page.getByTestId('global-error-banner')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('header').getByText('Offline', { exact: true })).toBeVisible();

    phase = 'hang';

    await expect(page.locator('header').getByText('Reconnecting', { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('agents-reconnecting')).toBeVisible();
    await expect(page.getByTestId('graph-empty-state')).toContainText(
      'Reconnecting to OACP server',
    );
    await expect(page.getByText('Loading snapshot from OACP server')).toHaveCount(0);
  });
});
