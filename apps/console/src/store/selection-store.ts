import {
  readAgentIdFromSearch,
  readGraphModeFromSearch,
  readTraceIdFromSearch,
} from '@oacp/observability-client';
import { create } from 'zustand';

import {
  graphMode as buildTimeGraphMode,
  parseGraphMode,
  type GraphMode,
} from '../config/graph-mode.js';
import {
  DEFAULT_SHOWCASE_LAYOUT_KIND,
  parseShowcaseLayoutKind,
  readShowcaseLayoutFromSearch,
  type ShowcaseGraphLayoutKind,
} from '../graph/showcase-graph-layout-kind.js';
import {
  DEFAULT_SHOWCASE_BLOOM_INTENSITY,
  parseShowcaseBloomIntensity,
  readShowcaseBloomFromSearch,
  type ShowcaseBloomIntensity,
} from '../graph/showcase-bloom-settings.js';
import {
  parseShowcaseFleetFilter,
  readShowcaseFleetFilterFromSearch,
} from '../graph/showcase-fleet-filter.js';
import {
  parsePresentationModeFlag,
  parsePresentationTraceCycleFlag,
  parsePresentationTraceCycleMs,
  readPresentationModeFromSearch,
  readPresentationTraceCycleFromSearch,
  readPresentationTraceCycleMsFromSearch,
} from '../graph/showcase-presentation-mode.js';
import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { consoleDebug } from '../utils/console-debug.js';
import { replaceConsoleSelectionUrl } from './selection-url.js';

function readInitialShowcaseLayout(): ShowcaseGraphLayoutKind {
  if (typeof window === 'undefined') {
    return DEFAULT_SHOWCASE_LAYOUT_KIND;
  }
  return parseShowcaseLayoutKind(readShowcaseLayoutFromSearch(window.location.search) ?? undefined);
}

function readInitialGraphMode(): GraphMode {
  if (typeof window === 'undefined') {
    return buildTimeGraphMode;
  }
  return parseGraphMode(readGraphModeFromSearch(window.location.search) ?? undefined);
}

function readInitialTraceId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return readTraceIdFromSearch(window.location.search);
}

function readInitialShowcaseFleetFilter(): CatalogFleetId | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return parseShowcaseFleetFilter(
    readShowcaseFleetFilterFromSearch(window.location.search) ?? undefined,
  );
}

function readInitialAgentId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return readAgentIdFromSearch(window.location.search);
}

function readInitialShowcaseBloom(): ShowcaseBloomIntensity {
  if (typeof window === 'undefined') {
    return DEFAULT_SHOWCASE_BLOOM_INTENSITY;
  }
  return parseShowcaseBloomIntensity(
    readShowcaseBloomFromSearch(window.location.search) ?? undefined,
  );
}

function readInitialPresentationMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return parsePresentationModeFlag(
    readPresentationModeFromSearch(window.location.search) ?? undefined,
  );
}

function readInitialPresentationTraceCycle(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return parsePresentationTraceCycleFlag(
    readPresentationTraceCycleFromSearch(window.location.search) ?? undefined,
  );
}

function readInitialPresentationTraceCycleMs(): number {
  if (typeof window === 'undefined') {
    return parsePresentationTraceCycleMs(undefined);
  }
  const seconds = readPresentationTraceCycleMsFromSearch(window.location.search);
  if (seconds !== undefined) {
    const parsedSeconds = Number.parseInt(seconds, 10);
    if (Number.isFinite(parsedSeconds) && parsedSeconds >= 5) {
      return parsedSeconds * 1000;
    }
  }
  return parsePresentationTraceCycleMs(undefined);
}

function resolveInitialGraphMode(): GraphMode {
  const mode = readInitialGraphMode();
  if (readInitialPresentationMode() && mode === 'legacy') {
    return 'showcase';
  }
  return mode;
}

