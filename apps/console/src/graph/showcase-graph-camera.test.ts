import { describe, expect, it } from 'vitest';

import {
  computeShowcaseBounds,
  showcaseCameraDistance,
  showcaseCameraPosition,
} from './showcase-graph-camera.js';

describe('showcase-graph-camera', () => {
  it('frames a 5-node star graph within the viewport radius', () => {
    const nodes = [
      { x: 0, y: 0, z: 0, radius: 0.6 },
      { x: 4.2, y: 0.2, z: 0.1, radius: 0.55 },
      { x: -0.3, y: -4.1, z: 0.2, radius: 0.55 },
      { x: 0.4, y: 0.3, z: 4.3, radius: 0.55 },
      { x: -0.2, y: 0.4, z: -4.2, radius: 0.55 },
    ];

    const bounds = computeShowcaseBounds(nodes);
    const distance = showcaseCameraDistance(bounds.radius);
    const [cx, cy, cz] = bounds.center;
    const [x, y, z] = showcaseCameraPosition(bounds);

    expect(bounds.radius).toBeGreaterThan(3.5);
    expect(distance).toBeGreaterThan(bounds.radius);
    expect(Math.hypot(x - cx, y - cy, z - cz)).toBeGreaterThan(bounds.radius * 1.2);
  });
});
