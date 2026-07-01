import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootstrapApp } from '../src/app.js';
import {
  buildConsoleEntryUrl,
  registerConsoleStatic,
  resolveConsoleDistPath,
} from '../src/observability/console-static.js';
import { createTestApp } from './helpers.js';

function createFixtureConsoleDist(): string {
  const dist = mkdtempSync(join(tmpdir(), 'oacp-console-'));
  writeFileSync(
    join(dist, 'index.html'),
    '<!DOCTYPE html><html><head><title>OACP Console</title></head><body>Console SPA</body></html>',
  );
  mkdirSync(join(dist, 'assets'), { recursive: true });
  writeFileSync(join(dist, 'assets', 'app.js'), '"use strict";');
  return dist;
}

describe('console static helpers (Day 7)', () => {
  it('buildConsoleEntryUrl preserves query string', () => {
    expect(buildConsoleEntryUrl('/playground')).toBe('/console/');
    expect(buildConsoleEntryUrl('/playground?trace_id=abc&mode=ops')).toBe(
      '/console/?trace_id=abc&mode=ops',
    );
  });

  it('resolveConsoleDistPath returns undefined when index.html is missing', () => {
    const dist = mkdtempSync(join(tmpdir(), 'oacp-console-missing-'));
    expect(resolveConsoleDistPath(dist)).toBeUndefined();
  });
});

describe('Console static HTTP (Day 7)', () => {
  const fixtureDist = createFixtureConsoleDist();
  const { app, context } = createTestApp();

  beforeAll(async () => {
    await registerConsoleStatic(app, { distPath: fixtureDist });
  });

  afterAll(async () => {
    await context.memoryStore.close();
    await app.close();
  });

  it('redirects GET /playground to /console/ with query passthrough', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/playground?trace_id=trace-abc&mode=showcase',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/?trace_id=trace-abc&mode=showcase');
  });

  it('redirects browser GET / to /console/', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/',
      headers: { Accept: 'text/html' },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/');
  });

  it('serves Console index.html at GET /console/', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/console/',
      headers: { Accept: 'text/html' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('OACP Console');
    expect(response.body).toContain('Console SPA');
  });

  it('serves built assets under /console/assets/', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/console/assets/app.js',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('use strict');
  });

  it('redirects GET /console to /console/', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/console?trace_id=t1',
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe('/console/?trace_id=t1');
  });

  it('SPA fallback returns index.html for unknown /console/* paths', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/console/deep/client/route?trace_id=t1',
      headers: { Accept: 'text/html' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain('Console SPA');
  });
});

describe('bootstrapApp Console integration (Day 7)', () => {
  const fixtureDist = createFixtureConsoleDist();

  it('mounts Console static when dist path is configured', async () => {
    const { app, context } = await bootstrapApp({
      logger: false,
      config: {
        memoryBackend: 'memory',
        enableConsoleStatic: true,
        consoleDistPath: fixtureDist,
      },
    });

    try {
      const response = await app.inject({ method: 'GET', url: '/console/' });
      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('OACP Console');
    } finally {
      await context.memoryStore.close();
      await app.close();
    }
  });
});
