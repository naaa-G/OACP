import type { Page } from '@playwright/test';

/** Use 1s reconcile in E2E so mocked snapshot routes fire within test timeouts. */
export async function seedFastReconcileInterval(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('oacp.console.reconcileIntervalMs.v1', '1000');
  });
}
