import type { MessageAppendedEventData } from '@oacp/observability-client';

export type MessageFeedAppendListener = (data: MessageAppendedEventData) => void;

const listeners = new Set<MessageFeedAppendListener>();

/** SSE transport hook — Day 47 incremental feed appends via `useIncrementalMessageFeed`. */
export function enqueueMessageFeedAppend(data: MessageAppendedEventData): void {
  for (const listener of listeners) {
    listener(data);
  }
}

export function subscribeMessageFeedAppend(listener: MessageFeedAppendListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — reset bus between unit tests. */
export function resetMessageFeedAppendBus(): void {
  listeners.clear();
}
