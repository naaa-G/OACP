import type { TraceGraphNode } from '@oacp/observability-client';

/** Default ops node diameter — idle agents (Day 30). */
export const OPS_IDLE_NODE_DIAMETER_PX = 40;

/** Trace-active agents render larger for live-run legibility (Day 30). */
export const OPS_ACTIVE_NODE_DIAMETER_PX = 52;

export type OpsGraphNodeVisualState = 'idle' | 'active' | 'selected';

export function isOpsGraphNodeActive(
  agentId: string,
  activeAgentIds: ReadonlySet<string>,
  status: TraceGraphNode['status'],
): boolean {
  switch (status) {
    case 'active':
    case 'error':
      return true;
    case 'idle':
    case 'offline':
      return false;
    default:
      return activeAgentIds.has(agentId);
  }
}

export function opsGraphNodeDiameterPx(isActive: boolean): number {
  return isActive ? OPS_ACTIVE_NODE_DIAMETER_PX : OPS_IDLE_NODE_DIAMETER_PX;
}

export function resolveOpsGraphNodeVisualState({
  isActive,
  isSelected,
}: {
  readonly isActive: boolean;
  readonly isSelected: boolean;
}): OpsGraphNodeVisualState {
  if (isSelected) {
    return 'selected';
  }
  return isActive ? 'active' : 'idle';
}

export function opsGraphNodeStateClassNames(
  state: OpsGraphNodeVisualState,
  styles: {
    readonly idle: string;
    readonly active: string;
    readonly selected: string;
    readonly pulse: string;
  },
): readonly string[] {
  switch (state) {
    case 'selected':
      return [styles.selected];
    case 'active':
      return [styles.active, styles.pulse];
    default:
      return [styles.idle];
  }
}
