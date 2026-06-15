import { describe, expect, it } from 'vitest';

import { parseAgentIdentity } from '@oacp/core';
import type { AgentIdentity } from '@oacp/core';

import { AgentRegistry } from '../src/registry/agent-registry.js';
import { SERVER_ERROR_CODES, OacpServerError } from '../src/errors.js';
import { loadSummarizerIdentity } from './helpers.js';

function cloneIdentity(base: AgentIdentity, overrides: Partial<AgentIdentity>): AgentIdentity {
  return parseAgentIdentity({ ...base, ...overrides });
}

describe('AgentRegistry (Day 10)', () => {
  it('findByCapability returns agents sorted by id', () => {
    const registry = new AgentRegistry();
    const summarizer = loadSummarizerIdentity();
    const alt = cloneIdentity(summarizer, {
      id: 'agent://summarizer-b',
      name: 'Summarizer B',
    });

    registry.register(summarizer);
    registry.register(alt);

    const matches = registry.findByCapability('text.summarize');
    expect(matches.map((agent) => agent.id)).toEqual([
      'agent://summarizer',
      'agent://summarizer-b',
    ]);
  });

  it('findByCapability respects limit', () => {
    const registry = new AgentRegistry();
    const summarizer = loadSummarizerIdentity();
    const alt = cloneIdentity(summarizer, {
      id: 'agent://summarizer-b',
      name: 'Summarizer B',
    });

    registry.register(summarizer);
    registry.register(alt);

    const matches = registry.findByCapability('text.summarize', { limit: 1 });
    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe('agent://summarizer');
  });

  it('findByCapability returns empty array when no agents match', () => {
    const registry = new AgentRegistry();
    registry.register(loadSummarizerIdentity());

    expect(registry.findByCapability('code.debug')).toEqual([]);
  });

  it('replace updates capability index', () => {
    const registry = new AgentRegistry();
    const summarizer = loadSummarizerIdentity();
    registry.register(summarizer);

    const updated = cloneIdentity(summarizer, {
      capabilities: ['text.summarize', 'text.translate'],
    });
    registry.register(updated, { replace: true });

    expect(registry.findByCapability('text.translate')).toHaveLength(1);
    expect(registry.listCapabilities()).toEqual(['text.summarize', 'text.translate']);
  });

  it('unregister removes capability index entries', () => {
    const registry = new AgentRegistry();
    const summarizer = loadSummarizerIdentity();
    registry.register(summarizer);

    expect(registry.unregister('agent://summarizer')).toBe(true);
    expect(registry.findByCapability('text.summarize')).toEqual([]);
    expect(registry.listCapabilities()).toEqual([]);
  });

  it('rejects duplicate registration without replace', () => {
    const registry = new AgentRegistry();
    const summarizer = loadSummarizerIdentity();
    registry.register(summarizer);

    let thrown: unknown;
    try {
      registry.register(summarizer);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(OacpServerError);
    if (thrown instanceof OacpServerError) {
      expect(thrown.code).toBe(SERVER_ERROR_CODES.AGENT_ALREADY_REGISTERED);
    }
  });
});
