import type { TraceTimelineEvent } from '@oacp/observability-client';
import { FEED_TAIL_LIMIT, tailTimelineEvents } from '@oacp/observability-client';

/** True when the agent sent or received the timeline event. */
export function timelineEventInvolvesAgent(event: TraceTimelineEvent, agentId: string): boolean {
  return event.from === agentId || event.to === agentId;
}

/** Filter timeline events to those involving a single agent. */
export function filterTimelineForAgent(
  events: readonly TraceTimelineEvent[] | undefined,
  agentId: string | undefined,
): readonly TraceTimelineEvent[] {
  if (agentId === undefined || events === undefined || events.length === 0) {
    return events ?? [];
  }

  return events.filter((event) => timelineEventInvolvesAgent(event, agentId));
}

/** Tail the feed after optional agent scoping. */
export function tailTimelineEventsForAgent(
  events: readonly TraceTimelineEvent[] | undefined,
  agentId: string | undefined,
  limit: number = FEED_TAIL_LIMIT,
): readonly TraceTimelineEvent[] {
  const scoped = filterTimelineForAgent(events, agentId);
  return tailTimelineEvents(scoped, limit);
}
