export interface ConsoleDebugEntry {
  readonly seq: number;
  readonly atMs: number;
  readonly category: string;
  readonly detail: Record<string, unknown>;
}

const MAX_ENTRIES = 250;
const PERSIST_KEY = 'oacp_console_debug_log';
let seq = 0;
const buffer: ConsoleDebugEntry[] = [];

function restorePersistedBuffer(): void {
  if (typeof sessionStorage === 'undefined' || buffer.length > 0) {
    return;
  }

  try {
    const raw = sessionStorage.getItem(PERSIST_KEY);
    if (raw === null) {
      return;
    }

    const parsed = JSON.parse(raw) as ConsoleDebugEntry[];
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const entry of parsed) {
      if (
        typeof entry === 'object' &&
        typeof entry.seq === 'number' &&
        typeof entry.category === 'string'
      ) {
        buffer.push(entry);
        seq = Math.max(seq, entry.seq);
      }
    }
  } catch {
    // ignore corrupt persisted log
  }
}

function persistBuffer(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(PERSIST_KEY, JSON.stringify(buffer));
  } catch {
    // ignore quota errors
  }
}

declare global {
  interface Window {
    __OACP_CONSOLE_DEBUG__?: {
      readonly enabled: boolean;
      readonly buffer: readonly ConsoleDebugEntry[];
      readonly clear: () => void;
      readonly exportLog: () => readonly ConsoleDebugEntry[];
      readonly lastFetchCauses: () => Readonly<Record<string, unknown>>;
    };
  }
}

let debugHelpers: {
  readonly lastFetchCauses?: () => Readonly<Record<string, unknown>>;
} = {};

/** Attach extra debug helpers (fetch cause registry, etc.). */
export function registerConsoleDebugHelpers(helpers: typeof debugHelpers): void {
  debugHelpers = helpers;
  syncDebugWindow();
}

function syncDebugWindow(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.__OACP_CONSOLE_DEBUG__ = {
    enabled: true,
    buffer,
    clear: clearConsoleDebugBuffer,
    exportLog: () => [...buffer],
    lastFetchCauses: () => debugHelpers.lastFetchCauses?.() ?? {},
  };
}

function readFlag(storage: Storage, key: string): boolean {
  try {
    return storage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/** Enable with `?oacp_debug=1` (persists for tab) or `localStorage.oacp_console_debug=1`. */
export function isConsoleDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oacp_debug') === '1') {
      sessionStorage.setItem('oacp_console_debug', '1');
      return true;
    }
  } catch {
    // ignore
  }

  return (
    readFlag(sessionStorage, 'oacp_console_debug') || readFlag(localStorage, 'oacp_console_debug')
  );
}

export function getConsoleDebugBuffer(): readonly ConsoleDebugEntry[] {
  return buffer;
}

export function clearConsoleDebugBuffer(): void {
  buffer.length = 0;
  try {
    sessionStorage.removeItem(PERSIST_KEY);
  } catch {
    // ignore
  }
}

export function consoleDebug(category: string, detail: Record<string, unknown> = {}): void {
  if (!isConsoleDebugEnabled()) {
    return;
  }

  restorePersistedBuffer();

  const entry: ConsoleDebugEntry = {
    seq: ++seq,
    atMs: Math.round(performance.now()),
    category,
    detail,
  };

  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) {
    buffer.shift();
  }

  window.__OACP_CONSOLE_DEBUG__ = {
    enabled: true,
    buffer,
    clear: clearConsoleDebugBuffer,
    exportLog: () => [...buffer],
    lastFetchCauses: () => debugHelpers.lastFetchCauses?.() ?? {},
  };

  persistBuffer();
  console.log(`[oacp-console:${category}]`, detail);
}

export function logConsoleDebugBoot(): void {
  if (!isConsoleDebugEnabled()) {
    return;
  }

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  consoleDebug('boot', {
    href: window.location.href,
    search: window.location.search,
    navigationType: nav?.type ?? 'unknown',
    userAgent: navigator.userAgent.slice(0, 80),
  });
}
