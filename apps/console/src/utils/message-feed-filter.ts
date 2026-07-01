import type { TraceTimelineEvent } from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

export interface MessageFeedFilters {
  readonly type: string;
  readonly agent: string;
  readonly capability: string;
  readonly status: string;
  readonly text: string;
}

export const DEFAULT_MESSAGE_FEED_FILTERS: MessageFeedFilters = {
  type: '',
  agent: '',
  capability: '',
  status: '',
  text: '',
};

export interface MessageFeedFilterOptions {
  readonly types: readonly string[];
  readonly agents: readonly string[];
  readonly capabilities: readonly string[];
  readonly statuses: readonly string[];
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return [...new Set(values.filter((value) => value.length > 0))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function collectMessageFeedFilterOptions(
  events: readonly TraceTimelineEvent[],
): MessageFeedFilterOptions {
  const types: string[] = [];
  const agents: string[] = [];
  const capabilities: string[] = [];
  const statuses: string[] = [];

  for (const event of events) {
    types.push(event.type);
    agents.push(event.from);
    if (event.to !== undefined) {
      agents.push(event.to);
    }
    if (event.capability !== undefined) {
      capabilities.push(event.capability);
    }
    if (event.status !== undefined) {
      statuses.push(event.status);
    }
  }

  return {
    types: uniqueSorted(types),
    agents: uniqueSorted(agents),
    capabilities: uniqueSorted(capabilities),
    statuses: uniqueSorted(statuses),
  };
}

function matchesTextQuery(event: TraceTimelineEvent, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }

  const haystack = [
    event.summary,
    event.type,
    event.from,
    event.to,
    event.capability,
    event.status,
    event.message_id,
    String(event.index),
    shortAgentId(event.from),
    event.to !== undefined ? shortAgentId(event.to) : undefined,
  ]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

/** Client-side feed filters — type, agent, capability, status, free text (Day 49). */
export function filterTimelineForFeed(
  events: readonly TraceTimelineEvent[],
  filters: MessageFeedFilters,
): readonly TraceTimelineEvent[] {
  return events.filter((event) => {
    if (filters.type.length > 0 && event.type !== filters.type) {
      return false;
    }

    if (filters.agent.length > 0 && event.from !== filters.agent && event.to !== filters.agent) {
      return false;
    }

    if (filters.capability.length > 0 && event.capability !== filters.capability) {
      return false;
    }

    if (filters.status.length > 0 && event.status !== filters.status) {
      return false;
    }

    return matchesTextQuery(event, filters.text);
  });
}

export function countActiveMessageFeedFilters(filters: MessageFeedFilters): number {
  return [
    filters.type,
    filters.agent,
    filters.capability,
    filters.status,
    filters.text.trim(),
  ].filter((value) => value.length > 0).length;
}
