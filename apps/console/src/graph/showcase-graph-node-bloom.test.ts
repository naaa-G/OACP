import { describe, expect, it } from 'vitest';

import {
  resolveShowcaseNodeBloomColor,
  shouldShowcaseNodeBloom,
} from './showcase-graph-node-bloom.js';

describe('showcase-graph-node-bloom', () => {
  it('lifts active node colors above bloom threshold', () => {
    const active = resolveShowcaseNodeBloomColor({
      baseColor: '#5eead4',
      isActive: true,
      isSelected: false,
      isHovered: false,
      bloomEnabled: true,
    });

    expect(Math.max(active.r, active.g, active.b)).toBeGreaterThan(1);
  });

  it('keeps idle node colors in standard range when bloom is enabled', () => {
    const idle = resolveShowcaseNodeBloomColor({
      baseColor: '#5eead4',
      isActive: false,
      isSelected: false,
      isHovered: false,
      bloomEnabled: true,
    });

    expect(idle.r).toBeLessThanOrEqual(1);
  });

  it('does not bloom idle nodes', () => {
    expect(
      shouldShowcaseNodeBloom({
        isActive: false,
        isSelected: false,
        isHovered: false,
        bloomEnabled: true,
      }),
    ).toBe(false);
  });
});
