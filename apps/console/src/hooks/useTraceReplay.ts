import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TraceTimelineEvent } from '@oacp/observability-client';

import {
  clampReplayMessageIndex,
  replayStepDelayMs,
  sliceTimelineForReplay,
  traceReplaySupported,
  type TraceReplaySpeed,
} from '../utils/trace-replay.js';

export interface UseTraceReplayOptions {
  readonly timeline: readonly TraceTimelineEvent[] | undefined;
  readonly selectedTraceId: string | undefined;
}

export interface UseTraceReplayResult {
  readonly messageIndex: number;
  readonly maxMessageIndex: number;
  readonly isLive: boolean;
  readonly isReplayMode: boolean;
  readonly isPlaying: boolean;
  readonly playbackSpeed: TraceReplaySpeed;
  readonly replaySupported: boolean;
  readonly displayTimeline: readonly TraceTimelineEvent[];
  setMessageIndex: (index: number) => void;
  goLive: () => void;
  togglePlayPause: () => void;
  setPlaybackSpeed: (speed: TraceReplaySpeed) => void;
}

export function useTraceReplay({
  timeline,
  selectedTraceId,
}: UseTraceReplayOptions): UseTraceReplayResult {
  const messageCount = timeline?.length ?? 0;
  const maxMessageIndex = Math.max(0, messageCount - 1);
  const replaySupported = traceReplaySupported(messageCount);

  const [messageIndex, setMessageIndexState] = useState(maxMessageIndex);
  const [isLive, setIsLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<TraceReplaySpeed>(1);
  const traceKeyRef = useRef(selectedTraceId);

  const resetForTrace = useCallback((nextMaxIndex: number) => {
    setMessageIndexState(nextMaxIndex);
    setIsLive(true);
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    if (traceKeyRef.current !== selectedTraceId) {
      traceKeyRef.current = selectedTraceId;
      resetForTrace(maxMessageIndex);
    }
  }, [selectedTraceId, maxMessageIndex, resetForTrace]);

  useEffect(() => {
    if (isLive) {
      setMessageIndexState(maxMessageIndex);
    }
  }, [isLive, maxMessageIndex]);

  useEffect(() => {
    if (!isPlaying || !replaySupported || timeline === undefined) {
      return;
    }

    if (messageIndex >= maxMessageIndex) {
      setIsPlaying(false);
      setIsLive(true);
      return;
    }

    const delayMs = replayStepDelayMs(timeline, messageIndex, playbackSpeed);
    const timer = window.setTimeout(() => {
      setMessageIndexState((current) => {
        const next = clampReplayMessageIndex(current + 1, messageCount);
        if (next >= maxMessageIndex) {
          setIsPlaying(false);
          setIsLive(true);
        }
        return next;
      });
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isPlaying,
    replaySupported,
    timeline,
    messageIndex,
    maxMessageIndex,
    messageCount,
    playbackSpeed,
  ]);

  const setMessageIndex = useCallback(
    (index: number) => {
      const clamped = clampReplayMessageIndex(index, messageCount);
      setMessageIndexState(clamped);
      setIsPlaying(false);
      setIsLive(clamped >= maxMessageIndex);
    },
    [messageCount, maxMessageIndex],
  );

  const goLive = useCallback(() => {
    setIsPlaying(false);
    setIsLive(true);
    setMessageIndexState(maxMessageIndex);
  }, [maxMessageIndex]);

  const togglePlayPause = useCallback(() => {
    if (!replaySupported) {
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (isLive) {
      setIsLive(false);
      setMessageIndexState(0);
      setIsPlaying(true);
      return;
    }

    if (messageIndex >= maxMessageIndex) {
      setMessageIndexState(0);
    }

    setIsPlaying(true);
  }, [isLive, isPlaying, maxMessageIndex, messageIndex, replaySupported]);

  const displayTimeline = useMemo(
    () => (isLive ? (timeline ?? []) : sliceTimelineForReplay(timeline, messageIndex)),
    [isLive, messageIndex, timeline],
  );

  const isReplayMode = replaySupported && !isLive;

  return {
    messageIndex,
    maxMessageIndex,
    isLive,
    isReplayMode,
    isPlaying,
    playbackSpeed,
    replaySupported,
    displayTimeline,
    setMessageIndex,
    goLive,
    togglePlayPause,
    setPlaybackSpeed,
  };
}
