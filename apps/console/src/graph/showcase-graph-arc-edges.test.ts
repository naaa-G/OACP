import { describe, expect, it } from 'vitest';

import {
  showcaseArcMidpointLift,
  sampleShowcaseGreatCircleArc,
} from './showcase-graph-arc-edges.js';

describe('sampleShowcaseGreatCircleArc', () => {
  it('lifts arc midpoints above the straight chord', () => {
    const source: [number, number, number] = [4, 0, 0];
    const target: [number, number, number] = [0, 4, 0];
    const pathPoints = sampleShowcaseGreatCircleArc(source, target);

    expect(pathPoints.length).toBeGreaterThan(10);
    expect(showcaseArcMidpointLift(pathPoints, source, target)).toBeGreaterThan(0.35);
  });
});
