import { useEffect, useRef } from 'react';

import { connectObservabilityEventStream } from '../event-stream.js';
import type { ObservabilityEvent } from '../events.js';
import { useObservabilityConfig } from '../provider.js';

export interface UseObservabilityEventsOptions {
  readonly traceId?: string | undefined;
  readonly enabled?: boolean | undefined;
  readonly afterEventId?: string | undefined;
  readonly onEvent?: ((event: ObservabilityEvent) => void) | undefined;
  readonly onResync?: (() => void) | undefined;
  readonly onOpen?: (() => void) | undefined;
}

export function useObservabilityEvents({
  traceId,
  enabled = true,
  afterEventId,
  onEvent,
  onResync,
  onOpen,
}: UseObservabilityEventsOptions): void {
  const { baseUrl, apiKey } = useObservabilityConfig();
  const onEventRef = useRef(onEvent);
  const onResyncRef = useRef(onResync);
  const onOpenRef = useRef(onOpen);

  onEventRef.current = onEvent;
  onResyncRef.current = onResync;
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || typeof EventSource === 'undefined') {
      return undefined;
    }

    const handle = connectObservabilityEventStream({
      baseUrl,
      traceId,
      afterEventId,
      apiKey,
      onOpen: () => {
        onOpenRef.current?.();
      },
      onEvent: (event) => {
        onEventRef.current?.(event);
      },
      onResync: () => {
        onResyncRef.current?.();
      },
    });

    return () => {
      handle.close();
    };
  }, [afterEventId, apiKey, baseUrl, enabled, traceId]);
}
