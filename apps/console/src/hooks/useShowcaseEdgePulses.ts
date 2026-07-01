import type { TraceTimelineEvent } from '@oacp/observability-client';
import { useEffect, useRef, useState } from 'react';

import { subscribeShowcaseEdgePulseBus } from '../graph/showcase-edge-pulse-bus.js';
import {
  createShowcaseEdgePulse,
  detectTimelineShowcaseEdgePulses,
  mergeShowcaseEdgePulses,
  pruneShowcaseEdgePulses,
  type ShowcaseEdgePulse,
} from '../graph/showcase-graph-edge-pulse.js';

export function useShowcaseEdgePulses({
  timeline,
  liveEnabled,
  animateEdges,
  traceId,
}: {
  readonly timeline: readonly TraceTimelineEvent[] | undefined;
  readonly liveEnabled: boolean;
  readonly animateEdges: boolean;
  readonly traceId: string | undefined;
}): {
  readonly pulses: readonly ShowcaseEdgePulse[];
  readonly pulseTotal: number;
} {
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const processedPulseIdsRef = useRef<Set<string>>(new Set());
  const traceIdRef = useRef<string | undefined>(traceId);
  const timelineSeededRef = useRef(false);
  const [pulses, setPulses] = useState<readonly ShowcaseEdgePulse[]>([]);
  const [pulseTotal, setPulseTotal] = useState(0);

  useEffect(() => {
    if (traceIdRef.current === traceId) {
      return;
    }

    traceIdRef.current = traceId;
    seenMessageIdsRef.current = new Set();
    processedPulseIdsRef.current = new Set();
    timelineSeededRef.current = false;
    setPulses([]);
    setPulseTotal(0);
  }, [traceId]);

  useEffect(() => {
    if (!animateEdges || !liveEnabled || traceId === undefined) {
      return undefined;
    }

    if (!timelineSeededRef.current) {
      seenMessageIdsRef.current = new Set((timeline ?? []).map((event) => event.message_id));
      timelineSeededRef.current = true;
      return undefined;
    }

    const { pulses: detected, nextSeenMessageIds } = detectTimelineShowcaseEdgePulses({
      timeline,
      seenMessageIds: seenMessageIdsRef.current,
      liveEnabled,
    });

    seenMessageIdsRef.current = new Set(nextSeenMessageIds);

    if (detected.length > 0) {
      const fresh = detected.filter((pulse) => !processedPulseIdsRef.current.has(pulse.id));
      for (const pulse of fresh) {
        processedPulseIdsRef.current.add(pulse.id);
      }
      if (fresh.length > 0) {
        setPulseTotal((count) => count + fresh.length);
        setPulses((current) => mergeShowcaseEdgePulses(current, fresh));
      }
    }
  }, [animateEdges, liveEnabled, timeline, traceId]);

  useEffect(() => {
    if (!animateEdges) {
      return undefined;
    }

    return subscribeShowcaseEdgePulseBus((request) => {
      const pulse = createShowcaseEdgePulse(request);
      if (processedPulseIdsRef.current.has(pulse.id)) {
        return;
      }
      processedPulseIdsRef.current.add(pulse.id);
      setPulseTotal((count) => count + 1);
      setPulses((current) => mergeShowcaseEdgePulses(current, [pulse]));
    });
  }, [animateEdges]);

  useEffect(() => {
    if (!animateEdges || pulses.length === 0) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPulses((current) => {
        const next = pruneShowcaseEdgePulses(current, Date.now());
        return next.length === current.length ? current : next;
      });
    }, 120);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [animateEdges, pulses.length]);

  return animateEdges ? { pulses, pulseTotal } : { pulses: [], pulseTotal: 0 };
}
