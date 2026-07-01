import type { ObservabilityEvent, ObservabilityEventType } from '@oacp/observability-client';

export type ObservabilityEventInput = Omit<ObservabilityEvent, 'id'> & { readonly id?: string };

export interface ObservabilityEventSubscribeOptions {
  readonly traceId?: string | undefined;
}

export interface ObservabilityEventReplayOptions {
  readonly traceId?: string | undefined;
}

/** In-process observability event bus with ring-buffer replay (Day 46). */
export interface ObservabilityEventBus {
  publish(input: ObservabilityEventInput): ObservabilityEvent;
  /** Store in the replay ring buffer without notifying live SSE subscribers. */
  record(input: ObservabilityEventInput): ObservabilityEvent;
  subscribe(
    listener: (event: ObservabilityEvent) => void,
    options?: ObservabilityEventSubscribeOptions,
  ): () => void;
  replay(
    afterEventId: string | undefined,
    options?: ObservabilityEventReplayOptions,
  ): readonly ObservabilityEvent[];
  hasEvent(eventId: string): boolean;
  close(): void;
}

export interface InMemoryObservabilityEventBusOptions {
  readonly maxEvents?: number | undefined;
}

const DEFAULT_MAX_EVENTS = 10_000;

function matchesTraceFilter(event: ObservabilityEvent, traceId: string | undefined): boolean {
  if (traceId === undefined || traceId.length === 0) {
    return true;
  }

  if (event.type === 'stream.heartbeat') {
    return true;
  }

  if (event.type === 'stream.resync') {
    return event.data.trace_id === undefined || event.data.trace_id === traceId;
  }

  if ('trace_id' in event.data && typeof event.data.trace_id === 'string') {
    return event.data.trace_id === traceId;
  }

  return false;
}

export class InMemoryObservabilityEventBus implements ObservabilityEventBus {
  private readonly maxEvents: number;
  private readonly events: ObservabilityEvent[] = [];
  private readonly subscribers = new Set<{
    listener: (event: ObservabilityEvent) => void;
    traceId?: string | undefined;
  }>();
  private nextSequence = 1;
  private closed = false;

  constructor(options: InMemoryObservabilityEventBusOptions = {}) {
    this.maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS;
  }

  publish(input: ObservabilityEventInput): ObservabilityEvent {
    if (this.closed) {
      throw new Error('Observability event bus is closed');
    }

    const event: ObservabilityEvent = {
      ...input,
      id: input.id ?? String(this.nextSequence++),
    } as ObservabilityEvent;

    this.storeEvent(event, true);
    return event;
  }

  record(input: ObservabilityEventInput): ObservabilityEvent {
    if (this.closed) {
      throw new Error('Observability event bus is closed');
    }

    const event: ObservabilityEvent = {
      ...input,
      id: input.id ?? String(this.nextSequence++),
    } as ObservabilityEvent;

    this.storeEvent(event, false);
    return event;
  }

  /** Ingest an event from an external fanout transport without re-sequencing ids. */
  ingestExternal(event: ObservabilityEvent): void {
    if (this.closed) {
      return;
    }

    if (this.events.some((existing) => existing.id === event.id)) {
      return;
    }

    this.storeEvent(event, true);
  }

  subscribe(
    listener: (event: ObservabilityEvent) => void,
    options: ObservabilityEventSubscribeOptions = {},
  ): () => void {
    const entry = { listener, traceId: options.traceId };
    this.subscribers.add(entry);

    return () => {
      this.subscribers.delete(entry);
    };
  }

  replay(
    afterEventId: string | undefined,
    options: ObservabilityEventReplayOptions = {},
  ): readonly ObservabilityEvent[] {
    const traceId = options.traceId;
    let startIndex = 0;

    if (afterEventId !== undefined && afterEventId.length > 0) {
      const index = this.events.findIndex((event) => event.id === afterEventId);
      startIndex = index >= 0 ? index + 1 : 0;
    }

    return this.events.slice(startIndex).filter((event) => matchesTraceFilter(event, traceId));
  }

  hasEvent(eventId: string): boolean {
    return this.events.some((event) => event.id === eventId);
  }

  close(): void {
    this.closed = true;
    this.subscribers.clear();
  }

  private storeEvent(event: ObservabilityEvent, notifySubscribers: boolean): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.splice(0, this.events.length - this.maxEvents);
    }

    if (!notifySubscribers) {
      return;
    }

    for (const subscriber of this.subscribers) {
      if (matchesTraceFilter(event, subscriber.traceId)) {
        subscriber.listener(event);
      }
    }
  }
}

export function formatSseEvent(event: ObservabilityEvent): string {
  const payload = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    data: event.data,
  });

  return `id: ${event.id}\nevent: ${event.type}\ndata: ${payload}\n\n`;
}

export function formatSseComment(comment: string): string {
  return `: ${comment}\n\n`;
}

export function isPublicObservabilityEventType(
  type: ObservabilityEventType,
): type is Exclude<ObservabilityEventType, 'stream.heartbeat'> {
  return type !== 'stream.heartbeat';
}
