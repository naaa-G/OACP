/**
 * Console graph performance budgets (Day 45).
 *
 * CPU layout budgets are enforced in Vitest. Runtime FPS targets are validated
 * manually — see docs/console-performance-budget.md and docs/console-showcase-qa-checklist.md.
 */

/** Typical MCPLab crew trace size used for operator QA and launch demos. */
export const SHOWCASE_MCPLAB_TRACE_NODE_COUNT = 27;

/** Minimum delegation edges expected on a full MCPLab-scale trace graph. */
export const SHOWCASE_MCPLAB_TRACE_MIN_EDGE_COUNT = 20;

/** Ops 2D dagre layout — 100 nodes (Day 35). */
export const OPS_LAYOUT_MS_BUDGET_100 = 500;

/** Showcase 3D force simulation settle time — 30 nodes (Day 37). */
export const SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30 = 3000;

/** Showcase 3D force simulation settle time — 100 nodes (Day 45). */
export const SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100 = 8000;

/** Dedicated GPU — interactive frame rate with bloom medium (Day 41). */
export const SHOWCASE_FPS_TARGET_30_DEDICATED = 60;
export const SHOWCASE_FPS_TARGET_100_DEDICATED = 45;

/** Integrated GPU — bloom auto-capped to low (Day 41). */
export const SHOWCASE_FPS_TARGET_30_INTEGRATED = 45;
export const SHOWCASE_FPS_TARGET_100_INTEGRATED = 30;

export type ShowcaseFpsProfile = 'dedicated' | 'integrated';

export type ShowcaseFpsBudget = {
  nodeCount: 30 | 100;
  profile: ShowcaseFpsProfile;
  minFps: number;
};

/** Runtime FPS targets for manual QA (Chrome Performance / FPS meter). */
export const SHOWCASE_FPS_BUDGETS: readonly ShowcaseFpsBudget[] = [
  { nodeCount: 30, profile: 'dedicated', minFps: SHOWCASE_FPS_TARGET_30_DEDICATED },
  { nodeCount: 30, profile: 'integrated', minFps: SHOWCASE_FPS_TARGET_30_INTEGRATED },
  { nodeCount: 100, profile: 'dedicated', minFps: SHOWCASE_FPS_TARGET_100_DEDICATED },
  { nodeCount: 100, profile: 'integrated', minFps: SHOWCASE_FPS_TARGET_100_INTEGRATED },
];

export function showcaseForceLayoutMsBudget(nodeCount: number): number {
  return nodeCount <= 30 ? SHOWCASE_FORCE_LAYOUT_MS_BUDGET_30 : SHOWCASE_FORCE_LAYOUT_MS_BUDGET_100;
}

export function showcaseFpsBudget(nodeCount: 30 | 100, profile: ShowcaseFpsProfile): number {
  const match = SHOWCASE_FPS_BUDGETS.find(
    (budget) => budget.nodeCount === nodeCount && budget.profile === profile,
  );
  return match?.minFps ?? SHOWCASE_FPS_TARGET_100_INTEGRATED;
}
