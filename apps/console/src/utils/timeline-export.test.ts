import { describe, expect, it } from 'vitest';

import {
  buildTimelineExportFilename,
  serializeTimelineAsCsv,
  serializeTimelineAsJsonl,
} from './timeline-export.js';
import type { TraceTimelineEvent } from '@oacp/observability-client';

const events: TraceTimelineEvent[] = [
  {
    index: 0,
    timestamp: '2026-06-19T12:00:00.000Z',
    type: 'task_request',
    from: 'agent://planner',
    to: 'agent://coder',
    capability: 'implement',
    status: 'success',
    message_id: 'msg-0',
    summary: 'Plan, build',
  },
  {
    index: 1,
    timestamp: '2026-06-19T12:00:01.000Z',
    type: 'task_response',
    from: 'agent://coder',
    status: 'error',
    message_id: 'msg-1',
    summary: 'Needs "retry"\nwith context',
  },
];

describe('timeline export', () => {
  it('serializes JSONL one event per line', () => {
    expect(serializeTimelineAsJsonl(events)).toBe(
      `${JSON.stringify(events[0])}\n${JSON.stringify(events[1])}`,
    );
  });

  it('serializes CSV with escaped values', () => {
    expect(serializeTimelineAsCsv(events)).toBe(
      [
        'index,timestamp,type,from,to,capability,status,message_id,summary',
        '0,2026-06-19T12:00:00.000Z,task_request,agent://planner,agent://coder,implement,success,msg-0,"Plan, build"',
        '1,2026-06-19T12:00:01.000Z,task_response,agent://coder,,,error,msg-1,"Needs ""retry""\nwith context"',
      ].join('\n'),
    );
  });

  it('sanitizes trace ids in filenames', () => {
    expect(buildTimelineExportFilename('trace://demo id', 'jsonl')).toBe(
      'oacp-timeline-trace-demo-id.jsonl',
    );
    expect(buildTimelineExportFilename(undefined, 'csv')).toBe(
      'oacp-timeline-unselected-trace.csv',
    );
  });
});
