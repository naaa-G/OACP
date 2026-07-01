import type { TraceTimelineEvent } from '@oacp/observability-client';

import { showcaseGraphEdgeKey } from './showcase-graph-edge-key.js';

export const SHOWCASE_EDGE_PULSE_DURATION_MS = 1100;
export const SHOWCASE_EDGE_PULSE_MAX_ACTIVE = 12;

export interface ShowcaseEdgePulseRequest {
  readonly fromAgent: string;
  readonly toAgent: string;
  readonly messageId?: string | undefined;
  readonly edgeKey?: string | undefined;
}

export interface ShowcaseEdgePulse extends ShowcaseEdgePulseRequest {
  readonly id: string;
  readonly startedAtMs: number;
  readonly durationMs: number;
}

export function createShowcaseEdgePulse(
  request: ShowcaseEdgePulseRequest,
  startedAtMs: number = Date.now(),
): ShowcaseEdgePulse {
  const id =
    request.messageId !== undefined && request.messageId.length > 0
      ? request.messageId
      : `${request.fromAgent}-${request.toAgent}-${startedAtMs}`;

  return {
    ...request,
    id,
    edgeKey:
      request.edgeKey ?? showcaseGraphEdgeKey(request.fromAgent, request.toAgent, 'delegates'),
    startedAtMs,
    durationMs: SHOWCASE_EDGE_PULSE_DURATION_MS,
  };
}

export function showcaseEdgePulseProgress(
  pulse: Pick<ShowcaseEdgePulse, 'startedAtMs' | 'durationMs'>,
  nowMs: number,
): number {
  if (pulse.durationMs <= 0) {
    return 1;
  }

  return Math.min(1, Math.max(0, (nowMs - pulse.startedAtMs) / pulse.durationMs));
}

export function isShowcaseEdgePulseComplete(
  pulse: Pick<ShowcaseEdgePulse, 'startedAtMs' | 'durationMs'>,
  nowMs: number,
): boolean {
  return showcaseEdgePulseProgress(pulse, nowMs) >= 1;
}

export function pruneShowcaseEdgePulses(
  pulses: readonly ShowcaseEdgePulse[],
  nowMs: number,
): readonly ShowcaseEdgePulse[] {
  return pulses.filter((pulse) => !isShowcaseEdgePulseComplete(pulse, nowMs));
}

export function mergeShowcaseEdgePulses(
  existing: readonly ShowcaseEdgePulse[],
  incoming: readonly ShowcaseEdgePulse[],
  nowMs: number = Date.now(),
): readonly ShowcaseEdgePulse[] {
  const active = pruneShowcaseEdgePulses(existing, nowMs);
  const seen = new Set(active.map((pulse) => pulse.id));
  const merged = [...active];

  for (const pulse of incoming) {
    if (seen.has(pulse.id)) {
      continue;
    }
    merged.push(pulse);
    seen.add(pulse.id);
  }

  if (merged.length <= SHOWCASE_EDGE_PULSE_MAX_ACTIVE) {
    return merged;
  }

  return merged.slice(merged.length - SHOWCASE_EDGE_PULSE_MAX_ACTIVE);
}

/** Poll-based pulse detection from timeline growth (Day 40; SSE replaces in Day 46). */
export function detectTimelineShowcaseEdgePulses({
  timeline,
  seenMessageIds,
  liveEnabled,
  nowMs = Date.now(),
}: {
  readonly timeline: readonly TraceTimelineEvent[] | undefined;
  readonly seenMessageIds: ReadonlySet<string>;
  readonly liveEnabled: boolean;
  readonly nowMs?: number;
}): {
  readonly pulses: readonly ShowcaseEdgePulse[];
  readonly nextSeenMessageIds: ReadonlySet<string>;
} {
  const events = timeline ?? [];
  const nextSeen = new Set(seenMessageIds);

  for (const event of events) {
    nextSeen.add(event.message_id);
  }

  if (!liveEnabled) {
    return { pulses: [], nextSeenMessageIds: nextSeen };
  }

  const pulses: ShowcaseEdgePulse[] = [];

  for (const event of events) {
    if (seenMessageIds.has(event.message_id)) {
      continue;
    }

    const toAgent = event.to?.trim();
    if (toAgent === undefined || toAgent.length === 0) {
      continue;
    }

    pulses.push(
      createShowcaseEdgePulse(
        {
          fromAgent: event.from,
          toAgent,
          messageId: event.message_id,
        },
        nowMs,
      ),
    );
  }

  return { pulses, nextSeenMessageIds: nextSeen };
}

function readPathPoint(
  pathPoints: readonly (readonly [number, number, number])[],
  index: number,
): readonly [number, number, number] {
  const point = pathPoints[index];
  if (point === undefined) {
    throw new Error(`Missing showcase edge path point at index ${index}`);
  }
  return point;
}

export function sampleShowcaseEdgePath(
  pathPoints: readonly (readonly [number, number, number])[],
  progress: number,
): readonly [number, number, number] {
  if (pathPoints.length === 0) {
    return [0, 0, 0];
  }

  if (pathPoints.length === 1) {
    return readPathPoint(pathPoints, 0);
  }

  const clamped = Math.min(1, Math.max(0, progress));
  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let index = 1; index < pathPoints.length; index += 1) {
    const previous = readPathPoint(pathPoints, index - 1);
    const current = readPathPoint(pathPoints, index);
    const length = Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1],
      current[2] - previous[2],
    );
    segmentLengths.push(length);
    totalLength += length;
  }

  if (totalLength <= 0) {
    return readPathPoint(pathPoints, pathPoints.length - 1);
  }

  const targetDistance = clamped * totalLength;
  let walked = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    if (segmentLength === undefined) {
      continue;
    }
    if (walked + segmentLength >= targetDistance) {
      const localProgress = segmentLength <= 0 ? 0 : (targetDistance - walked) / segmentLength;
      const from = readPathPoint(pathPoints, index);
      const to = readPathPoint(pathPoints, index + 1);
      return [
        from[0] + (to[0] - from[0]) * localProgress,
        from[1] + (to[1] - from[1]) * localProgress,
        from[2] + (to[2] - from[2]) * localProgress,
      ];
    }
    walked += segmentLength;
  }

  return readPathPoint(pathPoints, pathPoints.length - 1);
}

export function pulseMatchesShowcaseEdge(
  pulse: Pick<ShowcaseEdgePulse, 'fromAgent' | 'toAgent'>,
  edge: Pick<ShowcaseEdgePulse, 'fromAgent' | 'toAgent'>,
): boolean {
  return pulse.fromAgent === edge.fromAgent && pulse.toAgent === edge.toAgent;
}
