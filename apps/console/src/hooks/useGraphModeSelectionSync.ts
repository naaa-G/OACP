import { useEffect, useRef } from 'react';

import type { GraphMode } from '../config/graph-mode.js';
import { opsGraphInteractionApi } from '../graph/ops-graph-interaction-api.js';

const OPS_MODE_SYNC_DELAY_MS = 260;

/** Preserve trace/agent selection and frame the selected node when switching graph modes (Day 44). */
export function useGraphModeSelectionSync(
  mode: GraphMode,
  selectedAgentId: string | undefined,
): void {
  const previousModeRef = useRef(mode);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === mode) {
      return undefined;
    }

    previousModeRef.current = mode;

    if (mode !== 'ops' || selectedAgentId === undefined) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      opsGraphInteractionApi.zoomToNode?.(selectedAgentId);
    }, OPS_MODE_SYNC_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [mode, selectedAgentId]);
}
