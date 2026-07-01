import { describe, expect, it } from 'vitest';

import {
  isOpsGraphNodeActive,
  opsGraphNodeDiameterPx,
  opsGraphNodeStateClassNames,
  OPS_ACTIVE_NODE_DIAMETER_PX,
  OPS_IDLE_NODE_DIAMETER_PX,
  resolveOpsGraphNodeVisualState,
} from './ops-graph-node-style.js';

describe('ops-graph-node-style', () => {
  it('uses larger diameter for active trace agents', () => {
    expect(opsGraphNodeDiameterPx(false)).toBe(OPS_IDLE_NODE_DIAMETER_PX);
    expect(opsGraphNodeDiameterPx(true)).toBe(OPS_ACTIVE_NODE_DIAMETER_PX);
    expect(opsGraphNodeDiameterPx(true)).toBeGreaterThan(opsGraphNodeDiameterPx(false));
  });

  it('detects active agents from roster or server status', () => {
    const activeIds = new Set(['agent://worker']);
    expect(isOpsGraphNodeActive('agent://worker', activeIds, 'idle')).toBe(false);
    expect(isOpsGraphNodeActive('agent://planner', activeIds, 'active')).toBe(true);
    expect(isOpsGraphNodeActive('agent://planner', activeIds, 'idle')).toBe(false);
  });

  it('maps visual state and css classes', () => {
    expect(resolveOpsGraphNodeVisualState({ isActive: true, isSelected: false })).toBe('active');
    expect(resolveOpsGraphNodeVisualState({ isActive: true, isSelected: true })).toBe('selected');

    const styles = {
      idle: 'idle',
      active: 'active',
      selected: 'selected',
      pulse: 'pulse',
    };
    expect(opsGraphNodeStateClassNames('active', styles)).toEqual(['active', 'pulse']);
    expect(opsGraphNodeStateClassNames('selected', styles)).toEqual(['selected']);
  });
});