export interface ConsoleSelectionState {
  readonly selectedAgentId: string | undefined;
  readonly detailAgentId: string | undefined;
  readonly selectedTraceId: string | undefined;
  readonly graphMode: GraphMode;
  /** Showcase 3D layout — force simulation or sphere constellation (Day 38). */
  readonly showcaseLayout: ShowcaseGraphLayoutKind;
  /** Showcase bloom intensity — presentation settings (Day 41). */
  readonly showcaseBloom: ShowcaseBloomIntensity;
  /** Showcase fleet filter — dims other fleets in 3D (Day 42). */
  readonly showcaseFleetFilter: CatalogFleetId | null;
  /** Full-screen kiosk / conference presentation mode (Day 43). */
  readonly presentationMode: boolean;
  /** Auto-cycle traces during presentation loops (Day 43). */
  readonly presentationTraceCycle: boolean;
  readonly presentationTraceCycleMs: number;
  /** True when mount URL included `trace_id` (skip auto-select latest). */
  readonly hadUrlTraceOnMount: boolean;
  /** True after user or auto logic picked a trace. */
  readonly autoSelectedTrace: boolean;
  /** Day 16 — when false (default), agent list + graph show trace participants only. */
  readonly showAllRegisteredAgents: boolean;
  readonly syncUrl: boolean;
  selectAgent: (agentId: string) => void;
  setSelectedAgent: (agentId: string) => void;
  clearAgentSelection: () => void;
  openAgentDetail: (agentId: string) => void;
  closeAgentDetail: () => void;
  selectTrace: (traceId: string) => void;
  setSelectedTraceId: (traceId: string | undefined) => void;
  setShowAllRegisteredAgents: (showAll: boolean) => void;
  setGraphMode: (mode: GraphMode) => void;
  setShowcaseLayout: (layout: ShowcaseGraphLayoutKind) => void;
  setShowcaseBloom: (intensity: ShowcaseBloomIntensity) => void;
  setShowcaseFleetFilter: (fleet: CatalogFleetId | null) => void;
  setPresentationMode: (enabled: boolean) => void;
  setPresentationTraceCycle: (enabled: boolean) => void;
  markAutoSelectedTrace: () => void;
  hydrateFromUrl: (search: string) => void;
  setSyncUrl: (enabled: boolean) => void;
}

function pushUrl(state: ConsoleSelectionState, reason: string): void {
  if (!state.syncUrl) {
    consoleDebug('url.skip', { reason, syncUrl: false });
    return;
  }
  consoleDebug('url.push', {
    reason,
    traceId: state.selectedTraceId ?? null,
    agentId: state.selectedAgentId ?? null,
    graphMode: state.graphMode,
  });
  replaceConsoleSelectionUrl({
    traceId: state.selectedTraceId,
    agentId: state.selectedAgentId,
    graphMode: state.graphMode,
    showcaseLayout: state.showcaseLayout,
    showcaseBloom: state.showcaseBloom,
    showcaseFleetFilter: state.showcaseFleetFilter,
    presentationMode: state.presentationMode,
    presentationTraceCycle: state.presentationTraceCycle,
    presentationTraceCycleMs: state.presentationTraceCycleMs,
  });
}

