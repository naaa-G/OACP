import { shortAgentId } from '@oacp/observability-client';

import { graphModeLabel } from '../config/graph-mode.js';
import type { GraphMode } from '../config/graph-mode.js';
import { listOpsEdgeKindsInGraph, resolveOpsEdgeKindStyle } from '../graph/ops-graph-edge.js';
import type { TraceGraphEdge } from '@oacp/observability-client';
import styles from './OpsGraphLegend.module.css';

export interface OpsGraphLegendProps {
  readonly mode: GraphMode;
  readonly edges: readonly TraceGraphEdge[];
  readonly showGhostLegend?: boolean | undefined;
  readonly selectedAgentId?: string | undefined;
}

/** Ops 2D graph footer legend — idle, active, selection, edge kinds (Day 35). */
export function OpsGraphLegend({
  mode,
  edges,
  showGhostLegend = false,
  selectedAgentId,
}: OpsGraphLegendProps) {
  const opsEdgeKinds = mode === 'ops' ? listOpsEdgeKindsInGraph(edges) : [];

  return (
    <div className={styles.root} data-testid="ops-graph-legend" aria-label="Graph legend">
      <span className={styles.idle} data-testid="ops-graph-legend-idle">
        Idle agent
      </span>
      <span className={styles.active} data-testid="ops-graph-legend-active">
        Active in trace
      </span>
      {mode === 'ops' ? (
        <span className={styles.selected} data-testid="ops-graph-legend-selected">
          Selected
        </span>
      ) : null}
      {showGhostLegend ? (
        <span className={styles.ghost} data-testid="ops-graph-ghost-legend">
          Registry ghost
        </span>
      ) : null}
      {mode === 'ops' ? (
        <span className={styles.edgeKinds} data-testid="ops-graph-edge-legend">
          {opsEdgeKinds.map((kind) => {
            const style = resolveOpsEdgeKindStyle(kind);
            return (
              <span
                key={kind}
                className={styles.edgeKind}
                data-edge-kind={kind}
                data-testid={`ops-graph-legend-edge-${kind}`}
                style={{ ['--ops-edge-legend-color' as string]: style.color }}
              >
                {style.label}
              </span>
            );
          })}
        </span>
      ) : (
        <span className={styles.edgeFallback}>Delegation / subtask edge</span>
      )}
      {selectedAgentId !== undefined ? (
        <span className={styles.focused} data-testid="graph-selected-agent">
          Focused: {shortAgentId(selectedAgentId)}
        </span>
      ) : null}
      {mode !== 'legacy' ? (
        <span className={styles.mode} data-testid="graph-mode-label">
          {graphModeLabel(mode)}
        </span>
      ) : null}
    </div>
  );
}
