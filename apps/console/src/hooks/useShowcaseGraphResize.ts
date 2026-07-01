import { useEffect } from 'react';

/** Notify graph canvases / ReactFlow to refit after layout-affecting changes. */
export function useShowcaseGraphResize(active: boolean): void {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 120);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [active]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);
}
