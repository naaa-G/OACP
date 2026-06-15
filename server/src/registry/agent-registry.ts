import type { AgentIdentity } from '@oacp/core';
import { validateAgentIdentity, assertValid } from '@oacp/core';

import { SERVER_ERROR_CODES, OacpServerError } from '../errors.js';

export interface FindByCapabilityOptions {
  /** Maximum agents to return (default: 10, max: 100). */
  readonly limit?: number;
}

const DEFAULT_FIND_LIMIT = 10;
const MAX_FIND_LIMIT = 100;

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_FIND_LIMIT;
  }
  return Math.min(MAX_FIND_LIMIT, Math.max(1, limit));
}

/** In-memory agent registry with capability index for discovery (Day 8 + Day 10). */
export class AgentRegistry {
  private readonly agents = new Map<string, AgentIdentity>();
  private readonly capabilityIndex = new Map<string, Set<string>>();

  /** Register or replace an agent identity on this node. */
  register(identity: AgentIdentity, options: { replace?: boolean } = {}): AgentIdentity {
    const outcome = validateAgentIdentity(identity);
    assertValid(outcome);

    const existing = this.agents.get(identity.id);
    if (existing && !options.replace) {
      throw new OacpServerError(
        409,
        SERVER_ERROR_CODES.AGENT_ALREADY_REGISTERED,
        `Agent "${identity.id}" is already registered`,
        [{ path: '/id', message: 'Use replace=true to update' }],
      );
    }

    if (existing) {
      this.unindexAgent(existing.id, existing.capabilities);
    }

    this.agents.set(identity.id, identity);
    this.indexAgent(identity.id, identity.capabilities);
    return identity;
  }

  /** Look up a registered agent by canonical URI. */
  get(agentId: string): AgentIdentity | undefined {
    return this.agents.get(agentId);
  }

  /** List all registered agents sorted by id. */
  list(): AgentIdentity[] {
    return [...this.agents.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Find agents that declare a capability, sorted deterministically by agent id.
   * Returns an empty array when no agents match (not an error).
   */
  findByCapability(capability: string, options: FindByCapabilityOptions = {}): AgentIdentity[] {
    const limit = clampLimit(options.limit);
    const agentIds = this.capabilityIndex.get(capability);
    if (!agentIds || agentIds.size === 0) {
      return [];
    }

    return [...agentIds]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, limit)
      .map((agentId) => this.agents.get(agentId))
      .filter((agent): agent is AgentIdentity => agent !== undefined);
  }

  /** List capability identifiers with at least one registered agent. */
  listCapabilities(): string[] {
    return [...this.capabilityIndex.keys()].sort((a, b) => a.localeCompare(b));
  }

  /** Remove an agent from the registry and capability index. */
  unregister(agentId: string): boolean {
    const existing = this.agents.get(agentId);
    if (!existing) {
      return false;
    }

    this.unindexAgent(agentId, existing.capabilities);
    return this.agents.delete(agentId);
  }

  get size(): number {
    return this.agents.size;
  }

  /** Number of distinct capabilities indexed on this node. */
  get capabilityCount(): number {
    return this.capabilityIndex.size;
  }

  private indexAgent(agentId: string, capabilities: readonly string[]): void {
    for (const capability of capabilities) {
      let agents = this.capabilityIndex.get(capability);
      if (!agents) {
        agents = new Set();
        this.capabilityIndex.set(capability, agents);
      }
      agents.add(agentId);
    }
  }

  private unindexAgent(agentId: string, capabilities: readonly string[]): void {
    for (const capability of capabilities) {
      const agents = this.capabilityIndex.get(capability);
      if (!agents) {
        continue;
      }
      agents.delete(agentId);
      if (agents.size === 0) {
        this.capabilityIndex.delete(capability);
      }
    }
  }
}
