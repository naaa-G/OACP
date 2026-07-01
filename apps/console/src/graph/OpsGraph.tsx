import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
} from 'react';

import type { TraceGraphEdge, TraceGraphNode, TraceGraphView } from '@oacp/observability-client';
import { shortAgentId } from '@oacp/observability-client';
import {
  Background,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { OpsAgentNode, type OpsAgentNodeData } from './OpsAgentNode.js';
import { OpsDelegationEdge } from './OpsDelegationEdge.js';
import type { OpsDelegationEdgeData } from './OpsDelegationEdge.js';
import { OpsGraphInteractionProvider } from './OpsGraphInteractionContext.js';
import { opsGraphInteractionApi } from './ops-graph-interaction-api.js';
import { graphExportApi } from './graph-export-api.js';
import { exportOpsGraphElementToPng } from './ops-graph-export.js';
import { buildOpsGraphLabelView } from './ops-graph-label.js';
import {
  maxOpsEdgeMessageCount,
  opsGraphEdgeTestId,
  resolveOpsEdgeVisualStyle,
} from './ops-graph-edge.js';
import { isOpsGraphNodeActive, opsGraphNodeDiameterPx } from './ops-graph-node-style.js';
import { layoutOpsTraceGraph } from './ops-graph-layout.js';
import {
  buildOpsGraphFocusScope,
  OPS_GRAPH_FOCUS_DIM_OPACITY,
  resolveOpsGraphEdgeFocusState,
  resolveOpsGraphNodeFocusRole,
} from './ops-graph-focus.js';
import {
  OPS_MINIMAP_BG_COLOR,
  OPS_MINIMAP_MASK_COLOR,
  resolveOpsMiniMapNodeColor,
} from './ops-graph-minimap.js';
import { OpsMiniMapNode } from './OpsMiniMapNode.js';
import {
  fitOpsGraphView,
  OPS_GRAPH_CLICK_PIN_DELAY_MS,
  resetOpsGraphView,
  snapshotOpsViewport,
  type OpsGraphViewportSnapshot,
  zoomOpsGraphToNode,
} from './ops-graph-viewport.js';
import styles from './OpsGraph.module.css';

const nodeTypes = { opsAgent: OpsAgentNode };
const edgeTypes = { opsDelegation: OpsDelegationEdge };

export interface OpsGraphProps {
  readonly graph: TraceGraphView;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly selectedAgentId?: string | undefined;
  readonly onFocusAgent?: ((agentId: string) => void) | undefined;
  readonly onClearFocus?: (() => void) | undefined;
  readonly replayActive?: boolean | undefined;
  readonly ghostAgentIds?: ReadonlySet<string> | undefined;
  /** When false, defer viewport fit until the graph panel is visible (mode switch). */
  readonly active?: boolean | undefined;
}

function useContainerSize<T extends HTMLElement>(
  revision: number,
): {
  readonly ref: RefObject<T | null>;
  readonly width: number;
  readonly height: number;
} {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 640, height: 360 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) {
      return;
    }

    const update = () => {
      const parent = element.parentElement;
      const width = Math.max(parent?.clientWidth ?? 640, 320);
      const height = Math.max(parent?.clientHeight ?? 360, 240);
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
  }, [revision]);

  return { ref, width: size.width, height: size.height };
}

function opsNodeVisualSignature(data: OpsAgentNodeData): string {
  return `${data.focusRole}:${data.isActive}:${data.isSelected}:${data.isDimmed}:${data.isGhost}`;
}

function opsEdgeVisualSignature(data: OpsDelegationEdgeData | undefined): string {
  if (data === undefined) {
    return '';
  }

  return `${data.strokeWidth.toFixed(2)}:${data.opacity.toFixed(2)}`;
}

function opsFlowElementsSignature(nodes: Node[], edges: Edge[]): string {
  const nodePart = nodes
    .map((node) => {
      const data = node.data as OpsAgentNodeData;
      return `${node.id}:${node.position.x.toFixed(1)},${node.position.y.toFixed(1)}:${opsNodeVisualSignature(data)}`;
    })
    .join('|');
  const edgePart = edges
    .map((edge) => {
      const data = edge.data as OpsDelegationEdgeData | undefined;
      return `${edge.id}:${opsEdgeVisualSignature(data)}`;
    })
    .join('|');
  return `${nodePart}::${edgePart}`;
}

