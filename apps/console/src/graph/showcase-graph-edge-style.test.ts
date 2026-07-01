import { describe, expect, it } from 'vitest';

import {
  countShowcaseEdgeStates,
  isShowcaseEdgeActive,
  resolveShowcaseEdgeVisualStyle,
} from './showcase-graph-edge-style.js';

describe('showcase-graph-edge-style', () => {
  it('treats edges with traffic on active agents as active', () => {
    expect(
      isShowcaseEdgeActive({
        fromAgent: 'agent://a',
        toAgent: 'agent://b',
        messageCount: 2,
        activeAgentIds: new Set(['agent://a']),
      }),
    ).toBe(true);
  });

  it('dims idle edges with no active endpoints', () => {
    const style = resolveShowcaseEdgeVisualStyle({
      kind: 'subtask',
      messageCount: 1,
      maxMessageCount: 4,
      fromAgent: 'agent://a',
      toAgent: 'agent://b',
      activeAgentIds: new Set(['agent://c']),
      edgeShape: 'line',
    });

    expect(style.state).toBe('idle');
    expect(style.opacity).toBeLessThan(0.25);
  });

  it('boosts opacity while an edge is pulsing', () => {
    const style = resolveShowcaseEdgeVisualStyle({
      kind: 'subtask',
      messageCount: 3,
      maxMessageCount: 4,
      fromAgent: 'agent://a',
      toAgent: 'agent://b',
      activeAgentIds: new Set(['agent://a', 'agent://b']),
      edgeShape: 'arc',
      isPulsing: true,
    });

    expect(style.state).toBe('active');
    expect(style.opacity).toBeGreaterThan(0.85);
  });

  it('counts active and idle edges', () => {
    expect(
      countShowcaseEdgeStates(
        [
          { fromAgent: 'agent://a', toAgent: 'agent://b', messageCount: 2 },
          { fromAgent: 'agent://c', toAgent: 'agent://d', messageCount: 1 },
        ],
        new Set(['agent://a']),
      ),
    ).toEqual({ active: 1, idle: 1 });
  });
});
