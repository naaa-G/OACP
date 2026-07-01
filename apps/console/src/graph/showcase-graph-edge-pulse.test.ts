import { describe, expect, it } from 'vitest';

import {
  enqueueShowcaseEdgePulse,
  resetShowcaseEdgePulseBus,
  subscribeShowcaseEdgePulseBus,
} from './showcase-edge-pulse-bus.js';
import {
  createShowcaseEdgePulse,
  detectTimelineShowcaseEdgePulses,
  mergeShowcaseEdgePulses,
  sampleShowcaseEdgePath,
  showcaseEdgePulseProgress,
} from './showcase-graph-edge-pulse.js';

describe('showcase-graph-edge-pulse', () => {
  it('samples positions along multi-point edge paths', () => {
    const path = [
      [0, 0, 0],
      [0, 0, 2],
      [0, 0, 4],
    ] as const;

    expect(sampleShowcaseEdgePath(path, 0)).toEqual([0, 0, 0]);
    expect(sampleShowcaseEdgePath(path, 1)).toEqual([0, 0, 4]);
    expect(sampleShowcaseEdgePath(path, 0.5)).toEqual([0, 0, 2]);
  });

  it('does not emit pulses on initial timeline seed', () => {
    const timeline = [
      {
        index: 0,
        timestamp: '2026-06-20T00:00:00.000Z',
        type: 'task_request',
        from: 'agent://a',
        to: 'agent://b',
        message_id: 'msg-1',
        summary: 'request',
      },
    ];

    const seeded = detectTimelineShowcaseEdgePulses({
      timeline,
      seenMessageIds: new Set(['msg-1']),
      liveEnabled: true,
    });

    expect(seeded.pulses).toHaveLength(0);
    expect(seeded.nextSeenMessageIds.has('msg-1')).toBe(true);
  });

  it('detects poll-based pulses for new timeline messages', () => {
    const timeline = [
      {
        index: 0,
        timestamp: '2026-06-20T00:00:00.000Z',
        type: 'task_request',
        from: 'agent://a',
        to: 'agent://b',
        message_id: 'msg-1',
        summary: 'request',
      },
      {
        index: 1,
        timestamp: '2026-06-20T00:00:01.000Z',
        type: 'task_response',
        from: 'agent://b',
        to: 'agent://a',
        message_id: 'msg-2',
        summary: 'response',
      },
    ];

    const detected = detectTimelineShowcaseEdgePulses({
      timeline,
      seenMessageIds: new Set(['msg-1']),
      liveEnabled: true,
      nowMs: 1_000,
    });

    expect(detected.pulses).toHaveLength(1);
    expect(detected.pulses[0]?.messageId).toBe('msg-2');
    expect(detected.pulses[0]?.fromAgent).toBe('agent://b');
    expect(detected.pulses[0]?.toAgent).toBe('agent://a');
  });

  it('merges and caps concurrent pulses', () => {
    const now = 5_000;
    const existing = [createShowcaseEdgePulse({ fromAgent: 'a', toAgent: 'b' }, now - 200)];
    const incoming = Array.from({ length: 20 }, (_, index) =>
      createShowcaseEdgePulse(
        { fromAgent: `agent://${index}`, toAgent: `agent://${index + 1}` },
        now,
      ),
    );

    const merged = mergeShowcaseEdgePulses(existing, incoming, now + 50);
    expect(merged.length).toBeLessThanOrEqual(12);
  });

  it('tracks pulse progress to completion', () => {
    const pulse = createShowcaseEdgePulse({ fromAgent: 'agent://a', toAgent: 'agent://b' }, 1_000);

    expect(showcaseEdgePulseProgress(pulse, 1_000)).toBe(0);
    expect(showcaseEdgePulseProgress(pulse, 1_550)).toBeCloseTo(0.5, 1);
    expect(showcaseEdgePulseProgress(pulse, 2_100)).toBe(1);
  });
});

describe('showcase-edge-pulse-bus', () => {
  it('routes external pulse requests to subscribers', () => {
    resetShowcaseEdgePulseBus();
    const received: string[] = [];

    const unsubscribe = subscribeShowcaseEdgePulseBus((request) => {
      received.push(`${request.fromAgent}->${request.toAgent}`);
    });

    enqueueShowcaseEdgePulse({
      fromAgent: 'agent://planner',
      toAgent: 'agent://worker',
      messageId: 'sse-msg-1',
    });

    expect(received).toEqual(['agent://planner->agent://worker']);
    unsubscribe();
    resetShowcaseEdgePulseBus();
  });
});
