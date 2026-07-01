import type { AgentObservabilityRecord } from '@oacp/observability-client';

import { showcaseFleetColor, SHOWCASE_FLEET_COLORS } from './showcase-fleet-colors.js';
import { SHOWCASE_RADIUS_ACTIVE_BOOST, SHOWCASE_RADIUS_MIN } from './showcase-graph-node-style.js';

export interface ShowcasePlaceholderNode {
  readonly agentId: string;
  readonly label: string;
  readonly position: readonly [number, number, number];
  readonly radius: number;
  readonly color: string;
  readonly isActive: boolean;
}

const SHOWCASE_ORBIT_RADIUS = 3.2;
const SHOWCASE_NODE_RADIUS = SHOWCASE_RADIUS_MIN;
const SHOWCASE_ACTIVE_RADIUS = SHOWCASE_RADIUS_MIN + SHOWCASE_RADIUS_ACTIVE_BOOST;

/** Placeholder sphere layout when trace graph is unavailable (Day 36 fallback). */
export function buildShowcasePlaceholderNodes(
  agents: readonly AgentObservabilityRecord[],
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
): readonly ShowcasePlaceholderNode[] {
  if (agents.length === 0) {
    return DEFAULT_SHOWCASE_PLACEHOLDER_NODES;
  }

  return agents.map((agent, index) => {
    const angle = (index / agents.length) * Math.PI * 2 - Math.PI / 2;
    const isActive = activeAgentIds.has(agent.id);
    const zWave = Math.sin(angle * 2) * 0.35;

    return {
      agentId: agent.id,
      label: agent.name.trim().length > 0 ? agent.name : agent.id,
      position: [
        Math.cos(angle) * SHOWCASE_ORBIT_RADIUS,
        Math.sin(angle) * SHOWCASE_ORBIT_RADIUS,
        zWave,
      ],
      radius: isActive ? SHOWCASE_ACTIVE_RADIUS : SHOWCASE_NODE_RADIUS,
      color: showcaseFleetColor(agent.fleet),
      isActive,
    };
  });
}

/** Fallback nodes when no snapshot agents are available yet. */
export const DEFAULT_SHOWCASE_PLACEHOLDER_NODES: readonly ShowcasePlaceholderNode[] = [
  {
    agentId: 'agent://placeholder-coordinator',
    label: 'Coordinator',
    position: [0, 1.8, 0],
    radius: SHOWCASE_ACTIVE_RADIUS,
    color: SHOWCASE_FLEET_COLORS.mcplab ?? '#5eead4',
    isActive: true,
  },
  {
    agentId: 'agent://placeholder-worker-a',
    label: 'Worker A',
    position: [-2.2, -0.8, 0.4],
    radius: SHOWCASE_NODE_RADIUS,
    color: SHOWCASE_FLEET_COLORS.mcplab ?? '#5eead4',
    isActive: false,
  },
  {
    agentId: 'agent://placeholder-worker-b',
    label: 'Worker B',
    position: [2.2, -0.8, -0.4],
    radius: SHOWCASE_NODE_RADIUS,
    color: SHOWCASE_FLEET_COLORS.mcplab ?? '#5eead4',
    isActive: false,
  },
  {
    agentId: 'agent://placeholder-reviewer',
    label: 'Reviewer',
    position: [0, -2.1, 0.2],
    radius: SHOWCASE_NODE_RADIUS,
    color: '#6bcf8e',
    isActive: false,
  },
];
