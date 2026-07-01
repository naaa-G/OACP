import { useSelectionStore } from '../store/selection-store.js';

/** Resolved graph mode from Zustand selection store (URL `?mode=` overrides build default). */
export function useGraphMode() {
  return useSelectionStore((state) => state.graphMode);
}
