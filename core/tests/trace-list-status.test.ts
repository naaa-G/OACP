import { describe, expect, it } from 'vitest';

import { inferTraceListStatusFromMessages } from '../src/observability/trace-list-status.js';
import type { OacpMessage } from '../src/protocol/message-schemas.js';

function taskResponse(status: 'success' | 'error', timestamp: string): OacpMessage {
  return {
    type: 'task_response',
    version: '1.0',
    message_id: `msg-${timestamp}`,
    trace_id: 'trace-1',
    from: 'agent://worker',
    timestamp,
    status,
    in_reply_to: 'msg-req',
  };
}

function taskRequest(timestamp: string): OacpMessage {
  return {
    type: 'task_request',
    version: '1.0',
    message_id: `msg-req-${timestamp}`,
    trace_id: 'trace-1',
    from: 'agent://coordinator',
    to: 'agent://worker',
    timestamp,
    capability: 'plan',
    input: {},
  };
}

describe('inferTraceListStatusFromMessages', () => {
  it('marks traces completed when last message is a successful task_response', () => {
    const messages = [
      taskRequest('2026-06-30T10:00:00.000Z'),
      taskResponse('success', '2026-06-30T10:00:05.000Z'),
    ];

    expect(inferTraceListStatusFromMessages(messages)).toEqual({
      status: 'completed',
      completedAt: '2026-06-30T10:00:05.000Z',
    });
  });

  it('marks traces failed when last message is an error task_response', () => {
    const messages = [
      taskRequest('2026-06-30T10:00:00.000Z'),
      taskResponse('error', '2026-06-30T10:00:05.000Z'),
    ];

    expect(inferTraceListStatusFromMessages(messages)).toEqual({
      status: 'failed',
      completedAt: '2026-06-30T10:00:05.000Z',
    });
  });

  it('keeps traces running when still in flight', () => {
    expect(inferTraceListStatusFromMessages([taskRequest('2026-06-30T10:00:00.000Z')])).toEqual({
      status: 'running',
    });
  });
});
