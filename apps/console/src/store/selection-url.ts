import { syncSelectionToSearch } from '@oacp/observability-client';

import type { GraphMode } from '../config/graph-mode.js';
import type { ShowcaseGraphLayoutKind } from '../graph/showcase-graph-layout-kind.js';
import type { ShowcaseBloomIntensity } from '../graph/showcase-bloom-settings.js';
import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { consoleDebug } from '../utils/console-debug.js';

/** Replace browser URL query with current Console selection (shareable deep links). */
export function replaceConsoleSelectionUrl(selection: {
  readonly traceId: string | undefined;
  readonly agentId: string | undefined;
  readonly graphMode: GraphMode;
  readonly showcaseLayout: ShowcaseGraphLayoutKind;
  readonly showcaseBloom: ShowcaseBloomIntensity;
  readonly showcaseFleetFilter: CatalogFleetId | null;
  readonly presentationMode: boolean;
  readonly presentationTraceCycle: boolean;
  readonly presentationTraceCycleMs: number;
}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const baseSearch = syncSelectionToSearch(window.location.search, {
    traceId: selection.traceId,
    agentId: selection.agentId,
  });
  const params = new URLSearchParams(baseSearch.startsWith('?') ? baseSearch.slice(1) : baseSearch);
  params.set('mode', selection.graphMode);
  if (selection.graphMode === 'showcase') {
    params.set('showcase_layout', selection.showcaseLayout);
    params.set('showcase_bloom', selection.showcaseBloom);
    if (selection.showcaseFleetFilter !== null) {
      params.set('showcase_fleet', selection.showcaseFleetFilter);
    } else {
      params.delete('showcase_fleet');
    }
  } else {
    params.delete('showcase_layout');
    params.delete('showcase_bloom');
    params.delete('showcase_fleet');
  }

  if (selection.presentationMode) {
    params.set('presentation', '1');
    if (selection.presentationTraceCycle) {
      params.set('presentation_cycle', '1');
    } else {
      params.delete('presentation_cycle');
    }
    if (selection.presentationTraceCycleMs !== 60_000) {
      params.set(
        'presentation_cycle_sec',
        String(Math.round(selection.presentationTraceCycleMs / 1000)),
      );
    } else {
      params.delete('presentation_cycle_sec');
    }
  } else {
    params.delete('presentation');
    params.delete('presentation_cycle');
    params.delete('presentation_cycle_sec');
  }

  const nextSearch = params.toString();
  const normalizedSearch = nextSearch.length > 0 ? `?${nextSearch}` : '';
  const nextUrl = `${window.location.pathname}${normalizedSearch}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    consoleDebug('url.replaceState', {
      from: currentUrl,
      to: nextUrl,
      traceId: selection.traceId ?? null,
      mode: selection.graphMode,
    });
    window.history.replaceState(window.history.state, '', nextUrl);
  }
}
