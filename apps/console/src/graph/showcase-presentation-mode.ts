export const DEFAULT_PRESENTATION_TRACE_CYCLE_MS = 60_000;

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

export function parsePresentationModeFlag(value: string | undefined | null): boolean {
  if (value === undefined || value === null || value.trim().length === 0) {
    return false;
  }

  return TRUTHY_VALUES.has(value.trim().toLowerCase());
}

export function parsePresentationTraceCycleFlag(value: string | undefined | null): boolean {
  return parsePresentationModeFlag(value);
}

export function parsePresentationTraceCycleMs(value: string | undefined | null): number {
  if (value === undefined || value === null || value.trim().length === 0) {
    return DEFAULT_PRESENTATION_TRACE_CYCLE_MS;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 5_000) {
    return DEFAULT_PRESENTATION_TRACE_CYCLE_MS;
  }

  return parsed;
}

export function readPresentationModeFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('presentation') ?? undefined;
}

export function readPresentationTraceCycleFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('presentation_cycle') ?? undefined;
}

export function readPresentationTraceCycleMsFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('presentation_cycle_sec') ?? undefined;
}

/** Showcase auto-rotate speed — radians per frame at 60fps baseline. */
export const SHOWCASE_PRESENTATION_AUTO_ROTATE_SPEED = 0.35;

/** Idle delay before re-enabling auto-rotate after user interaction (ms). */
export const SHOWCASE_PRESENTATION_AUTO_ROTATE_IDLE_MS = 12_000;
