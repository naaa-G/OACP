import type { OacpMessage } from '../protocol/message-schemas.js';
import type { DelegationGraph } from '../memory/delegation-graph-types.js';

/** Single row in a human-readable trace timeline. */
export interface TraceTimelineEvent {
  readonly index: number;
  readonly timestamp: string;
  readonly type: string;
  readonly from: string;
  readonly to?: string;
  readonly capability?: string;
  readonly status?: string;
  readonly message_id: string;
  readonly summary: string;
}

function summarizeMessage(message: OacpMessage): string {
  switch (message.type) {
    case 'task_request':
      return `task_request → ${message.to ?? message.capability}`;
    case 'task_response':
      return message.status === 'success'
        ? 'task_response (success)'
        : `task_response (${message.status}: ${message.error?.code ?? 'error'})`;
    case 'delegation':
      return `delegation → ${message.to ?? message.capability}${message.reason ? ` (${message.reason})` : ''}`;
    case 'capability_query':
      return `capability_query (${message.capability})`;
  }
}

function resolveRecipient(message: OacpMessage): string | undefined {
  if (message.type === 'task_request' || message.type === 'delegation') {
    return message.to;
  }
  return undefined;
}

function resolveCapability(message: OacpMessage): string | undefined {
  if (
    message.type === 'task_request' ||
    message.type === 'delegation' ||
    message.type === 'capability_query'
  ) {
    return message.capability;
  }
  return undefined;
}

function resolveStatus(message: OacpMessage): string | undefined {
  return message.type === 'task_response' ? message.status : undefined;
}

/** Build ordered timeline events from protocol messages. */
export function buildTraceTimeline(
  messages: readonly OacpMessage[],
): readonly TraceTimelineEvent[] {
  return messages.map((message, index) => {
    const to = resolveRecipient(message);
    const capability = resolveCapability(message);
    const status = resolveStatus(message);

    return {
      index,
      timestamp: message.timestamp,
      type: message.type,
      from: message.from,
      ...(to !== undefined ? { to } : {}),
      ...(capability !== undefined ? { capability } : {}),
      ...(status !== undefined ? { status } : {}),
      message_id: message.message_id,
      summary: summarizeMessage(message),
    };
  });
}

export interface FormatTraceTimelineOptions {
  /** Include graph depth summary when provided. */
  readonly graph?: DelegationGraph;
  /** Prefix each line (e.g. `[trace]`). */
  readonly prefix?: string;
}

/** Render a trace timeline for CLI or log output. */
export function formatTraceTimeline(
  events: readonly TraceTimelineEvent[],
  options: FormatTraceTimelineOptions = {},
): string {
  const lines: string[] = [];
  const prefix = options.prefix ?? '';

  if (events.length === 0) {
    return `${prefix}(no messages)`;
  }

  lines.push(`${prefix}Timeline (${String(events.length)} messages):`);

  for (const event of events) {
    const route =
      event.to !== undefined
        ? `${event.from} → ${event.to}`
        : event.capability !== undefined
          ? `${event.from} (${event.capability})`
          : event.from;
    const statusSuffix = event.status !== undefined ? ` [${event.status}]` : '';
    lines.push(
      `${prefix}  ${String(event.index + 1).padStart(2, '0')}. ${event.timestamp}  ${route}${statusSuffix}`,
    );
    lines.push(`${prefix}      ${event.summary}  (${event.message_id.slice(0, 8)}…)`);
  }

  if (options.graph !== undefined) {
    lines.push(
      `${prefix}Graph: ${String(options.graph.nodes.length)} nodes, ${String(options.graph.edges.length)} edges, depth ${String(options.graph.depth)}`,
    );
  }

  return lines.join('\n');
}
