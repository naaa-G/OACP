import { describe, expect, it } from 'vitest';

import { isObservabilityEventType, parseObservabilityEventPayload } from './events.js';

describe('observability events (Day 46)', () => {
  it('recognizes canonical SSE event types', () => {
    expect(isObservabilityEventType('message.appended')).toBe(true);
    expect(isObservabilityEventType('trace.completed')).toBe(true);
    expect(isObservabilityEventType('unknown.event')).toBe(false);
  });

  it('parses message.appended payloads', () => {
    const event = parseObservabilityEventPayload('message.appended', {
      id: '42',
      timestamp: '2026-06-20T12:00:00.000Z',
      data: {
        trace_id: 'trace-1',
        message_id: 'msg-1',
        message_type: 'task_request',
        from: 'agent://coordinator',
        capability: 'echo',
        timestamp: '2026-06-20T12:00:00.000Z',
      },
    });

    expect(event).toMatchObject({
      id: '42',
      type: 'message.appended',
      data: {
        trace_id: 'trace-1',
        message_id: 'msg-1',
      },
    });
  });

  it('rejects malformed payloads', () => {
    expect(parseObservabilityEventPayload('message.appended', { id: '1' })).toBeUndefined();
    expect(parseObservabilityEventPayload('not.real', { id: '1', timestamp: 't', data: {} })).toBe(
      undefined,
    );
  });
});
