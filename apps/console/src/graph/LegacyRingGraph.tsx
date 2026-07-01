import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { AgentLink, AgentObservabilityRecord } from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';

import { buildRingGraphLayout, ringGraphAgentIds } from './legacy-ring-layout.js';
import styles from './LegacyRingGraph.module.css';

export interface LegacyRingGraphProps {
  readonly agents: readonly AgentObservabilityRecord[];
  readonly agentLinks: readonly AgentLink[];
  readonly activeAgentIds: ReadonlySet<string>;
  readonly selectedAgentId?: string | undefined;
}

function useContainerSize<T extends HTMLElement>(
  layoutRevision: number,
): {
  readonly ref: RefObject<T | null>;
  readonly width: number;
  readonly height: number;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 400, height: 280 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }

    const update = () => {
      const parent = element.parentElement;
      const width = Math.max(parent?.clientWidth ?? 400, 400);
      const height = Math.max(parent?.clientHeight ?? 280, 280);
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.parentElement !== null) {
      observer.observe(element.parentElement);
    }

    return () => {
      observer.disconnect();
    };
  }, [layoutRevision]);

  return { ref, width: size.width, height: size.height };
}

export function LegacyRingGraph({
  agents,
  agentLinks,
  activeAgentIds,
  selectedAgentId,
}: LegacyRingGraphProps) {
  const registeredIds = useMemo(() => agents.map((agent) => agent.id), [agents]);
  const graphAgentIds = useMemo(
    () => ringGraphAgentIds(registeredIds, activeAgentIds),
    [registeredIds, activeAgentIds],
  );

  const { ref, width, height } = useContainerSize<HTMLDivElement>(graphAgentIds.length);

  const layout = useMemo(
    () => buildRingGraphLayout(graphAgentIds, width, height),
    [graphAgentIds, width, height],
  );

  const edgeKey = useMemo(
    () => agentLinks.map((link) => `${link.from_agent}:${link.to_agent}`).join('|'),
    [agentLinks],
  );

  if (graphAgentIds.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className={styles.wrap}>
      <svg
        className={styles.canvas}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={`Delegation graph with ${graphAgentIds.length} agents and ${agentLinks.length} edges`}
        data-testid="legacy-ring-graph"
      >
        <defs>
          <marker
            id="oacp-graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className={styles.arrowHead} />
          </marker>
        </defs>

        {agentLinks.map((link) => {
          const from = layout.positions.get(link.from_agent);
          const to = layout.positions.get(link.to_agent);
          if (from === undefined || to === undefined) {
            return null;
          }

          const touchesSelection =
            selectedAgentId !== undefined &&
            (link.from_agent === selectedAgentId || link.to_agent === selectedAgentId);
          const edgeClass = [
            styles.edge,
            selectedAgentId !== undefined
              ? touchesSelection
                ? styles.edgeSelected
                : styles.edgeDimmed
              : undefined,
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <line
              key={`${link.from_agent}:${link.to_agent}:${link.kind}:${link.capability ?? ''}`}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              className={edgeClass}
              markerEnd="url(#oacp-graph-arrow)"
              data-edge-key={edgeKey}
              data-touches-selection={touchesSelection ? 'true' : 'false'}
            />
          );
        })}

        {graphAgentIds.map((agentId) => {
          const pos = layout.positions.get(agentId);
          if (pos === undefined) {
            return null;
          }

          const isActive = activeAgentIds.has(agentId);
          const isSelected = selectedAgentId === agentId;
          const isDimmed = selectedAgentId !== undefined && !isSelected;
          const radius = isActive ? 28 : 22;
          const nodeClass = isSelected
            ? styles.nodeSelected
            : isDimmed
              ? styles.nodeDimmed
              : isActive
                ? styles.nodeActive
                : styles.nodeIdle;

          return (
            <g
              key={agentId}
              data-agent-id={agentId}
              data-active={isActive ? 'true' : 'false'}
              data-selected={isSelected ? 'true' : 'false'}
            >
              <circle cx={pos.x} cy={pos.y} r={radius} className={nodeClass} />
              <text x={pos.x} y={pos.y + radius + 16} textAnchor="middle" className={styles.label}>
                {shortAgentId(agentId)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
