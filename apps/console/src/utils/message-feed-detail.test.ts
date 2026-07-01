import type { TraceTimelineEvent } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import {
  formatTimelineEventLatency,
  timelineEventDetailJson,
  timelineEventLatencyMs,
} from './message-feed-detail.js';

const previous: TraceTimelineEvent = {
  index: 0,
  timestamp: '2026-06-21T00:00:00.000Z',
  type: 'task_request',
  from: 'agent://a',
  message_id: 'msg-1',
  summary: 'request',
};

const current: TraceTimelineEvent = {
  index: 1,
  timestamp: '2026-06-21T00:00:00.250Z',
  type: 'task_response',
  from: 'agent://b',
  status: 'success',
  message_id: 'msg-2',
  summary: 'response',
};

describe('message-feed-detail', () => {
  it('computes latency from the previous timeline row', () => {
    expect(timelineEventLatencyMs(current, previous)).toBe(250);
    expect(formatTimelineEventLatency(250)).toBe('250 ms');
  });

  it('serializes expanded row JSON with correlation ids', () => {
    const json = timelineEventDetailJson(current, 'trace-1', previous);
    const parsed = JSON.parse(json) as {
      correlation: { message_id: string; trace_id: string; timeline_index: number };
      latency_ms: number;
    };

    expect(parsed.correlation).toMatchObject({
      message_id: 'msg-2',
      trace_id: 'trace-1',
      timeline_index: 1,
    });
    expect(parsed.latency_ms).toBe(250);
  });
});
