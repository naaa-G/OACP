import { memo } from 'react';

import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

import {
  formatOpsEdgeCapability,
  formatOpsEdgeMessageCount,
  type OpsEdgeKind,
} from './ops-graph-edge.js';
import { useOptionalOpsGraphInteraction } from './OpsGraphInteractionContext.js';
import { opsGraphInteractionApi } from './ops-graph-interaction-api.js';
import styles from './OpsDelegationEdge.module.css';

export interface OpsDelegationEdgeData extends Record<string, unknown> {
  readonly kind: OpsEdgeKind;
  readonly capability?: string | undefined;
  readonly messageCount: number;
  readonly strokeColor: string;
  readonly strokeWidth: number;
  readonly opacity: number;
  readonly kindLabel: string;
  readonly testId: string;
}

function OpsDelegationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as OpsDelegationEdgeData | undefined;
  const interaction = useOptionalOpsGraphInteraction();
  const isHovered = interaction?.hoveredEdgeId === id;

  const setHoveredEdge = (edgeId: string | undefined) => {
    interaction?.onEdgeHover(edgeId);
    opsGraphInteractionApi.setHoveredEdgeId?.(edgeId);
  };
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.28,
  });

  if (edgeData === undefined) {
    return <BaseEdge id={id} path={edgePath} {...(markerEnd !== undefined ? { markerEnd } : {})} />;
  }

  return (
    <>
      <g
        data-testid={edgeData.testId}
        data-edge-kind={edgeData.kind}
        onPointerEnter={() => {
          setHoveredEdge(id);
        }}
        onPointerLeave={() => {
          setHoveredEdge(undefined);
        }}
      >
        <BaseEdge
          id={id}
          path={edgePath}
          {...(markerEnd !== undefined ? { markerEnd } : {})}
          interactionWidth={22}
          className={styles.path}
          style={{
            stroke: edgeData.strokeColor,
            strokeWidth: edgeData.strokeWidth,
            opacity: edgeData.opacity,
          }}
        />
      </g>
      {isHovered ? (
        <EdgeLabelRenderer>
          <div
            className={styles.tooltip}
            data-testid={`${edgeData.testId}-tooltip`}
            role="tooltip"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            <p className={styles.tooltipTitle}>{edgeData.kindLabel}</p>
            <dl className={styles.tooltipMeta}>
              <div className={styles.row}>
                <dt>Capability</dt>
                <dd>{formatOpsEdgeCapability(edgeData.capability)}</dd>
              </div>
              <div className={styles.row}>
                <dt>Messages</dt>
                <dd>{formatOpsEdgeMessageCount(edgeData.messageCount)}</dd>
              </div>
            </dl>
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const OpsDelegationEdge = memo(OpsDelegationEdgeComponent);
