import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  buildTraceBundle,
  buildTraceTimeline,
  createConsoleLogger,
  formatTraceTimeline,
  TraceClient,
  TraceClientError,
  TraceStore,
  getSchemasRoot,
} from '../src/index.js';
import type {
  OacpMessage,
  TaskRequestMessage,
  TaskResponseMessage,
} from '../src/protocol/message-schemas.js';

function loadExample(name: string): OacpMessage {
  return JSON.parse(readFileSync(join(getSchemasRoot(), 'examples', name), 'utf8')) as OacpMessage;
}

describe('observability (Day 20)', () => {
  it('builds a trace timeline from protocol messages', () => {
    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const response = loadExample('task_response.success.example.json') as TaskResponseMessage;

    const timeline = buildTraceTimeline([request, response]);
    expect(timeline).toHaveLength(2);
    expect(timeline[0]?.summary).toContain('task_request');
    expect(timeline[1]?.status).toBe('success');
  });

  it('formats timeline output for CLI display', () => {
    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const formatted = formatTraceTimeline(buildTraceTimeline([request]));
    expect(formatted).toContain('Timeline');
    expect(formatted).toContain('task_request');
  });

  it('builds a unified trace bundle', () => {
    const request = loadExample('task_request.example.json') as TaskRequestMessage;
    const response = loadExample('task_response.success.example.json') as TaskResponseMessage;

    const bundle = buildTraceBundle({
      traceId: request.trace_id,
      messages: [response, request],
    });

    expect(bundle?.trace_id).toBe(request.trace_id);
    expect(bundle?.message_count).toBe(2);
    expect(bundle?.timeline).toHaveLength(2);
    expect(bundle?.started_at).toBeDefined();
    expect(bundle?.last_activity_at).toBeDefined();
    if (bundle) {
      expect(bundle.started_at <= bundle.last_activity_at).toBe(true);
    }
  });

  it('lists traces sorted by recent activity', () => {
    const store = new TraceStore();
    const older = loadExample('task_request.example.json') as TaskRequestMessage;
    const newer = {
      ...older,
      trace_id: '11111111-1111-4111-8111-111111111111',
      message_id: '550e8400-e29b-41d4-4716-446655440099',
      timestamp: '2026-06-13T12:00:00.000Z',
    } as TaskRequestMessage;

    store.record({ ...older, timestamp: '2026-06-13T11:00:00.000Z' });
    store.record(newer);

    const listed = store.listTraces();
    expect(listed).toHaveLength(2);
    expect(listed[0]?.traceId).toBe(newer.trace_id);
  });

  it('emits structured console logs with correlation fields', () => {
    const lines: string[] = [];
    const logger = createConsoleLogger({
      level: 'info',
      json: true,
      write: (line) => lines.push(line),
    });

    logger.info('task received', {
      trace_id: '0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b',
      message_id: '550e8400-e29b-41d4-4716-446655440001',
    });

    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0] ?? '{}') as { level: string; context: { trace_id: string } };
    expect(parsed.level).toBe('info');
    expect(parsed.context.trace_id).toBe('0c8f1e2a-7b3d-4f9e-9b1a-2d4e6f8a0c1b');
  });

  it('TraceClient surfaces connection errors with actionable guidance', async () => {
    const client = new TraceClient({
      baseUrl: 'http://127.0.0.1:59999',
      fetch: () => Promise.reject(new TypeError('fetch failed')),
    });

    await expect(client.listTraces()).rejects.toThrow(TraceClientError);
    await expect(client.listTraces()).rejects.toThrow(/Cannot reach OACP server/);
  });
});
