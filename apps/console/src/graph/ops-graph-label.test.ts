import { describe, expect, it } from 'vitest';

import {
  buildOpsGraphLabelView,
  formatOpsGraphFleetLabel,
  formatOpsGraphRoleLabel,
  opsGraphAgentTestId,
} from './ops-graph-label.js';

describe('ops-graph-label', () => {
  it('formats role and fleet labels for tooltips', () => {
    expect(formatOpsGraphRoleLabel('coordinator')).toBe('Coordinator');
    expect(formatOpsGraphRoleLabel('custom-role')).toBe('Custom Role');
    expect(formatOpsGraphRoleLabel(undefined)).toBe('Agent');
    expect(formatOpsGraphFleetLabel('mcplab')).toBe('MCPLab');
    expect(formatOpsGraphFleetLabel('unknown')).toBe('External');
  });

  it('builds label view with fallback name from agent id', () => {
    const view = buildOpsGraphLabelView({
      agentId: 'agent://mcplab-worker-3',
      name: '',
      role: 'coder',
      fleet: 'mcplab',
    });

    expect(view.name).toBe('mcplab-worker-3');
    expect(view.role).toBe('Coder');
    expect(view.fleet).toBe('MCPLab');
    expect(view.shortId).toBe('mcplab-worker-3');
  });

  it('sanitizes agent ids for test ids', () => {
    expect(opsGraphAgentTestId('agent://coordinator')).toBe('coordinator');
  });
});
