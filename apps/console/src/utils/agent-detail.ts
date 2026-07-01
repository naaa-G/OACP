import type {
  AgentObservabilityRecord,
  PublicKeyMaterial,
  TraceListEntry,
  TraceTimelineEvent,
} from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

import { resolveFleetBucket } from './fleet-catalog.js';

export const AGENT_DETAIL_MESSAGE_LIMIT = 10;
export const AGENT_DETAIL_TRACE_LIMIT = 8;

const DEFAULT_MCPLAB_LAB_BASE =
  typeof import.meta.env.VITE_MCPLAB_LAB_URL === 'string' &&
  import.meta.env.VITE_MCPLAB_LAB_URL.length > 0
    ? import.meta.env.VITE_MCPLAB_LAB_URL
    : 'http://127.0.0.1:8080';

function canonicalPublicKeyMaterial(publicKey: PublicKeyMaterial): string {
  if (typeof publicKey === 'string') {
    return publicKey.trim().replace(/\s+/g, '');
  }

  if (typeof publicKey.x === 'string' && publicKey.x.length > 0) {
    return publicKey.x;
  }

  if (typeof publicKey.n === 'string' && publicKey.n.length > 0) {
    return publicKey.n;
  }

  return JSON.stringify(publicKey);
}

/** Truncated fingerprint for display (not a cryptographic hash). */
export function formatPublicKeyFingerprint(publicKey: PublicKeyMaterial): string {
  const compact = canonicalPublicKeyMaterial(publicKey);
  if (compact.length === 0) {
    return '—';
  }

  if (compact.length <= 12) {
    return compact;
  }

  return `${compact.slice(0, 8)}…${compact.slice(-4)}`;
}

export function collectAgentRecentTraces(
  agentId: string,
  traces: readonly TraceListEntry[] | undefined,
  limit: number = AGENT_DETAIL_TRACE_LIMIT,
): TraceListEntry[] {
  return [...(traces ?? [])]
    .filter((trace) => trace.agents.includes(agentId))
    .sort((left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt))
    .slice(0, limit);
}

export type AgentMessageDirection = 'out' | 'in';

export interface AgentDetailMessage {
  readonly event: TraceTimelineEvent;
  readonly direction: AgentMessageDirection;
}

export function collectAgentMessages(
  agentId: string,
  timeline: readonly TraceTimelineEvent[] | undefined,
  limit: number = AGENT_DETAIL_MESSAGE_LIMIT,
): readonly AgentDetailMessage[] {
  const matches: AgentDetailMessage[] = [];

  for (const event of timeline ?? []) {
    if (event.from === agentId) {
      matches.push({ event, direction: 'out' });
      continue;
    }

    if (event.to === agentId) {
      matches.push({ event, direction: 'in' });
    }
  }

  return matches.slice(-limit);
}

function readMetadataUrl(
  metadata: Readonly<Record<string, unknown>> | undefined,
  keys: readonly string[],
): string | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

/** MCPLab lab URL for fleet agents — explicit metadata wins over convention. */
export function resolveMcplabAgentConfigUrl(
  agent: AgentObservabilityRecord,
  labBaseUrl: string = DEFAULT_MCPLAB_LAB_BASE,
): string | undefined {
  if (resolveFleetBucket(agent.fleet) !== 'mcplab') {
    return undefined;
  }

  const explicit = readMetadataUrl(agent.metadata, [
    'config_url',
    'mcplab_config_url',
    'mcplabConfigUrl',
  ]);
  if (explicit !== undefined) {
    return explicit;
  }

  const slug = shortAgentId(agent.id);
  const base = labBaseUrl.replace(/\/+$/, '');
  return `${base}/agents/${encodeURIComponent(slug)}`;
}
