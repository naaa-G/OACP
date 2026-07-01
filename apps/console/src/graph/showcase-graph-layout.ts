import type { TraceGraphView } from '@oacp/observability-client';

import type { ShowcaseGraphLayoutKind } from './showcase-graph-layout-kind.js';
import { layoutShowcaseForceGraph } from './showcase-graph-force.js';
import type { ShowcaseForceLayoutResult } from './showcase-graph-force.js';
import { layoutShowcaseSphereGraph } from './showcase-graph-sphere-layout.js';

/** Resolve trace graph into Showcase 3D node positions (Day 37–38). */
export function layoutShowcaseGraph(
  graph: TraceGraphView,
  activeAgentIds: ReadonlySet<string> = new Set<string>(),
  layoutKind: ShowcaseGraphLayoutKind = 'force',
): ShowcaseForceLayoutResult {
  if (layoutKind === 'sphere') {
    return layoutShowcaseSphereGraph(graph, activeAgentIds);
  }

  return layoutShowcaseForceGraph(graph, activeAgentIds);
}
