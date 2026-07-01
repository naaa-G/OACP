import { describe, expect, it } from 'vitest';

import { buildRingGraphLayout, layoutRingNodes, ringGraphAgentIds } from './legacy-ring-layout.js';

describe('layoutRingNodes', () => {
  it('places agents evenly on a ring', () => {
    const positions = layoutRingNodes(
      ['agent://a', 'agent://b', 'agent://c', 'agent://d'],
      400,
      280,
    );

    expect(positions.size).toBe(4);
    const centerX = 200;
    const centerY = 140;
    const densityFactor = Math.min(1, Math.max(0.5, 4 / 14));
    const radius = Math.min(400, 280) * 0.34 * densityFactor;

    const top = positions.get('agent://a');
    expect(top?.x).toBeCloseTo(centerX, 0);
    expect(top?.y).toBeCloseTo(centerY - radius, 0);
  });

  it('returns empty map for no agents', () => {
    expect(layoutRingNodes([], 400, 280).size).toBe(0);
  });

  it('uses a tighter ring for fewer agents', () => {
    const compact = layoutRingNodes(['agent://a', 'agent://b'], 400, 400);
    const expanded = layoutRingNodes(
      Array.from({ length: 22 }, (_, index) => `agent://${index}`),
      400,
      400,
    );

    const compactTop = compact.get('agent://a');
    const expandedTop = expanded.get('agent://0');
    const compactRadius = 200 - (compactTop?.y ?? 0);
    const expandedRadius = 200 - (expandedTop?.y ?? 0);
    expect(compactRadius).toBeLessThan(expandedRadius);
  });
});

describe('ringGraphAgentIds', () => {
  it('prefers full registry over active-only roster', () => {
    const ids = ringGraphAgentIds(['agent://registered'], new Set(['agent://active-only']));
    expect(ids).toEqual(['agent://registered']);
  });

  it('falls back to active agents when registry is empty', () => {
    const ids = ringGraphAgentIds([], new Set(['agent://active-only']));
    expect(ids).toEqual(['agent://active-only']);
  });
});

describe('buildRingGraphLayout', () => {
  it('enforces minimum canvas dimensions', () => {
    const layout = buildRingGraphLayout(['agent://solo'], 100, 80);
    expect(layout.width).toBe(400);
    expect(layout.height).toBe(280);
    expect(layout.positions.get('agent://solo')).toBeDefined();
  });
});
