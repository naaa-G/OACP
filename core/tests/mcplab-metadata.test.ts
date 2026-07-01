import { describe, expect, it } from 'vitest';

import {
  MCPLAB_FLEET,
  buildMcplabAgentMetadata,
  inferMcplabRole,
  isMcplabAgentUri,
  resolveAgentObservabilityTaxonomy,
} from '../src/observability/mcplab-metadata.js';

describe('isMcplabAgentUri', () => {
  it('recognizes MCPLab agent namespace', () => {
    expect(isMcplabAgentUri('agent://mcplab-planner-crew-demo')).toBe(true);
    expect(isMcplabAgentUri('agent://mcplab-integration-client')).toBe(true);
    expect(isMcplabAgentUri('agent://worker')).toBe(false);
  });
});

describe('inferMcplabRole', () => {
  it('extracts crew-demo roles from slug', () => {
    expect(inferMcplabRole('agent://mcplab-planner-crew-demo', 'Planner (crew demo)')).toBe(
      'planner',
    );
    expect(inferMcplabRole('agent://mcplab-publisher-crew-demo', 'Publisher')).toBe('publisher');
  });

  it('maps integration client to client role', () => {
    expect(inferMcplabRole('agent://mcplab-integration-client', 'MCPLab Demo Client')).toBe(
      'client',
    );
  });

  it('maps backend developer heuristics to coder', () => {
    expect(inferMcplabRole('agent://mcplab-backend-developer', 'Backend Developer')).toBe('coder');
  });
});

describe('resolveAgentObservabilityTaxonomy', () => {
  it('prefers explicit metadata over inference', () => {
    const taxonomy = resolveAgentObservabilityTaxonomy({
      id: 'agent://mcplab-planner',
      name: 'Planner',
      metadata: { fleet: 'mcplab', role: 'planner' },
    });

    expect(taxonomy).toEqual({ fleet: 'mcplab', role: 'planner' });
  });

  it('infers fleet and role for MCPLab URIs without metadata', () => {
    const taxonomy = resolveAgentObservabilityTaxonomy({
      id: 'agent://mcplab-researcher-crew-demo',
      name: 'Researcher (crew demo)',
    });

    expect(taxonomy).toEqual({ fleet: MCPLAB_FLEET, role: 'researcher' });
  });

  it('returns empty taxonomy for non-MCPLab agents without metadata', () => {
    expect(
      resolveAgentObservabilityTaxonomy({
        id: 'agent://coordinator',
        name: 'Coordinator',
      }),
    ).toEqual({});
  });
});

describe('buildMcplabAgentMetadata', () => {
  it('returns fleet and role pair for registration', () => {
    expect(buildMcplabAgentMetadata('planner')).toEqual({
      fleet: 'mcplab',
      role: 'planner',
    });
  });
});
