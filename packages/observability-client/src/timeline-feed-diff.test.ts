import { describe, expect, it } from 'vitest';

import type { TraceTimelineEvent } from './types.js';
import {
  mergeTimelineEventsAppendOnly,
  timelineEventFromMessageAppended,
} from './timeline-feed-diff.js';

function event(messageId: string, index: number): TraceTimelineEvent {
  return {
    index,
    timestamp: '2026-06-21T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://a',
    to: 'agent://b',
    message_id: messageId,
    summary: `message ${messageId}`,
  };
}

describe('mergeTimelineEventsAppendOnly', () => {
  it('appends only unseen message_id rows', () => {
    const existing = [event('msg-1', 0), event('msg-2', 1)];
    const incoming = [event('msg-2', 1), event('msg-3', 2)];

    const result = mergeTimelineEventsAppendOnly(existing, incoming);

    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]).toBe(existing[0]);
    expect(result.rows[1]).toBe(existing[1]);
    expect(result.appendedMessageIds).toEqual(['msg-3']);
  });

  it('preserves row references when poll reconciles the same timeline', () => {
    const existing = [event('msg-1', 0)];
    const incoming = [event('msg-1', 0)];

    const result = mergeTimelineEventsAppendOnly(existing, incoming);

    expect(result.rows).toBe(existing);
    expect(result.appendedMessageIds).toEqual([]);
  });

  it('appends 100 messages incrementally with stable DOM row count growth', () => {
    let rows: readonly TraceTimelineEvent[] = [];

    for (let index = 0; index < 100; index += 1) {
      const messageId = `msg-${index}`;
      const merge = mergeTimelineEventsAppendOnly(rows, [event(messageId, index)], 40);
      rows = merge.rows;
      expect(merge.appendedMessageIds).toEqual([messageId]);
    }

    expect(rows).toHaveLength(40);
    expect(rows[0]?.message_id).toBe('msg-60');
    expect(rows.at(-1)?.message_id).toBe('msg-99');
  });
});

describe('timelineEventFromMessageAppended', () => {
  it('maps SSE payload to a timeline row', () => {
    const row = timelineEventFromMessageAppended(
      {
        trace_id: 'trace-1',
        message_id: 'msg-1',
        message_type: 'task_response',
        from: 'agent://worker',
        to: 'agent://coordinator',
        status: 'success',
        timestamp: '2026-06-21T01:00:00.000Z',
      },
      3,
    );

    expect(row).toMatchObject({
      index: 3,
      message_id: 'msg-1',
      summary: 'task_response (success)',
      status: 'success',
    });
  });
});
