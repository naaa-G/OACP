import type { AgentObservabilityRecord } from '@oacp/observability-client';

import type { CatalogFleetId } from './fleet-catalog.js';
import { resolveFleetBucket } from './fleet-catalog.js';

/** Canonical role tokens mirrored from `@oacp/core` MCPLAB_ROLES + startup aliases. */
export const KNOWN_ROLE_IDS = [
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
  'pm',
] as const;

export type KnownRoleId = (typeof KNOWN_ROLE_IDS)[number];

export type RoleSource = 'metadata' | 'identity' | 'capability';

export interface ResolvedAgentRole {
  readonly id: string;
  readonly label: string;
  readonly glyph: string;
  readonly tone: number;
  readonly source: RoleSource;
}

interface RoleDefinition {
  readonly id: KnownRoleId;
  readonly label: string;
  readonly glyph: string;
  readonly tone: number;
  readonly capabilityPrefixes: readonly string[];
  readonly identityTokens: readonly string[];
}

const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    id: 'coordinator',
    label: 'Coordinator',
    glyph: '◎',
    tone: 1,
    capabilityPrefixes: ['orchestr', 'coordinat', 'delegat'],
    identityTokens: ['coordinator', 'product-manager', 'product_manager'],
  },
  {
    id: 'planner',
    label: 'Planner',
    glyph: '▣',
    tone: 2,
    capabilityPrefixes: ['plan'],
    identityTokens: ['planner'],
  },
  {
    id: 'researcher',
    label: 'Researcher',
    glyph: '⌕',
    tone: 3,
    capabilityPrefixes: ['research', 'search', 'discover'],
    identityTokens: ['researcher'],
  },
  {
    id: 'synthesizer',
    label: 'Synthesizer',
    glyph: '∑',
    tone: 4,
    capabilityPrefixes: ['synthes', 'summar', 'merge'],
    identityTokens: ['synthesizer'],
  },
  {
    id: 'publisher',
    label: 'Publisher',
    glyph: '▤',
    tone: 5,
    capabilityPrefixes: ['publish', 'format'],
    identityTokens: ['publisher'],
  },
  {
    id: 'deliverer',
    label: 'Deliverer',
    glyph: '⇢',
    tone: 6,
    capabilityPrefixes: ['deliver', 'ship'],
    identityTokens: ['deliverer'],
  },
  {
    id: 'coder',
    label: 'Coder',
    glyph: '{}',
    tone: 7,
    capabilityPrefixes: ['code', 'implement', 'build', 'echo', 'develop'],
    identityTokens: ['coder', 'backend', 'developer', 'frontend'],
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    glyph: '✓',
    tone: 8,
    capabilityPrefixes: ['review', 'audit', 'validate'],
    identityTokens: ['reviewer', 'qa', 'quality', 'tester'],
  },
  {
    id: 'triager',
    label: 'Triager',
    glyph: '⚑',
    tone: 1,
    capabilityPrefixes: ['triage', 'route'],
    identityTokens: ['triager'],
  },
  {
    id: 'scanner',
    label: 'Scanner',
    glyph: '⌖',
    tone: 2,
    capabilityPrefixes: ['scan', 'inspect'],
    identityTokens: ['scanner'],
  },
  {
    id: 'ops',
    label: 'Ops',
    glyph: '⚙',
    tone: 3,
    capabilityPrefixes: ['ops', 'deploy', 'runtime'],
    identityTokens: ['ops'],
  },
  {
    id: 'client',
    label: 'Client',
    glyph: '⬡',
    tone: 4,
    capabilityPrefixes: ['client', 'integrat'],
    identityTokens: ['client', 'integration'],
  },
  {
    id: 'architect',
    label: 'Architect',
    glyph: '△',
    tone: 5,
    capabilityPrefixes: ['architect', 'design-system'],
    identityTokens: ['architect'],
  },
  {
    id: 'designer',
    label: 'Designer',
    glyph: '◆',
    tone: 6,
    capabilityPrefixes: ['design', 'ux'],
    identityTokens: ['designer'],
  },
  {
    id: 'analyst',
    label: 'Analyst',
    glyph: '▥',
    tone: 7,
    capabilityPrefixes: ['analy', 'metric'],
    identityTokens: ['analyst'],
  },
  {
    id: 'qa',
    label: 'QA',
    glyph: '✓',
    tone: 8,
    capabilityPrefixes: ['qa', 'test'],
    identityTokens: ['qa'],
  },
  {
    id: 'pm',
    label: 'PM',
    glyph: '◎',
    tone: 1,
    capabilityPrefixes: ['product', 'roadmap'],
    identityTokens: ['pm', 'product-manager'],
  },
];

