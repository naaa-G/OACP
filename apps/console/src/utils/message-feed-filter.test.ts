import type { TraceTimelineEvent } from '@oacp/observability-client';
import { describe, expect, it } from 'vitest';

import { collectMessageFeedFilterOptions, filterTimelineForFeed } from './message-feed-filter.js';

const events: TraceTimelineEvent[] = [
  {
    index: 0,
    timestamp: '2026-06-21T00:00:00.000Z',
    type: 'task_request',
    from: 'agent://coordinator',
    to: 'agent://worker',
    capability: 'echo',
    message_id: 'msg-1',
    summary: 'task_request from coordinator',
  },
  {
    index: 1,
    timestamp: '2026-06-21T00:00:01.000Z',
    type: 'task_response',
    from: 'agent://worker',
    status: 'success',
    message_id: 'msg-2',
    summary: 'task_response (success)',
  },
];

describe('filterTimelineForFeed', () => {
  it('filters by type and status', () => {
    expect(
      filterTimelineForFeed(events, {
        type: 'task_response',
        agent: '',
        capability: '',
        status: 'success',
        text: '',
      }),
    ).toHaveLength(1);
  });

  it('filters by free text', () => {
    expect(
      filterTimelineForFeed(events, {
        type: '',
        agent: '',
        capability: '',
        status: '',
        text: 'echo',
      }),
    ).toHaveLength(1);
  });
});

describe('collectMessageFeedFilterOptions', () => {
  it('collects distinct filter values', () => {
    const options = collectMessageFeedFilterOptions(events);
    expect(options.types).toEqual(['task_request', 'task_response']);
    expect(options.capabilities).toEqual(['echo']);
    expect(options.statuses).toEqual(['success']);
  });
});
