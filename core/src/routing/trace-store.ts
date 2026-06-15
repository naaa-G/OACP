import type { OacpMessage } from '../protocol/message-schemas.js';

/** Record of all messages sharing a `trace_id`. */
export interface TraceRecord {
  readonly traceId: string;
  readonly startedAt: string;
  readonly messages: readonly OacpMessage[];
  readonly messageCount: number;
}

export interface TraceStoreOptions {
  /** Maximum messages retained per trace (oldest dropped). Default: 1000. */
  readonly maxMessagesPerTrace?: number;
}

/** Summary row for trace listing and dashboards. */
export interface TraceListEntry {
  readonly traceId: string;
  readonly startedAt: string;
  readonly lastActivityAt: string;
  readonly messageCount: number;
  readonly messageTypes: readonly string[];
  readonly agents: readonly string[];
}

export interface ListTracesOptions {
  readonly limit?: number;
  readonly offset?: number;
}

/**
 * In-memory trace index for distributed correlation (`trace_id`).
 * Used by the message bus for observability and reply routing.
 */
export class TraceStore {
  private readonly maxMessagesPerTrace: number;
  private readonly traces = new Map<string, OacpMessage[]>();
  private readonly messageIndex = new Map<string, OacpMessage>();

  constructor(options: TraceStoreOptions = {}) {
    this.maxMessagesPerTrace = options.maxMessagesPerTrace ?? 1000;
  }

  /** Record a message and index it by `message_id`. */
  record(message: OacpMessage): void {
    this.messageIndex.set(message.message_id, message);

    let traceMessages = this.traces.get(message.trace_id);
    if (!traceMessages) {
      traceMessages = [];
      this.traces.set(message.trace_id, traceMessages);
    }

    traceMessages.push(message);
    if (traceMessages.length > this.maxMessagesPerTrace) {
      traceMessages.shift();
    }
  }

  /** Look up a message by `message_id` (e.g. for `in_reply_to` routing). */
  getMessageById(messageId: string): OacpMessage | undefined {
    return this.messageIndex.get(messageId);
  }

  /** Get the full trace record for a `trace_id`. */
  getTrace(traceId: string): TraceRecord | undefined {
    const messages = this.traces.get(traceId);
    if (!messages || messages.length === 0) {
      return undefined;
    }
    const first = messages[0];
    if (!first) {
      return undefined;
    }
    return {
      traceId,
      startedAt: first.timestamp,
      messages: [...messages],
      messageCount: messages.length,
    };
  }

  /** List all messages in a trace in delivery order. */
  getMessagesForTrace(traceId: string): readonly OacpMessage[] {
    return [...(this.traces.get(traceId) ?? [])];
  }

  /** Number of distinct traces stored. */
  get traceCount(): number {
    return this.traces.size;
  }

  /** List trace summaries sorted by most recent activity first. */
  listTraces(options: ListTracesOptions = {}): readonly TraceListEntry[] {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const entries: TraceListEntry[] = [];

    for (const [traceId, messages] of this.traces) {
      if (messages.length === 0) {
        continue;
      }

      const first = messages[0];
      const last = messages[messages.length - 1];
      if (!first || !last) {
        continue;
      }

      const messageTypes = new Set<string>();
      const agents = new Set<string>();

      for (const message of messages) {
        messageTypes.add(message.type);
        agents.add(message.from);
        if (message.type === 'task_request' || message.type === 'delegation') {
          if (message.to !== undefined) {
            agents.add(message.to);
          }
        }
      }

      entries.push({
        traceId,
        startedAt: first.timestamp,
        lastActivityAt: last.timestamp,
        messageCount: messages.length,
        messageTypes: [...messageTypes].sort(),
        agents: [...agents].sort(),
      });
    }

    entries.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));

    return entries.slice(offset, offset + limit);
  }

  /** Clear all traces (for tests). */
  clear(): void {
    this.traces.clear();
    this.messageIndex.clear();
  }
}
