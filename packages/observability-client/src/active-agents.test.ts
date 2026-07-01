import { describe, expect, it } from 'vitest';

import { activeAgentsFromTrace, shortAgentId } from './active-agents.js';
import type { TraceBundle } from './types.js';

describe('shortAgentId', () => {
  it('removes agent:// prefix', () => {
    expect(shortAgentId('agent://mcplab-planner')).toBe('mcplab-planner');
  });

  it('returns id unchanged when prefix absent', () => {
    expect(shortAgentId('mcplab-planner')).toBe('mcplab-planner');
  });
});

describe('activeAgentsFromTrace', () => {
  const trace: TraceBundle = {
    trace_id: 'trace-1',
    started_at: '2026-01-01T00:00:00.000Z',
    last_activity_at: '2026-01-01T00:01:00.000Z',
    message_count: 3,
    message_types: ['task_request'],
    agents: ['agent://coordinator', 'agent://planner'],
    timeline: [
      {
        index: 0,
        timestamp: '2026-01-01T00:00:10.000Z',
        type: 'task_request',
        from: 'agent://coordinator',
        to: 'agent://coder',
        message_id: 'msg-1',
        summary: 'delegate',
      },
      {
        index: 1,
        timestamp: '2026-01-01T00:00:20.000Z',
        type: 'task_response',
        from: 'agent://reviewer',
        message_id: 'msg-2',
        summary: 'done',
      },
    ],
  };

  it('returns empty set when trace is undefined', () => {
    expect(activeAgentsFromTrace(undefined).size).toBe(0);
  });

  it('collects roster and timeline participants', () => {
    const active = activeAgentsFromTrace(trace);
    expect([...active].sort()).toEqual([
      'agent://coder',
      'agent://coordinator',
      'agent://planner',
      'agent://reviewer',
    ]);
  });
});