const ROLE_BY_ID = new Map<string, RoleDefinition>(
  ROLE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const ROLE_MATCH_ORDER = [...ROLE_DEFINITIONS].sort(
  (left, right) => right.id.length - left.id.length,
);

function normalizeRoleId(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function agentUriSlug(agentId: string): string {
  return agentId.startsWith('agent://') ? agentId.slice('agent://'.length) : agentId;
}

function inferRoleFromIdentity(agent: AgentObservabilityRecord): string | undefined {
  const haystacks = [agentUriSlug(agent.id), agent.name].map((value) => value.toLowerCase());

  for (const definition of ROLE_MATCH_ORDER) {
    for (const token of definition.identityTokens) {
      for (const haystack of haystacks) {
        if (haystack.includes(token)) {
          return definition.id;
        }
      }
    }
  }

  return undefined;
}

function inferRoleFromCapabilities(agent: AgentObservabilityRecord): string | undefined {
  const capabilities = agent.capabilities.map((cap) => cap.toLowerCase());

  for (const definition of ROLE_DEFINITIONS) {
    for (const capability of capabilities) {
      for (const prefix of definition.capabilityPrefixes) {
        if (capability.includes(prefix)) {
          return definition.id;
        }
      }
    }
  }

  return undefined;
}

function buildResolvedRole(id: string, source: RoleSource): ResolvedAgentRole {
  const normalized = normalizeRoleId(id);
  const definition = ROLE_BY_ID.get(normalized);

  if (definition !== undefined) {
    return {
      id: definition.id,
      label: definition.label,
      glyph: definition.glyph,
      tone: definition.tone,
      source,
    };
  }

  const label = normalized
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    id: normalized,
    label,
    glyph: label.slice(0, 1).toUpperCase(),
    tone: (normalized.length % 8) + 1,
    source,
  };
}

/**
 * Resolve display role for an agent: metadata → identity slug → capability prefix.
 */
export function resolveAgentRole(agent: AgentObservabilityRecord): ResolvedAgentRole | undefined {
  if (agent.role !== undefined && agent.role.trim().length > 0) {
    return buildResolvedRole(agent.role, 'metadata');
  }

  const fromIdentity = inferRoleFromIdentity(agent);
  if (fromIdentity !== undefined) {
    return buildResolvedRole(fromIdentity, 'identity');
  }

  const fromCapability = inferRoleFromCapabilities(agent);
  if (fromCapability !== undefined) {
    return buildResolvedRole(fromCapability, 'capability');
  }

  return undefined;
}

export interface RoleLegendEntry {
  readonly role: ResolvedAgentRole;
  readonly fleetId: CatalogFleetId;
}

/** Distinct role + fleet pairs for legend rendering (stable label order). */
export function collectRoleLegendEntries(
  agents: readonly AgentObservabilityRecord[],
): readonly RoleLegendEntry[] {
  const seen = new Set<string>();
  const resolved: RoleLegendEntry[] = [];

  for (const agent of agents) {
    const role = resolveAgentRole(agent);
    if (role === undefined) {
      continue;
    }

    const fleetId = resolveFleetBucket(agent.fleet);
    const key = `${fleetId}:${role.id}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    resolved.push({ role, fleetId });
  }

  return resolved.sort((left, right) => left.role.label.localeCompare(right.role.label));
}

export function roleSearchTokens(agent: AgentObservabilityRecord): readonly string[] {
  const role = resolveAgentRole(agent);
  if (role === undefined) {
    return [];
  }

  return [role.id, role.label, role.label.toLowerCase()];
}

export function roleToneStyleKey(fleetId: CatalogFleetId, tone: number): string {
  const fleetKey = fleetId.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
  return `${fleetKey}Tone${tone}`;
}
