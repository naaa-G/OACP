import type { ShowcaseEdgePulseRequest } from './showcase-graph-edge-pulse.js';

export type ShowcaseEdgePulseListener = (request: ShowcaseEdgePulseRequest) => void;

const listeners = new Set<ShowcaseEdgePulseListener>();

/** SSE / external transport hook — Day 46 will call this instead of poll detection. */
export function enqueueShowcaseEdgePulse(request: ShowcaseEdgePulseRequest): void {
  for (const listener of listeners) {
    listener(request);
  }
}

declare global {
  interface Window {
    __OACP_ENQUEUE_SHOWCASE_EDGE_PULSE__?: (
      request: import('./showcase-graph-edge-pulse.js').ShowcaseEdgePulseRequest,
    ) => void;
  }
}

export function subscribeShowcaseEdgePulseBus(listener: ShowcaseEdgePulseListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper — reset bus between unit tests. */
export function resetShowcaseEdgePulseBus(): void {
  listeners.clear();
}
