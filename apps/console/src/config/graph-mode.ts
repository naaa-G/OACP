/** Graph rendering mode — `legacy` default; `ops` uses React Flow (Day 27). */
export const GRAPH_MODES = ['legacy', 'ops', 'showcase'] as const;

export type GraphMode = (typeof GRAPH_MODES)[number];

const DEFAULT_GRAPH_MODE: GraphMode = 'showcase';

export function parseGraphMode(raw: string | undefined): GraphMode {
  if (raw === 'ops' || raw === 'showcase' || raw === 'legacy') {
    return raw;
  }
  return DEFAULT_GRAPH_MODE;
}

/** Resolved at build time from `VITE_GRAPH_MODE`. */
export const graphMode: GraphMode = parseGraphMode(
  (import.meta as { env?: { VITE_GRAPH_MODE?: string } }).env?.VITE_GRAPH_MODE,
);

export function graphModeLabel(mode: GraphMode): string {
  switch (mode) {
    case 'legacy':
      return 'Legacy ring';
    case 'ops':
      return 'Ops 2D';
    case 'showcase':
      return 'Showcase 3D';
  }
}

/** Read validated graph mode from URL search (`?mode=legacy|ops|showcase`). */
export function readGraphModeFromSearch(search: string): GraphMode | undefined {
  const raw = new URLSearchParams(search).get('mode');
  if (raw === 'ops' || raw === 'showcase' || raw === 'legacy') {
    return raw;
  }
  return undefined;
}
