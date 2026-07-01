import type { AgentIdentity } from '../protocol/agent-types.js';

/** Canonical fleet id for MCPLab-registered agents (Day 11). */
export const MCPLAB_FLEET = 'mcplab' as const;

/**
 * Supported MCPLab role tokens for Console fleet catalog and observability.
 * Longest-token matching is used when inferring roles from agent ids/names.
 */
export const MCPLAB_ROLES = [
  'coordinator',
  'planner',
  'researcher',
  'synthesizer',
  'publisher',
  'deliverer',
  'reviewer',
  'triager',
  'scanner',
  'coder',
  'ops',
  'client',
  'architect',
  'designer',
  'analyst',
  'qa',
] as const;

export type McplabRole = (typeof MCPLAB_ROLES)[number];

export interface AgentObservabilityTaxonomy {
  readonly fleet?: string;
  readonly role?: string;
}

function readMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  const value = metadata[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Strip `agent://` prefix for slug matching. */
export function agentUriSlug(agentId: string): string {
  return agentId.startsWith('agent://') ? agentId.slice('agent://'.length) : agentId;
}

/** True when the canonical URI belongs to the MCPLab fleet namespace. */
export function isMcplabAgentUri(agentId: string): boolean {
  const slug = agentUriSlug(agentId).toLowerCase();
  return slug === 'mcplab' || slug.startsWith('mcplab-') || slug.startsWith('mcplab.');
}

const ROLE_MATCH_ORDER: readonly string[] = [...MCPLAB_ROLES].sort(
  (left, right) => right.length - left.length,
);

/**
 * Infer a MCPLab role from agent URI slug and display name.
 * Used as a server-side fallback until all registrations send explicit metadata.
 */
export function inferMcplabRole(agentId: string, name: string): string | undefined {
  const haystacks = [agentUriSlug(agentId), name].map((value) => value.toLowerCase());

  for (const role of ROLE_MATCH_ORDER) {
    for (const haystack of haystacks) {
      if (haystack.includes(role)) {
        return role;
      }
    }
  }

  for (const haystack of haystacks) {
    if (haystack.includes('backend') || haystack.includes('developer')) {
      return 'coder';
    }
    if (haystack.includes('product') && haystack.includes('manager')) {
      return 'coordinator';
    }
    if (haystack.includes('quality') || haystack.includes('tester')) {
      return 'reviewer';
    }
    if (haystack.includes('integration') || haystack.includes('integrative')) {
      return 'client';
    }
  }

  return undefined;
}

/** Build registration metadata for MCPLab agents (preferred over server inference). */
export function buildMcplabAgentMetadata(role: string): Readonly<Record<string, string>> {
  return {
    fleet: MCPLAB_FLEET,
    role: role.trim(),
  };
}

/**
 * Resolve fleet + role for observability snapshots.
 * Explicit `metadata.fleet` / `metadata.role` win; MCPLab URIs get inferred fallbacks.
 */
export function resolveAgentObservabilityTaxonomy(
  agent: Pick<AgentIdentity, 'id' | 'name' | 'metadata'>,
): AgentObservabilityTaxonomy {
  const fleet =
    readMetadataString(agent.metadata, 'fleet') ??
    (isMcplabAgentUri(agent.id) ? MCPLAB_FLEET : undefined);

  const role =
    readMetadataString(agent.metadata, 'role') ??
    (isMcplabAgentUri(agent.id) ? inferMcplabRole(agent.id, agent.name) : undefined);

  return {
    ...(fleet !== undefined ? { fleet } : {}),
    ...(role !== undefined ? { role } : {}),
  };
}
