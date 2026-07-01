import {
  OBSERVABILITY_EVENTS_PATH,
  parseObservabilityEventPayload,
  type ObservabilityEvent,
} from './events.js';
import { OACP_API_KEY_SSE_QUERY_PARAM } from './auth.js';

export interface ConnectObservabilityEventStreamOptions {
  readonly baseUrl?: string | undefined;
  readonly traceId?: string | undefined;
  /** Explicit resume cursor for first connect (`?after=`). Browser reconnect uses Last-Event-ID automatically. */
  readonly afterEventId?: string | undefined;
  /** API key for SSE (`api_key` query param — browsers cannot set headers on EventSource). */
  readonly apiKey?: string | undefined;
  readonly onEvent: (event: ObservabilityEvent) => void;
  readonly onOpen?: () => void;
  readonly onError?: (error: Event) => void;
  readonly onResync?: (event: Extract<ObservabilityEvent, { type: 'stream.resync' }>) => void;
}

export interface ObservabilityEventStreamHandle {
  readonly close: () => void;
}

/** Build SSE URL — relative path when `baseUrl` is empty (same-origin / Vite proxy). */
export function buildObservabilityEventsUrl(
  options: Pick<
    ConnectObservabilityEventStreamOptions,
    'baseUrl' | 'traceId' | 'afterEventId' | 'apiKey'
  >,
): string {
  const params = new URLSearchParams();

  if (options.traceId !== undefined && options.traceId.length > 0) {
    params.set('trace_id', options.traceId);
  }

  if (options.afterEventId !== undefined && options.afterEventId.length > 0) {
    params.set('after', options.afterEventId);
  }

  if (options.apiKey !== undefined && options.apiKey.trim().length > 0) {
    params.set(OACP_API_KEY_SSE_QUERY_PARAM, options.apiKey.trim());
  }

  const query = params.toString();
  const path =
    query.length > 0 ? `${OBSERVABILITY_EVENTS_PATH}?${query}` : OBSERVABILITY_EVENTS_PATH;
  const base = (options.baseUrl ?? '').replace(/\/$/, '');

  if (base.length === 0) {
    return path;
  }

  return `${base}${path}`;
}

/** Connect to the observability SSE stream via browser `EventSource`. */
export function connectObservabilityEventStream(
  options: ConnectObservabilityEventStreamOptions,
): ObservabilityEventStreamHandle {
  if (typeof EventSource === 'undefined') {
    throw new Error('EventSource is not available in this environment');
  }

  const source = new EventSource(buildObservabilityEventsUrl(options));

  source.addEventListener('open', () => {
    options.onOpen?.();
  });

  source.addEventListener('error', (event) => {
    options.onError?.(event);
  });

  for (const eventType of [
    'message.appended',
    'agent.registered',
    'trace.started',
    'trace.completed',
    'stream.resync',
    'stream.heartbeat',
  ] as const) {
    source.addEventListener(eventType, (raw) => {
      const messageEvent = raw as MessageEvent<string>;
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(messageEvent.data) as unknown;
      } catch {
        return;
      }

      const event = parseObservabilityEventPayload(eventType, parsedBody);
      if (event === undefined) {
        return;
      }

      if (event.type === 'stream.resync') {
        options.onResync?.(event);
      }

      options.onEvent(event);
    });
  }

  return {
    close: () => {
      source.close();
    },
  };
}
