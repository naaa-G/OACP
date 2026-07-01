import type { TraceTimelineEvent } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import {
  appendToMessageFeedPauseBuffer,
  flushMessageFeedPauseBuffer,
} from './message-feed-pause-buffer.js';

function event(messageId: string): TraceTimelineEvent {
  return {
    index: 0,
    timestamp: '2026-06-21T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://a',
    message_id: messageId,
    summary: messageId,
  };
}

describe('message-feed-pause-buffer', () => {
  it('buffers only unseen message ids', () => {
    const rows = [event('msg-1')];
    const buffered = appendToMessageFeedPauseBuffer([], rows, [
      event('msg-1'),
      event('msg-2'),
      event('msg-3'),
    ]);

    expect(buffered.map((row) => row.message_id)).toEqual(['msg-2', 'msg-3']);
  });

  it('flushes buffered rows on resume', () => {
    const rows = [event('msg-1')];
    const buffer = [event('msg-2'), event('msg-3')];
    const flushed = flushMessageFeedPauseBuffer(rows, buffer, 40);

    expect(flushed.rows).toHaveLength(3);
    expect(flushed.appendedMessageIds).toEqual(['msg-2', 'msg-3']);
  });
});
