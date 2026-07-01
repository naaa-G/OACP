import { useEffect, useId, useRef, useState } from 'react';

import { shortAgentId } from '@oacp/observability-client';

import { copyTextToClipboard } from '../utils/clipboard.js';
import styles from './AgentRowActions.module.css';

export interface AgentRowActionsProps {
  readonly agentId: string;
  readonly isPinned: boolean;
  readonly canPin: boolean;
  readonly onCopyUri?: (() => void) | undefined;
  readonly onFilterFeed?: (() => void) | undefined;
  readonly onFocusInGraph?: (() => void) | undefined;
  readonly onTogglePin?: (() => void) | undefined;
}

export function AgentRowActions({
  agentId,
  isPinned,
  canPin,
  onCopyUri,
  onFilterFeed,
  onFocusInGraph,
  onTogglePin,
}: AgentRowActionsProps) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  const shortId = shortAgentId(agentId);

  const handleCopyUri = async () => {
    const copied = await copyTextToClipboard(agentId);
    setCopyState(copied ? 'copied' : 'failed');
    onCopyUri?.();
    window.setTimeout(() => {
      setCopyState('idle');
    }, 2000);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={styles.root} data-menu-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        data-testid={`agent-actions-${shortId}`}
        aria-label={`Actions for ${shortId}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        ⋯
      </button>

      {copyState === 'copied' ? (
        <span className={styles.copyFeedback} role="status">
          Copied
        </span>
      ) : null}

      {open ? (
        <menu id={menuId} className={styles.menu} aria-label={`Actions for ${shortId}`}>
          <li>
            <button
              type="button"
              className={styles.menuItem}
              data-testid={`agent-action-copy-uri-${shortId}`}
              onClick={(event) => {
                event.stopPropagation();
                void handleCopyUri();
              }}
            >
              Copy URI
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuItem}
              data-testid={`agent-action-filter-feed-${shortId}`}
              onClick={(event) => {
                event.stopPropagation();
                onFilterFeed?.();
                setOpen(false);
              }}
            >
              Filter feed
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuItem}
              data-testid={`agent-action-focus-graph-${shortId}`}
              onClick={(event) => {
                event.stopPropagation();
                onFocusInGraph?.();
                setOpen(false);
              }}
            >
              Focus in graph
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.menuItem}
              data-testid={`agent-action-pin-${shortId}`}
              disabled={!isPinned && !canPin}
              onClick={(event) => {
                event.stopPropagation();
                onTogglePin?.();
                setOpen(false);
              }}
            >
              {isPinned ? 'Unpin' : canPin ? 'Pin to top' : 'Pin limit reached'}
            </button>
          </li>
        </menu>
      ) : null}
    </div>
  );
}
