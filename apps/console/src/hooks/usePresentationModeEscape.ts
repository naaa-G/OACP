import { useEffect } from 'react';

export interface UsePresentationModeEscapeOptions {
  readonly enabled: boolean;
  readonly onExit: () => void;
}

/** ESC exits presentation mode before other graph keyboard handlers (Day 43). */
export function usePresentationModeEscape({
  enabled,
  onExit,
}: UsePresentationModeEscapeOptions): void {
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onExit();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, onExit]);
}
