import { request as httpRequest } from 'node:http';
import { afterAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers.js';

const MAX_SSE_CONNECTIONS_PER_IP = 10;

async function requestEventsStatus(
  port: number,
  path: string,
): Promise<{ readonly statusCode: number; readonly body: string }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (statusCode === 429) {
          const chunks: Buffer[] = [];
          response.on('data', (chunk) => {
            chunks.push(chunk as Buffer);
          });
          response.on('end', () => {
            resolve({ statusCode, body: Buffer.concat(chunks).toString() });
          });
          return;
        }

        req.destroy();
        resolve({ statusCode, body: '' });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function openSseConnection(port: number, path: string): Promise<() => void> {
  const req = httpRequest(
    {
      hostname: '127.0.0.1',
      port,
      path,
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
    },
    (response) => {
      response.on('data', () => {
        // hold connection open
      });
    },
  );

  await new Promise<void>((resolve, reject) => {
    req.on('response', () => {
      resolve();
    });
    req.on('error', reject);
    req.end();
  });

  return () => {
    req.destroy();
  };
}

describe('Day 55 SSE connection rate limiting', () => {
  const { app } = createTestApp();
  let port = 0;

  afterAll(async () => {
    await app.close();
  });

  async function ensureListening(): Promise<number> {
    if (port > 0) {
      return port;
    }
    await app.ready();
    await new Promise<void>((resolve) => {
      app.server.listen(0, '127.0.0.1', () => {
        const address = app.server.address();
        port = typeof address === 'object' && address !== null ? address.port : 0;
        resolve();
      });
    });
    return port;
  }

  it(`limits to ${MAX_SSE_CONNECTIONS_PER_IP} concurrent SSE connections per IP and frees slots on close`, async () => {
    const listenPort = await ensureListening();
    const path = '/v1/observability/events';
    const active: Array<() => void> = [];

    try {
      for (let index = 0; index < MAX_SSE_CONNECTIONS_PER_IP; index += 1) {
        active.push(await openSseConnection(listenPort, path));
      }

      const limited = await requestEventsStatus(listenPort, path);
      expect(limited.statusCode).toBe(429);
      expect(limited.body).toContain('RATE_LIMITED');

      active[0]?.();
      active.shift();
      await new Promise((resolve) => setTimeout(resolve, 50));

      const reopened = await requestEventsStatus(listenPort, path);
      expect(reopened.statusCode).toBe(200);
    } finally {
      for (const close of active) {
        close();
      }
    }
  });
});
