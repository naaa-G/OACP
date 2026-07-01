import { describe, expect, it } from 'vitest';

import {
  canPinAnotherAgent,
  MAX_PINNED_AGENTS,
  normalizePinnedAgentIds,
  splitPinnedAgents,
} from './pinned-agents.js';

function agent(id: string) {
  return {
    id,
    name: id,
    version: '1.0',
    capabilities: [],
    publicKey: { kty: 'OKP', crv: 'Ed25519', x: 'test' },
  };
}

describe('splitPinnedAgents', () => {
  const catalog = [agent('agent://a'), agent('agent://b'), agent('agent://c')];

  it('returns pinned agents in stored order at the top split', () => {
    const split = splitPinnedAgents(catalog, ['agent://c', 'agent://a']);
    expect(split.pinnedAgents.map((row) => row.id)).toEqual(['agent://c', 'agent://a']);
    expect(split.unpinnedAgents.map((row) => row.id)).toEqual(['agent://b']);
  });
});

describe('canPinAnotherAgent', () => {
  it('blocks new pins after the max limit', () => {
    const full = Array.from({ length: MAX_PINNED_AGENTS }, (_, index) => `agent://${index}`);
    expect(canPinAnotherAgent(full, 'agent://new')).toBe(false);
    expect(canPinAnotherAgent(full, full[0]!)).toBe(true);
  });
});

describe('normalizePinnedAgentIds', () => {
  it('deduplicates and caps stored ids', () => {
    expect(
      normalizePinnedAgentIds([
        'agent://a',
        'agent://a',
        'agent://b',
        'agent://c',
        'agent://d',
        'agent://e',
        'agent://f',
      ]),
    ).toHaveLength(MAX_PINNED_AGENTS);
  });
});
