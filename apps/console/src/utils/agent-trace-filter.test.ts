import { describe, expect, it } from 'vitest';

import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { formatAgentScopeLabel, resolveAgentTraceScope } from './agent-trace-filter.js';

function agent(id: string): AgentObservabilityRecord {
  return {
    id,
    name: id,
    version: '1.0',
    capabilities: ['echo'],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'k' },
  };
}

describe('resolveAgentTraceScope', () => {
  const agents = [
    agent('agent://in-trace-a'),
    agent('agent://in-trace-b'),
    agent('agent://idle-c'),
    agent('agent://idle-d'),
  ];
  const activeAgentIds = new Set(['agent://in-trace-a', 'agent://in-trace-b']);

  it('defaults to trace participants when a trace is selected', () => {
    const result = resolveAgentTraceScope({
      agents,
      activeAgentIds,
      traceSelected: true,
      showAllRegistered: false,
    });

    expect(result.isTraceScoped).toBe(true);
    expect(result.scopedAgents.map((row) => row.id)).toEqual([
      'agent://in-trace-a',
      'agent://in-trace-b',
    ]);
    expect(result.traceAgentCount).toBe(2);
    expect(result.registeredCount).toBe(4);
  });

  it('shows full registry when show all is enabled', () => {
    const result = resolveAgentTraceScope({
      agents,
      activeAgentIds,
      traceSelected: true,
      showAllRegistered: true,
    });

    expect(result.isTraceScoped).toBe(false);
    expect(result.scopedAgents).toHaveLength(4);
  });

  it('shows full registry when no trace is selected', () => {
    const result = resolveAgentTraceScope({
      agents,
      activeAgentIds,
      traceSelected: false,
      showAllRegistered: false,
    });

    expect(result.isTraceScoped).toBe(false);
    expect(result.scopedAgents).toHaveLength(4);
  });
});

describe('formatAgentScopeLabel', () => {
  it('formats filtered counts', () => {
    expect(formatAgentScopeLabel(2, 27)).toBe('2 of 27 agents');
  });

  it('formats full registry without of', () => {
    expect(formatAgentScopeLabel(27, 27)).toBe('27 agents');
  });
});
