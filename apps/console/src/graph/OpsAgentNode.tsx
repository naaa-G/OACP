import { memo } from 'react';

import { Handle, NodeToolbar, Position, type NodeProps } from '@xyflow/react';

import { OpsGraphLabel } from './OpsGraphLabel.js';
import type { OpsGraphLabelView } from './ops-graph-label.js';
import { opsGraphAgentTestId } from './ops-graph-label.js';
import {
  opsGraphNodeStateClassNames,
  resolveOpsGraphNodeVisualState,
} from './ops-graph-node-style.js';
import { useOptionalOpsGraphInteraction } from './OpsGraphInteractionContext.js';
import type { OpsGraphNodeFocusRole } from './ops-graph-focus.js';
import styles from './OpsAgentNode.module.css';

export interface OpsAgentNodeData extends Record<string, unknown> {
  readonly agentId: string;
  readonly labelView: OpsGraphLabelView;
  readonly fleet?: string | undefined;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly isDimmed: boolean;
  readonly isGhost: boolean;
  readonly focusRole: OpsGraphNodeFocusRole;
}

function fleetClassName(fleet: string | undefined): string {
  switch (fleet) {
    case 'mcplab':
      return styles.fleetMcplab ?? '';
    case 'startup-demo':
      return styles.fleetStartup ?? '';
    case 'system':
      return styles.fleetSystem ?? '';
    default:
      return styles.fleetExternal ?? '';
  }
}

function OpsAgentNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as OpsAgentNodeData;
  const interaction = useOptionalOpsGraphInteraction();
  const isHovered = interaction?.hoveredAgentId === nodeData.agentId;
  const isLabelPinned = interaction?.pinnedAgentId === nodeData.agentId;
  const visualState = resolveOpsGraphNodeVisualState({
    isActive: nodeData.isActive,
    isSelected: nodeData.isSelected,
  });
  const stateClasses = opsGraphNodeStateClassNames(visualState, {
    idle: styles.idle ?? '',
    active: styles.active ?? '',
    selected: styles.selected ?? '',
    pulse: styles.pulse ?? '',
  });
  const ghostClass = nodeData.isGhost ? styles.ghost : '';

  const testSuffix = opsGraphAgentTestId(nodeData.agentId);
  const showHoverTooltip = isHovered && !isLabelPinned;
  const showPinnedLabel = isLabelPinned;

  return (
    <>
      {showHoverTooltip ? (
        <NodeToolbar position={Position.Bottom} offset={10} isVisible className={styles.toolbar}>
          <OpsGraphLabel
            label={nodeData.labelView}
            variant="hover"
            testId={`ops-graph-tooltip-${testSuffix}`}
          />
        </NodeToolbar>
      ) : null}
      {showPinnedLabel ? (
        <NodeToolbar position={Position.Bottom} offset={10} isVisible className={styles.toolbar}>
          <OpsGraphLabel
            label={nodeData.labelView}
            variant="pinned"
            testId={`ops-graph-pinned-label-${testSuffix}`}
          />
        </NodeToolbar>
      ) : null}
      <div
        className={`${styles.root} nodrag nopan ${stateClasses.join(' ')} ${ghostClass} ${nodeData.isDimmed ? styles.dimmed : ''} ${fleetClassName(nodeData.fleet)}`}
        data-agent-id={nodeData.agentId}
        data-active={nodeData.isActive ? 'true' : 'false'}
        data-selected={nodeData.isSelected ? 'true' : 'false'}
        data-ghost={nodeData.isGhost ? 'true' : 'false'}
        data-node-visual={nodeData.isGhost ? 'ghost' : visualState}
        data-focus-role={nodeData.focusRole}
        data-label-pinned={isLabelPinned ? 'true' : 'false'}
        aria-label={`${nodeData.labelView.name}, ${nodeData.labelView.role}`}
      >
        <Handle type="target" position={Position.Top} className={styles.handle} />
        <span className={styles.dot} aria-hidden />
        <Handle type="source" position={Position.Bottom} className={styles.handle} />
      </div>
    </>
  );
}

export const OpsAgentNode = memo(OpsAgentNodeComponent);