function buildFlowElements(
  graph: TraceGraphView,
  layoutWidth: number,
  layoutHeight: number,
  activeAgentIds: ReadonlySet<string>,
  selectedAgentId: string | undefined,
  ghostAgentIds: ReadonlySet<string> = new Set<string>(),
): { nodes: Node[]; edges: Edge[] } {
  const layout = layoutOpsTraceGraph(
    graph,
    layoutWidth,
    layoutHeight,
    activeAgentIds,
    ghostAgentIds,
  );
  const maxMessageCount = maxOpsEdgeMessageCount(graph.edges);
  const focusScope = buildOpsGraphFocusScope(selectedAgentId, graph.edges);

  const nodes: Node[] = graph.nodes.map((node: TraceGraphNode) => {
    const position = layout.positions.get(node.agent_id) ?? { x: 0, y: 0 };
    const isGhost = ghostAgentIds.has(node.agent_id);
    const isActive = !isGhost && isOpsGraphNodeActive(node.agent_id, activeAgentIds, node.status);
    const focusRole = isGhost ? 'none' : resolveOpsGraphNodeFocusRole(node.agent_id, focusScope);
    const isSelected = focusRole === 'focused';
    const isDimmed = focusRole === 'dimmed';
    const displayName = node.name.trim().length > 0 ? node.name : shortAgentId(node.agent_id);

    const data: OpsAgentNodeData = {
      agentId: node.agent_id,
      labelView: buildOpsGraphLabelView({
        agentId: node.agent_id,
        name: displayName,
        role: node.role,
        fleet: node.fleet,
      }),
      fleet: node.fleet,
      isActive,
      isSelected,
      isDimmed,
      isGhost,
      focusRole,
    };

    const diameter = opsGraphNodeDiameterPx(isActive && !isGhost);

    return {
      id: node.agent_id,
      type: 'opsAgent',
      position,
      width: diameter,
      height: diameter,
      initialWidth: diameter,
      initialHeight: diameter,
      measured: { width: diameter, height: diameter },
      zIndex: isGhost ? 0 : 1,
      data,
      ...(focusRole === 'dimmed' ? { style: { opacity: OPS_GRAPH_FOCUS_DIM_OPACITY } } : {}),
      draggable: false,
      selectable: false,
    };
  });

  const edges: Edge[] = graph.edges
    .filter((edge) => !ghostAgentIds.has(edge.from_agent) && !ghostAgentIds.has(edge.to_agent))
    .map((edge: TraceGraphEdge, index: number) => {
      const edgeId = `${edge.from_agent}:${edge.to_agent}:${edge.kind}:${index}`;
      const edgeFocus = resolveOpsGraphEdgeFocusState(edge.from_agent, edge.to_agent, focusScope);
      const visual = resolveOpsEdgeVisualStyle({
        kind: edge.kind,
        messageCount: edge.message_count,
        maxMessageCount,
        touchesSelection: edgeFocus.touchesFocus,
        isDimmed: edgeFocus.isDimmed,
        focusDimmed: focusScope !== undefined && edgeFocus.isDimmed,
      });

      const edgeData: OpsDelegationEdgeData = {
        kind: edge.kind,
        capability: edge.capability,
        messageCount: edge.message_count,
        strokeColor: visual.strokeColor,
        strokeWidth: visual.strokeWidth,
        opacity: visual.opacity,
        kindLabel: visual.kindLabel,
        testId: opsGraphEdgeTestId(edge.from_agent, edge.to_agent, index),
      };

      return {
        id: edgeId,
        source: edge.from_agent,
        target: edge.to_agent,
        type: 'opsDelegation',
        animated: false,
        zIndex: 0,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: visual.strokeColor,
        },
        data: edgeData,
      };
    });

  return { nodes, edges };
}

