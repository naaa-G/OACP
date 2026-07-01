import type { TraceBundle } from './types.js';

/** Strip the `agent://` prefix for compact display labels. */
export function shortAgentId(agentId: string): string {
  return agentId.replace(/^agent:\/\//, '');
}

/**
 * Agent IDs participating in a trace — from trace roster and timeline senders/recipients.
 * Mirrors legacy playground logic for consistent active highlighting.
 */
export function activeAgentsFromTrace(trace: TraceBundle | undefined): ReadonlySet<string> {
  const active = new Set<string>();
  if (trace === undefined) {
    return active;
  }

  for (const agentId of trace.agents) {
    active.add(agentId);
  }

  for (const event of trace.timeline) {
    if (event.from.length > 0) {
      active.add(event.from);
    }
    if (event.to !== undefined && event.to.length > 0) {
      active.add(event.to);
    }
  }

  return active;
}
