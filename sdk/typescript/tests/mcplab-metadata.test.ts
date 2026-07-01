import { describe, expect, it, vi } from 'vitest';

import { buildMcplabAgentIdentity, registerMcplabAgent } from '../src/mcplab/metadata.js';

describe('buildMcplabAgentIdentity', () => {
  it('includes mcplab fleet metadata', () => {
    const identity = buildMcplabAgentIdentity({
      id: 'agent://mcplab-planner',
      name: 'Planner',
      capabilities: ['plan'],
      role: 'planner',
    });

    expect(identity.metadata).toEqual({ fleet: 'mcplab', role: 'planner' });
  });
});

describe('registerMcplabAgent', () => {
  it('registers identity with metadata via AgentClient', async () => {
    const registerAgent = vi.fn().mockResolvedValue({
      id: 'agent://mcplab-planner',
      name: 'Planner',
      version: '1.0',
      capabilities: ['plan'],
      publicKey: { kty: 'OKP' },
      metadata: { fleet: 'mcplab', role: 'planner' },
    });

    await registerMcplabAgent({ registerAgent } as never, {
      id: 'agent://mcplab-planner',
      name: 'Planner',
      capabilities: ['plan'],
      role: 'planner',
    });

    expect(registerAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { fleet: 'mcplab', role: 'planner' },
      }),
      expect.objectContaining({ replace: true }),
    );
  });
});
