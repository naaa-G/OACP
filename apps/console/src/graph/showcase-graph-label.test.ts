import { describe, expect, it } from 'vitest';

import {
  computeShowcaseNodeFocusViewport,
  lerpShowcaseTuple,
} from './showcase-graph-camera-focus.js';
import {
  countVisibleShowcaseLabels,
  resolveShowcaseLabelVisibility,
} from './showcase-graph-label.js';

describe('showcase-graph-label', () => {
  it('shows no labels in the default view', () => {
    expect(countVisibleShowcaseLabels(['agent://a', 'agent://b'], undefined, undefined)).toBe(0);
  });

  it('shows at most one pinned and one hover label', () => {
    const pinned = resolveShowcaseLabelVisibility({
      agentId: 'agent://a',
      hoveredAgentId: 'agent://b',
      selectedAgentId: 'agent://a',
    });
    const hover = resolveShowcaseLabelVisibility({
      agentId: 'agent://b',
      hoveredAgentId: 'agent://b',
      selectedAgentId: 'agent://a',
    });

    expect(pinned).toEqual({ hover: false, pinned: true });
    expect(hover).toEqual({ hover: true, pinned: false });
    expect(countVisibleShowcaseLabels(['agent://a', 'agent://b'], 'agent://b', 'agent://a')).toBe(
      2,
    );
  });

  it('does not duplicate labels when hover matches selection', () => {
    expect(countVisibleShowcaseLabels(['agent://a'], 'agent://a', 'agent://a')).toBe(1);
  });
});

describe('computeShowcaseNodeFocusViewport', () => {
  it('frames a node with the camera offset from its surface', () => {
    const viewport = computeShowcaseNodeFocusViewport({
      x: 1,
      y: 2,
      z: 3,
      radius: 0.9,
    });

    expect(viewport.target).toEqual([1, 2, 3]);
    expect(viewport.cameraPosition[2]).toBeGreaterThan(3);
    expect(
      Math.hypot(
        viewport.cameraPosition[0] - viewport.target[0],
        viewport.cameraPosition[1] - viewport.target[1],
        viewport.cameraPosition[2] - viewport.target[2],
      ),
    ).toBeGreaterThan(4.5);
  });

  it('lerps tuples for camera animation', () => {
    expect(lerpShowcaseTuple([0, 0, 0], [10, 20, 30], 0.5)).toEqual([5, 10, 15]);
  });
});
