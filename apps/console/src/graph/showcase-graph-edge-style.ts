import { maxOpsEdgeMessageCount, resolveOpsEdgeKindStyle } from './ops-graph-edge.js';

export const SHOWCASE_EDGE_ACTIVE_ARC_OPACITY = 0.62;
export const SHOWCASE_EDGE_ACTIVE_LINE_OPACITY = 0.46;
export const SHOWCASE_EDGE_IDLE_ARC_OPACITY = 0.2;
export const SHOWCASE_EDGE_IDLE_LINE_OPACITY = 0.16;
export const SHOWCASE_EDGE_PULSE_BOOST_OPACITY = 0.92;

export interface ShowcaseEdgeVisualStyle {
  readonly color: string;
  readonly opacity: number;
  readonly state: 'active' | 'idle';
  readonly kindLabel: string;
}

export function isShowcaseEdgeActive({
  fromAgent,
  toAgent,
  messageCount,
  activeAgentIds,
}: {
  readonly fromAgent: string;
  readonly toAgent: string;
  readonly messageCount: number;
  readonly activeAgentIds: ReadonlySet<string>;
}): boolean {
  if (messageCount <= 0) {
    return false;
  }

  return activeAgentIds.has(fromAgent) || activeAgentIds.has(toAgent);
}

export function resolveShowcaseEdgeVisualStyle({
  kind,
  messageCount,
  maxMessageCount,
  fromAgent,
  toAgent,
  activeAgentIds,
  edgeShape,
  isPulsing = false,
}: {
  readonly kind: string;
  readonly messageCount: number;
  readonly maxMessageCount: number;
  readonly fromAgent: string;
  readonly toAgent: string;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly edgeShape: 'line' | 'arc';
  readonly isPulsing?: boolean;
}): ShowcaseEdgeVisualStyle {
  const kindStyle = resolveOpsEdgeKindStyle(kind);
  const active = isShowcaseEdgeActive({
    fromAgent,
    toAgent,
    messageCount,
    activeAgentIds,
  });

  const baseOpacity =
    edgeShape === 'arc'
      ? active
        ? SHOWCASE_EDGE_ACTIVE_ARC_OPACITY
        : SHOWCASE_EDGE_IDLE_ARC_OPACITY
      : active
        ? SHOWCASE_EDGE_ACTIVE_LINE_OPACITY
        : SHOWCASE_EDGE_IDLE_LINE_OPACITY;

  const volumeBoost =
    maxMessageCount > 1 ? Math.min(0.12, (messageCount / maxMessageCount) * 0.12) : 0;

  const opacity = isPulsing
    ? SHOWCASE_EDGE_PULSE_BOOST_OPACITY
    : Math.min(0.88, baseOpacity + (active ? volumeBoost : 0));

  return {
    color: kindStyle.color,
    opacity,
    state: active ? 'active' : 'idle',
    kindLabel: kindStyle.label,
  };
}

export function countShowcaseEdgeStates(
  edges: readonly {
    readonly fromAgent: string;
    readonly toAgent: string;
    readonly messageCount: number;
  }[],
  activeAgentIds: ReadonlySet<string>,
): { readonly active: number; readonly idle: number } {
  let active = 0;
  let idle = 0;

  for (const edge of edges) {
    if (
      isShowcaseEdgeActive({
        fromAgent: edge.fromAgent,
        toAgent: edge.toAgent,
        messageCount: edge.messageCount,
        activeAgentIds,
      })
    ) {
      active += 1;
    } else {
      idle += 1;
    }
  }

  return { active, idle };
}

export function maxShowcaseEdgeMessageCount(
  edges: readonly { readonly messageCount: number }[],
): number {
  return maxOpsEdgeMessageCount(
    edges.map((edge) => ({
      from_agent: '',
      to_agent: '',
      kind: '',
      message_count: edge.messageCount,
    })),
  );
}