export const useSelectionStore = create<ConsoleSelectionState>((set) => ({
  selectedAgentId: readInitialAgentId(),
  detailAgentId: readInitialAgentId(),
  selectedTraceId: readInitialTraceId(),
  graphMode: resolveInitialGraphMode(),
  showcaseLayout: readInitialShowcaseLayout(),
  showcaseBloom: readInitialShowcaseBloom(),
  showcaseFleetFilter: readInitialShowcaseFleetFilter(),
  presentationMode: readInitialPresentationMode(),
  presentationTraceCycle: readInitialPresentationTraceCycle(),
  presentationTraceCycleMs: readInitialPresentationTraceCycleMs(),
  hadUrlTraceOnMount: readInitialTraceId() !== undefined,
  autoSelectedTrace: false,
  showAllRegisteredAgents: false,
  syncUrl: true,

  selectAgent: (agentId) => {
    set((state) => {
      const nextAgentId = state.selectedAgentId === agentId ? undefined : agentId;
      const next = { ...state, selectedAgentId: nextAgentId };
      pushUrl(next, 'selectAgent');
      return { selectedAgentId: nextAgentId };
    });
  },

  setSelectedAgent: (agentId) => {
    set((state) => {
      if (state.selectedAgentId === agentId) {
        return state;
      }

      const next = { ...state, selectedAgentId: agentId };
      pushUrl(next, 'setSelectedAgent');
      return { selectedAgentId: agentId };
    });
  },

  clearAgentSelection: () => {
    set((state) => {
      const next = { ...state, selectedAgentId: undefined, detailAgentId: undefined };
      pushUrl(next, 'clearAgentSelection');
      return { selectedAgentId: undefined, detailAgentId: undefined };
    });
  },

  openAgentDetail: (agentId) => {
    set({ detailAgentId: agentId });
  },

  closeAgentDetail: () => {
    set({ detailAgentId: undefined });
  },

  selectTrace: (traceId) => {
    set((state) => {
      const next = {
        ...state,
        selectedTraceId: traceId,
        autoSelectedTrace: true,
        showAllRegisteredAgents: false,
      };
      pushUrl(next, 'selectTrace');
      return {
        selectedTraceId: traceId,
        autoSelectedTrace: true,
        showAllRegisteredAgents: false,
      };
    });
  },

  setSelectedTraceId: (traceId) => {
    set((state) => {
      if (state.selectedTraceId === traceId) {
        return state;
      }

      const next = { ...state, selectedTraceId: traceId, showAllRegisteredAgents: false };
      pushUrl(next, 'setSelectedTraceId');
      return { selectedTraceId: traceId, showAllRegisteredAgents: false };
    });
  },

  setShowAllRegisteredAgents: (showAll) => {
    set({ showAllRegisteredAgents: showAll });
  },

  setGraphMode: (mode) => {
    set((state) => {
      if (state.graphMode === mode) {
        return state;
      }
      consoleDebug('graph.modeSwitch', {
        from: state.graphMode,
        to: mode,
        traceId: state.selectedTraceId ?? null,
      });
      const next = { ...state, graphMode: mode };
      pushUrl(next, 'setGraphMode');
      return { graphMode: mode };
    });
  },

  setShowcaseLayout: (layout) => {
    set((state) => {
      if (state.showcaseLayout === layout) {
        return state;
      }
      const next = { ...state, showcaseLayout: layout };
      pushUrl(next, 'setShowcaseLayout');
      return { showcaseLayout: layout };
    });
  },

  setShowcaseBloom: (intensity) => {
    set((state) => {
      if (state.showcaseBloom === intensity) {
        return state;
      }
      const next = { ...state, showcaseBloom: intensity };
      pushUrl(next, 'setShowcaseBloom');
      return { showcaseBloom: intensity };
    });
  },

  setShowcaseFleetFilter: (fleet) => {
    set((state) => {
      if (state.showcaseFleetFilter === fleet) {
        return state;
      }
      const next = { ...state, showcaseFleetFilter: fleet };
      pushUrl(next, 'setShowcaseFleetFilter');
      return { showcaseFleetFilter: fleet };
    });
  },

  setPresentationMode: (enabled) => {
    set((state) => {
      if (state.presentationMode === enabled) {
        return state;
      }

      const nextGraphMode =
        enabled && state.graphMode === 'legacy' ? ('showcase' as const) : state.graphMode;
      const next = {
        ...state,
        presentationMode: enabled,
        graphMode: nextGraphMode,
        selectedAgentId: enabled ? undefined : state.selectedAgentId,
        detailAgentId: enabled ? undefined : state.detailAgentId,
      };
      pushUrl(next, 'setPresentationMode');
      return {
        presentationMode: enabled,
        graphMode: nextGraphMode,
        selectedAgentId: next.selectedAgentId,
        detailAgentId: next.detailAgentId,
      };
    });
  },

  setPresentationTraceCycle: (enabled) => {
    set((state) => {
      if (state.presentationTraceCycle === enabled) {
        return state;
      }
      const next = { ...state, presentationTraceCycle: enabled };
      pushUrl(next, 'setPresentationTraceCycle');
      return { presentationTraceCycle: enabled };
    });
  },

  markAutoSelectedTrace: () => {
    set({ autoSelectedTrace: true });
  },

  hydrateFromUrl: (search) => {
    const traceId = readTraceIdFromSearch(search);
    consoleDebug('url.hydrate', {
      search,
      traceId: traceId ?? null,
      agentId: readAgentIdFromSearch(search) ?? null,
    });
    const agentId = readAgentIdFromSearch(search);
    const presentationMode = parsePresentationModeFlag(
      readPresentationModeFromSearch(search) ?? undefined,
    );
    const graphMode = parseGraphMode(readGraphModeFromSearch(search) ?? undefined);
    set({
      selectedTraceId: traceId,
      selectedAgentId: agentId,
      detailAgentId: agentId,
      graphMode: presentationMode && graphMode === 'legacy' ? 'showcase' : graphMode,
      showcaseLayout: parseShowcaseLayoutKind(readShowcaseLayoutFromSearch(search) ?? undefined),
      showcaseBloom: parseShowcaseBloomIntensity(readShowcaseBloomFromSearch(search) ?? undefined),
      showcaseFleetFilter: parseShowcaseFleetFilter(
        readShowcaseFleetFilterFromSearch(search) ?? undefined,
      ),
      presentationMode,
      presentationTraceCycle: parsePresentationTraceCycleFlag(
        readPresentationTraceCycleFromSearch(search) ?? undefined,
      ),
      presentationTraceCycleMs: (() => {
        const seconds = readPresentationTraceCycleMsFromSearch(search);
        if (seconds !== undefined) {
          const parsedSeconds = Number.parseInt(seconds, 10);
          if (Number.isFinite(parsedSeconds) && parsedSeconds >= 5) {
            return parsedSeconds * 1000;
          }
        }
        return parsePresentationTraceCycleMs(undefined);
      })(),
      autoSelectedTrace: traceId !== undefined,
    });
  },

  setSyncUrl: (enabled) => {
    set({ syncUrl: enabled });
  },
}));

/** Non-reactive read for effects outside React. */
export function getSelectionState(): Pick<
  ConsoleSelectionState,
  | 'selectedTraceId'
  | 'selectedAgentId'
  | 'detailAgentId'
  | 'hadUrlTraceOnMount'
  | 'autoSelectedTrace'
> {
  const state = useSelectionStore.getState();
  return {
    selectedTraceId: state.selectedTraceId,
    selectedAgentId: state.selectedAgentId,
    detailAgentId: state.detailAgentId,
    hadUrlTraceOnMount: state.hadUrlTraceOnMount,
    autoSelectedTrace: state.autoSelectedTrace,
  };
}
