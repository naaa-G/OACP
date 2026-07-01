import type { TraceGraphEdge } from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

export const OPS_EDGE_KIND_ORDER = ['subtask', 'delegates', 'responds_to'] as const;

export type OpsEdgeKind = (typeof OPS_EDGE_KIND_ORDER)[number] | (string & {});

export interface OpsEdgeKindStyle {
  readonly color: string;
  readonly label: string;
}

export const OPS_EDGE_KIND_STYLES: Record<string, OpsEdgeKindStyle> = {
  subtask: { color: '#5b9cf5', label: 'Subtask' },
  delegates: { color: '#8eb8ff', label: 'Delegates' },
  responds_to: { color: '#6bcf8e', label: 'Responds to' },
};

const DEFAULT_EDGE_KIND_STYLE: OpsEdgeKindStyle = {
  color: '#4a5f7a',
  label: 'Delegation',
};

export const OPS_EDGE_STROKE_MIN = 1.25;
export const OPS_EDGE_STROKE_MAX = 4;

export interface OpsEdgeVisualStyle {
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly opacity: number;
  readonly kindLabel: string;
}

export function resolveOpsEdgeKindStyle(kind: string): OpsEdgeKindStyle {
  return OPS_EDGE_KIND_STYLES[kind] ?? DEFAULT_EDGE_KIND_STYLE;
}

export function maxOpsEdgeMessageCount(edges: readonly TraceGraphEdge[]): number {
  if (edges.length === 0) {
    return 1;
  }
  return Math.max(1, ...edges.map((edge) => edge.message_count));
}

/** Stroke width scales with relative message volume in the trace. */
export function computeOpsEdgeStrokeWidth(messageCount: number, maxMessageCount: number): number {
  const safeMax = Math.max(1, maxMessageCount);
  const ratio = Math.min(1, Math.max(0, messageCount / safeMax));
  return OPS_EDGE_STROKE_MIN + ratio * (OPS_EDGE_STROKE_MAX - OPS_EDGE_STROKE_MIN);
}

export function resolveOpsEdgeVisualStyle({
  kind,
  messageCount,
  maxMessageCount,
  touchesSelection,
  isDimmed,
  focusDimmed = false,
}: {
  readonly kind: string;
  readonly messageCount: number;
  readonly maxMessageCount: number;
  readonly touchesSelection: boolean;
  readonly isDimmed: boolean;
  readonly focusDimmed?: boolean;
}): OpsEdgeVisualStyle {
  const kindStyle = resolveOpsEdgeKindStyle(kind);
  const strokeWidth = computeOpsEdgeStrokeWidth(messageCount, maxMessageCount);

  if (touchesSelection) {
    return {
      strokeColor: 'var(--oacp-accent)',
      strokeWidth: Math.max(strokeWidth, 2.75),
      opacity: 1,
      kindLabel: kindStyle.label,
    };
  }

  if (isDimmed) {
    return {
      strokeColor: kindStyle.color,
      strokeWidth: Math.max(1, strokeWidth * 0.85),
      opacity: focusDimmed ? 0.2 : 0.28,
      kindLabel: kindStyle.label,
    };
  }

  return {
    strokeColor: kindStyle.color,
    strokeWidth,
    opacity: 1,
    kindLabel: kindStyle.label,
  };
}

export function formatOpsEdgeCapability(capability: string | undefined): string {
  const trimmed = capability?.trim();
  return trimmed !== undefined && trimmed.length > 0 ? trimmed : '—';
}

export function formatOpsEdgeMessageCount(messageCount: number): string {
  return `${messageCount} message${messageCount === 1 ? '' : 's'}`;
}

export function opsGraphEdgeTestId(fromAgent: string, toAgent: string, index: number): string {
  return `ops-graph-edge-${shortAgentId(fromAgent).replace(/[^a-zA-Z0-9-_]/g, '-')}-${shortAgentId(toAgent).replace(/[^a-zA-Z0-9-_]/g, '-')}-${index}`;
}

export function listOpsEdgeKindsInGraph(edges: readonly TraceGraphEdge[]): string[] {
  const kinds = new Set<string>();
  for (const edge of edges) {
    kinds.add(edge.kind);
  }

  const ordered: string[] = OPS_EDGE_KIND_ORDER.filter((kind) => kinds.has(kind));
  for (const kind of kinds) {
    if (!(OPS_EDGE_KIND_ORDER as readonly string[]).includes(kind)) {
      ordered.push(kind);
    }
  }
  return ordered;
}