export function OpsGraph({
  graph,
  activeAgentIds,
  selectedAgentId,
  onFocusAgent,
  onClearFocus,
  replayActive = false,
  ghostAgentIds = new Set<string>(),
  active = true,
}: OpsGraphProps) {
  const revision = graph.nodes.length + graph.edges.length;
  const { ref, width, height } = useContainerSize<HTMLDivElement>(revision);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const baselineViewportRef = useRef<OpsGraphViewportSnapshot | undefined>(undefined);
  const pendingPinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialFitRef = useRef(false);
  const lastTraceIdRef = useRef(graph.trace_id);
  const lastFitSizeRef = useRef({ width: 0, height: 0 });
  const [hoveredAgentId, setHoveredAgentId] = useState<string | undefined>();
  const [pinnedAgentId, setPinnedAgentId] = useState<string | undefined>();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | undefined>();

  useEffect(() => {
    setHoveredAgentId(undefined);
    setPinnedAgentId(undefined);
    setHoveredEdgeId(undefined);
    baselineViewportRef.current = undefined;
    hasInitialFitRef.current = false;
  }, [graph.trace_id]);

  useEffect(() => {
    setPinnedAgentId(selectedAgentId);
  }, [selectedAgentId]);

  useEffect(() => {
    return () => {
      if (pendingPinTimerRef.current !== null) {
        clearTimeout(pendingPinTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedAgentId(undefined);
        onClearFocus?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClearFocus]);

  const handleNodeMouseEnter = useCallback((_: MouseEvent, node: Node) => {
    setHoveredAgentId(node.id);
    setHoveredEdgeId(undefined);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredAgentId(undefined);
  }, []);

  const handleEdgeMouseEnter = useCallback((_: MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
    setHoveredAgentId(undefined);
  }, []);

  const handleEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(undefined);
  }, []);

  const handleEdgeHover = useCallback((edgeId: string | undefined) => {
    setHoveredEdgeId(edgeId);
    if (edgeId !== undefined) {
      setHoveredAgentId(undefined);
    }
  }, []);

  const handlePinLabel = useCallback((agentId: string) => {
    setPinnedAgentId((current) => (current === agentId ? undefined : agentId));
  }, []);

  const cancelPendingPin = useCallback(() => {
    if (pendingPinTimerRef.current !== null) {
      clearTimeout(pendingPinTimerRef.current);
      pendingPinTimerRef.current = null;
    }
  }, []);

  const handleNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      cancelPendingPin();
      onFocusAgent?.(node.id);
      pendingPinTimerRef.current = setTimeout(() => {
        handlePinLabel(node.id);
        pendingPinTimerRef.current = null;
      }, OPS_GRAPH_CLICK_PIN_DELAY_MS);
    },
    [cancelPendingPin, handlePinLabel, onFocusAgent],
  );

  const handleNodeDoubleClick = useCallback(
    (_: MouseEvent, node: Node) => {
      cancelPendingPin();
      const instance = flowRef.current;
      if (instance === null) {
        return;
      }

      const nodeData = node.data as OpsAgentNodeData;
      zoomOpsGraphToNode(instance, node, nodeData.isActive);
    },
    [cancelPendingPin],
  );

  const handleFitView = useCallback(() => {
    const instance = flowRef.current;
    if (instance === null) {
      return;
    }

    fitOpsGraphView(instance);
    window.setTimeout(() => {
      if (flowRef.current !== instance) {
        return;
      }
      baselineViewportRef.current = snapshotOpsViewport(instance.getViewport());
      hasInitialFitRef.current = true;
    }, 220);
  }, []);

  const handleResetView = useCallback(() => {
    const instance = flowRef.current;
    if (instance === null) {
      return;
    }

    resetOpsGraphView(instance, baselineViewportRef.current);
  }, []);

  useLayoutEffect(() => {
    opsGraphInteractionApi.setHoveredEdgeId = (edgeId) => {
      setHoveredEdgeId(edgeId);
      if (edgeId !== undefined) {
        setHoveredAgentId(undefined);
      }
    };
    opsGraphInteractionApi.togglePinLabel = handlePinLabel;
    opsGraphInteractionApi.fitView = handleFitView;
    opsGraphInteractionApi.resetView = handleResetView;
    opsGraphInteractionApi.getViewport = () => flowRef.current?.getViewport();
    opsGraphInteractionApi.zoomToNode = (agentId: string) => {
      const instance = flowRef.current;
      if (instance === null) {
        return;
      }

      const node = instance.getNode(agentId);
      if (node === undefined) {
        return;
      }

      const nodeData = node.data as OpsAgentNodeData;
      zoomOpsGraphToNode(instance, node, nodeData.isActive);
    };
    graphExportApi.exportOpsPng = async (request) => {
      const element = ref.current;
      if (element === null) {
        return null;
      }

      return exportOpsGraphElementToPng(element, request);
    };

    if (import.meta.env.DEV) {
      const win = window as unknown as Record<string, unknown>;
      win['__oacpTestOpsGraph'] = {
        hoverEdge: (edgeId: string | undefined) => {
          opsGraphInteractionApi.setHoveredEdgeId?.(edgeId);
        },
        fitView: () => {
          opsGraphInteractionApi.fitView?.();
        },
        resetView: () => {
          opsGraphInteractionApi.resetView?.();
        },
        getViewport: () => opsGraphInteractionApi.getViewport?.(),
        zoomToNode: (agentId: string) => {
          opsGraphInteractionApi.zoomToNode?.(agentId);
        },
      };
    }

    return () => {
      opsGraphInteractionApi.setHoveredEdgeId = null;
      opsGraphInteractionApi.togglePinLabel = null;
      opsGraphInteractionApi.fitView = null;
      opsGraphInteractionApi.resetView = null;
      opsGraphInteractionApi.getViewport = null;
      opsGraphInteractionApi.zoomToNode = null;
      graphExportApi.exportOpsPng = null;
      if (import.meta.env.DEV) {
        const win = window as unknown as Record<string, unknown>;
        delete win['__oacpTestOpsGraph'];
      }
    };
  }, [handleFitView, handlePinLabel, handleResetView]);

  const interactionValue = useMemo(
    () => ({
      hoveredAgentId,
      pinnedAgentId,
      hoveredEdgeId,
      onPinLabel: handlePinLabel,
      onEdgeHover: handleEdgeHover,
    }),
    [handleEdgeHover, handlePinLabel, hoveredAgentId, hoveredEdgeId, pinnedAgentId],
  );

  const derivedElements = useMemo(
    () => buildFlowElements(graph, width, height, activeAgentIds, selectedAgentId, ghostAgentIds),
    [activeAgentIds, ghostAgentIds, graph, height, selectedAgentId, width],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(derivedElements.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(derivedElements.edges);
  const lastFlowSignatureRef = useRef('');

  useLayoutEffect(() => {
    const signature = opsFlowElementsSignature(derivedElements.nodes, derivedElements.edges);
    if (signature === lastFlowSignatureRef.current) {
      return;
    }

    lastFlowSignatureRef.current = signature;
    setNodes(derivedElements.nodes);
    setEdges(derivedElements.edges);
  }, [derivedElements.edges, derivedElements.nodes, setEdges, setNodes]);

  useLayoutEffect(() => {
    const instance = flowRef.current;
    if (instance === null || nodes.length === 0) {
      return;
    }

    const traceChanged = lastTraceIdRef.current !== graph.trace_id;
    const sizeChanged =
      lastFitSizeRef.current.width !== width || lastFitSizeRef.current.height !== height;

    if (traceChanged) {
      lastTraceIdRef.current = graph.trace_id;
      hasInitialFitRef.current = false;
      baselineViewportRef.current = undefined;
    }

    if (hasInitialFitRef.current && !sizeChanged) {
      return;
    }

    const snapshot = fitOpsGraphView(instance, { duration: 0 });
    baselineViewportRef.current = snapshot;
    hasInitialFitRef.current = true;
    lastFitSizeRef.current = { width, height };
  }, [graph.trace_id, nodes, width, height]);

  if (graph.nodes.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={styles.wrap}
      data-testid="ops-graph"
      data-graph-active={active ? 'true' : 'false'}
      data-focus-active={selectedAgentId !== undefined ? 'true' : 'false'}
      data-replay-active={replayActive ? 'true' : 'false'}
      data-registry-expanded={ghostAgentIds.size > 0 ? 'true' : 'false'}
    >
      <OpsGraphInteractionProvider value={interactionValue}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={(instance) => {
            flowRef.current = instance;
          }}
          onNodeClick={handleNodeClick}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onEdgeMouseEnter={handleEdgeMouseEnter}
          onEdgeMouseLeave={handleEdgeMouseLeave}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable={false}
          elevateEdgesOnSelect={false}
          panOnDrag
          panOnScroll={false}
          zoomOnScroll
          zoomOnDoubleClick={false}
          minZoom={0.15}
          maxZoom={2.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            gap={24}
            size={1}
            color="color-mix(in srgb, var(--oacp-text) 8%, transparent)"
          />
          <MiniMap
            position="bottom-right"
            className={styles.minimap}
            data-export-exclude="true"
            style={{ width: 168, height: 112 }}
            nodeComponent={OpsMiniMapNode}
            nodeColor={resolveOpsMiniMapNodeColor}
            nodeStrokeWidth={2}
            bgColor={OPS_MINIMAP_BG_COLOR}
            maskColor={OPS_MINIMAP_MASK_COLOR}
            pannable
            zoomable
            ariaLabel="Ops graph overview minimap"
          />
        </ReactFlow>
      </OpsGraphInteractionProvider>
    </div>
  );
}
