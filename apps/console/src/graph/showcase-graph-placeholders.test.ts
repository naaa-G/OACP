import { describe, expect, it } from 'vitest';

import {
  buildShowcasePlaceholderNodes,
  DEFAULT_SHOWCASE_PLACEHOLDER_NODES,
} from './showcase-graph-placeholders.js';

describe('buildShowcasePlaceholderNodes', () => {
  it('returns default placeholders when agent list is empty', () => {
    expect(buildShowcasePlaceholderNodes([])).toEqual(DEFAULT_SHOWCASE_PLACEHOLDER_NODES);
  });

  it('places agents on an orbital ring with active radius boost', () => {
    const nodes = buildShowcasePlaceholderNodes(
      [
        {
          id: 'agent://coordinator',
          name: 'Coordinator',
          version: '1.0',
          capabilities: ['orchestrate'],
          publicKey: 'k',
          fleet: 'mcplab',
        },
        {
          id: 'agent://worker',
          name: 'Worker',
          version: '1.0',
          capabilities: ['echo'],
          publicKey: 'k',
          fleet: 'mcplab',
        },
      ],
      new Set(['agent://coordinator']),
    );

    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.isActive).toBe(true);
    expect(nodes[0]?.radius).toBeGreaterThan(nodes[1]?.radius ?? 0);
    expect(Math.hypot(nodes[0]?.position[0] ?? 0, nodes[0]?.position[1] ?? 0)).toBeCloseTo(3.2, 1);
  });
});
