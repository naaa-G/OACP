import { useEffect, useState } from 'react';

import {
  getConsoleDebugBuffer,
  isConsoleDebugEnabled,
  type ConsoleDebugEntry,
} from '../utils/console-debug.js';
import styles from './ConsoleDebugPanel.module.css';

const HIGHLIGHT_CATEGORIES = new Set([
  'graph.panelJank',
  'graph.panelState',
  'query.fetchStart',
  'query.fetchDone',
  'query.fetchScheduled',
  'query.invalidate',
  'ui.headerRefresh',
  'page.beforeunload',
  'error.boundary',
]);

function formatEntry(entry: ConsoleDebugEntry): string {
  const detail = Object.keys(entry.detail).length > 0 ? JSON.stringify(entry.detail) : '';
  return `${entry.atMs}ms #${entry.seq} ${entry.category} ${detail}`;
}

function entryClassName(category: string): string {
  const base = styles.line ?? '';
  if (category === 'graph.panelJank') {
    return `${base} ${styles.lineDanger ?? ''}`.trim();
  }
  if (HIGHLIGHT_CATEGORIES.has(category)) {
    return `${base} ${styles.lineHighlight ?? ''}`.trim();
  }
  return base;
}

/** On-screen tail of debug events when `?oacp_debug=1` — complements browser console. */
export function ConsoleDebugPanel() {
  const [entries, setEntries] = useState<readonly ConsoleDebugEntry[]>([]);

  useEffect(() => {
    if (!isConsoleDebugEnabled()) {
      return undefined;
    }

    const tick = (): void => {
      setEntries([...getConsoleDebugBuffer()].slice(-22));
    };

    tick();
    const timer = window.setInterval(tick, 400);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  if (!isConsoleDebugEnabled()) {
    return null;
  }

  return (
    <aside
      className={styles.panel}
      data-testid="console-debug-panel"
      aria-label="Console debug log"
    >
      <header className={styles.header}>
        <strong>Console debug</strong>
        <span className={styles.hint}>
          Watch: query.fetchStart · graph.panelJank · ui.headerRefresh
        </span>
      </header>
      <ol className={styles.list} reversed>
        {entries.map((entry) => (
          <li key={entry.seq} className={entryClassName(entry.category)}>
            {formatEntry(entry)}
          </li>
        ))}
      </ol>
    </aside>
  );
}
