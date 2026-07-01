import { describe, expect, it } from 'vitest';

import type { Node } from '@xyflow/react';

import { resolveOpsMiniMapNodeColor } from './ops-graph-minimap.js';

describe('ops-graph-minimap', () => {
  it('returns SVG-safe hex colors for minimap nodes', () => {
    const selected: Node = {
      id: 'a',
      data: { isSelected: true, isActive: true },
      position: { x: 0, y: 0 },
    };
    const active: Node = {
      id: 'b',
      data: { isSelected: false, isActive: true },
      position: { x: 0, y: 0 },
    };
    const idle: Node = {
      id: 'c',
      data: { isSelected: false, isActive: false },
      position: { x: 0, y: 0 },
    };

    expect(resolveOpsMiniMapNodeColor(selected)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(resolveOpsMiniMapNodeColor(active)).toMatch(/^#[0-9a-f]{6}$/i);
    expect(resolveOpsMiniMapNodeColor(idle)).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
