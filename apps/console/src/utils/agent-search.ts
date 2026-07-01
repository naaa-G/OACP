import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { roleSearchTokens } from './role-taxonomy.js';

export const SEARCH_DEBOUNCE_MS = 120;

export interface HighlightRange {
  readonly start: number;
  readonly end: number;
}

export interface AgentSearchHighlights {
  readonly name: readonly HighlightRange[];
  readonly id: readonly HighlightRange[];
  readonly capabilities: Readonly<Record<string, readonly HighlightRange[]>>;
}

export interface AgentSearchResult {
  readonly agent: AgentObservabilityRecord;
  readonly score: number;
  readonly highlights: AgentSearchHighlights;
}

interface SearchableField {
  readonly key: keyof AgentSearchHighlights | 'capability';
  readonly value: string;
  readonly weight: number;
  readonly capabilityKey?: string | undefined;
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function tokenizeQuery(query: string): readonly string[] {
  const normalized = normalizeQuery(query);
  if (normalized.length === 0) {
    return [];
  }

  return normalized.split(/\s+/).filter((token) => token.length > 0);
}

function buildSearchableFields(agent: AgentObservabilityRecord): readonly SearchableField[] {
  const fields: SearchableField[] = [
    { key: 'name', value: agent.name, weight: 12 },
    { key: 'id', value: agent.id, weight: 8 },
    { key: 'name', value: agent.fleet ?? '', weight: 6 },
    { key: 'name', value: agent.role ?? '', weight: 9 },
    ...roleSearchTokens(agent).map((token) => ({
      key: 'name' as const,
      value: token,
      weight: 9,
    })),
  ];

  for (const capability of agent.capabilities) {
    fields.push({
      key: 'capability',
      value: capability,
      weight: 5,
      capabilityKey: capability,
    });
  }

  return fields;
}

function fuzzyTokenMatchesField(token: string, field: string): boolean {
  const normalizedField = field.toLowerCase();
  if (normalizedField.includes(token)) {
    return true;
  }

  let tokenIndex = 0;
  for (
    let fieldIndex = 0;
    fieldIndex < normalizedField.length && tokenIndex < token.length;
    fieldIndex++
  ) {
    if (normalizedField[fieldIndex] === token[tokenIndex]) {
      tokenIndex += 1;
    }
  }

  return tokenIndex === token.length;
}

function findSubstringRanges(text: string, token: string): HighlightRange[] {
  const lower = text.toLowerCase();
  const ranges: HighlightRange[] = [];
  let start = 0;

  while (start < lower.length) {
    const index = lower.indexOf(token, start);
    if (index === -1) {
      break;
    }

    ranges.push({ start: index, end: index + token.length });
    start = index + token.length;
  }

  return ranges;
}

function mergeRanges(ranges: readonly HighlightRange[]): HighlightRange[] {
  if (ranges.length <= 1) {
    return [...ranges];
  }

  const sorted = [...ranges].sort((left, right) => left.start - right.start);
  const first = sorted[0];
  if (first === undefined) {
    return [];
  }
  const merged: HighlightRange[] = [first];

  for (let index = 1; index < sorted.length; index++) {
    const current = sorted[index];
    const previous = merged[merged.length - 1];
    if (current === undefined || previous === undefined) {
      continue;
    }

    if (current.start <= previous.end) {
      merged[merged.length - 1] = {
        start: previous.start,
        end: Math.max(previous.end, current.end),
      };
    } else {
      merged.push(current);
    }
  }

  return merged;
}

function collectRanges(text: string, tokens: readonly string[]): HighlightRange[] {
  const ranges = tokens.flatMap((token) => findSubstringRanges(text, token));
  return mergeRanges(ranges);
}

function scoreTokenMatch(token: string, field: SearchableField): number {
  const normalized = field.value.toLowerCase();
  if (normalized === token) {
    return field.weight * 4;
  }

  if (normalized.startsWith(token)) {
    return field.weight * 3;
  }

  if (normalized.includes(token)) {
    return field.weight * 2;
  }

  if (fuzzyTokenMatchesField(token, field.value)) {
    return field.weight;
  }

  return 0;
}

function agentMatchesTokens(
  agent: AgentObservabilityRecord,
  tokens: readonly string[],
): AgentSearchResult | undefined {
  if (tokens.length === 0) {
    return {
      agent,
      score: 0,
      highlights: { name: [], id: [], capabilities: {} },
    };
  }

  const fields = buildSearchableFields(agent);
  let totalScore = 0;

  for (const token of tokens) {
    let tokenScore = 0;

    for (const field of fields) {
      tokenScore = Math.max(tokenScore, scoreTokenMatch(token, field));
    }

    if (tokenScore === 0) {
      return undefined;
    }

    totalScore += tokenScore;
  }

  const capabilityHighlights: Record<string, readonly HighlightRange[]> = {};
  for (const capability of agent.capabilities) {
    const ranges = collectRanges(capability, tokens);
    if (ranges.length > 0) {
      capabilityHighlights[capability] = ranges;
    }
  }

  return {
    agent,
    score: totalScore,
    highlights: {
      name: collectRanges(agent.name, tokens),
      id: collectRanges(agent.id, tokens),
      capabilities: capabilityHighlights,
    },
  };
}

/** Fuzzy-filter agents by name, id, fleet, role, and capabilities. */
export function searchAgents(
  agents: readonly AgentObservabilityRecord[],
  query: string,
): readonly AgentSearchResult[] {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return agents.map((agent) => ({
      agent,
      score: 0,
      highlights: { name: [], id: [], capabilities: {} },
    }));
  }

  const results: AgentSearchResult[] = [];

  for (const agent of agents) {
    const match = agentMatchesTokens(agent, tokens);
    if (match !== undefined) {
      results.push(match);
    }
  }

  return results.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    const leftName = left.agent.name.trim().length > 0 ? left.agent.name : left.agent.id;
    const rightName = right.agent.name.trim().length > 0 ? right.agent.name : right.agent.id;
    return leftName.localeCompare(rightName, undefined, { sensitivity: 'base' });
  });
}

export function hasActiveSearchQuery(query: string): boolean {
  return normalizeQuery(query).length > 0;
}
