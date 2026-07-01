import { describe, expect, it } from 'vitest';

import type { MessageAppendedEventData } from '@oacp/observability-client';

import {
  enqueueMessageFeedAppend,
  resetMessageFeedAppendBus,
  subscribeMessageFeedAppend,
} from './message-feed-append-bus.js';

describe('message-feed-append-bus', () => {
  it('notifies subscribers with message.appended payloads', () => {
    resetMessageFeedAppendBus();
    const received: MessageAppendedEventData[] = [];

    const unsubscribe = subscribeMessageFeedAppend((data) => {
      received.push(data);
    });

    const payload: MessageAppendedEventData = {
      trace_id: 'trace-1',
      message_id: 'msg-1',
      message_type: 'task_request',
      from: 'agent://a',
      to: 'agent://b',
      timestamp: '2026-06-21T00:00:00.000Z',
    };

    enqueueMessageFeedAppend(payload);
    expect(received).toEqual([payload]);

    unsubscribe();
    enqueueMessageFeedAppend(payload);
    expect(received).toHaveLength(1);
  });
});
