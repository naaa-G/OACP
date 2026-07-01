import {
  buildOpsGraphLabelView,
  opsGraphAgentTestId,
  type OpsGraphLabelFields,
  type OpsGraphLabelView,
} from './ops-graph-label.js';

export type ShowcaseGraphLabelView = OpsGraphLabelView;

export function buildShowcaseGraphLabelView(fields: OpsGraphLabelFields): ShowcaseGraphLabelView {
  return buildOpsGraphLabelView(fields);
}

export function showcaseGraphAgentTestId(agentId: string): string {
  return opsGraphAgentTestId(agentId);
}

/** Which showcase labels may render at once (Day 39 — no permanent labels). */
export function resolveShowcaseLabelVisibility({
  agentId,
  hoveredAgentId,
  selectedAgentId,
}: {
  readonly agentId: string;
  readonly hoveredAgentId: string | undefined;
  readonly selectedAgentId: string | undefined;
}): { readonly hover: boolean; readonly pinned: boolean } {
  const pinned = selectedAgentId === agentId;
  const hover = hoveredAgentId === agentId && !pinned;
  return { hover, pinned };
}

export function countVisibleShowcaseLabels(
  nodeIds: readonly string[],
  hoveredAgentId: string | undefined,
  selectedAgentId: string | undefined,
): number {
  let count = 0;
  for (const agentId of nodeIds) {
    const visibility = resolveShowcaseLabelVisibility({
      agentId,
      hoveredAgentId,
      selectedAgentId,
    });
    if (visibility.hover) {
      count += 1;
    }
    if (visibility.pinned) {
      count += 1;
    }
  }
  return count;
}
