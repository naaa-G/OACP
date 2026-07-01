import type {
  AgentObservabilityRecord,
  TraceGraphView,
  TraceTimelineEvent,
} from '@oacp/observability-client';
import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import * as THREE from 'three';

import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js';
import { useShowcaseGraphResize } from '../hooks/useShowcaseGraphResize.js';
import { ShowcasePresentationExitHint } from '../components/ShowcasePresentationExitHint.js';
import { useShowcaseEdgePulses } from '../hooks/useShowcaseEdgePulses.js';
import { graphExportApi } from './graph-export-api.js';
import { exportShowcaseCanvasToPng } from './showcase-graph-export.js';
import {
  computeShowcaseBounds,
  showcaseCameraPosition,
  type ShowcaseBounds,
} from './showcase-graph-camera.js';
import { computeShowcaseNodeFocusViewport } from './showcase-graph-camera-focus.js';
import type { ShowcaseForceEdge, ShowcaseForceNode } from './showcase-graph-force.js';
import {
  countShowcaseEdgeStates,
  maxShowcaseEdgeMessageCount,
  resolveShowcaseEdgeVisualStyle,
  type ShowcaseEdgeVisualStyle,
} from './showcase-graph-edge-style.js';
import {
  pulseMatchesShowcaseEdge,
  sampleShowcaseEdgePath,
  showcaseEdgePulseProgress,
  type ShowcaseEdgePulse,
} from './showcase-graph-edge-pulse.js';
import type { ShowcaseGraphLayoutKind } from './showcase-graph-layout-kind.js';
import { layoutShowcaseGraph } from './showcase-graph-layout.js';
import {
  buildShowcaseGraphLabelView,
  countVisibleShowcaseLabels,
  resolveShowcaseLabelVisibility,
  showcaseGraphAgentTestId,
} from './showcase-graph-label.js';
import {
  buildShowcasePlaceholderNodes,
  type ShowcasePlaceholderNode,
} from './showcase-graph-placeholders.js';
import { ShowcaseNodeLabel } from './ShowcaseNodeLabel.js';
import { ShowcaseBackdrop } from './ShowcaseBackdrop.js';
import { ShowcaseBloomEffects } from './ShowcaseBloomEffects.js';
import { ShowcaseFleetLegend } from './ShowcaseFleetLegend.js';
import { ShowcaseFleetOrbitalBands } from './ShowcaseFleetOrbitalBands.js';
import { listShowcaseFleetsInGraph } from './showcase-fleet-bands.js';
import { resolveShowcaseOrbitalBands } from './showcase-orbital-bands-visibility.js';
import {
  SHOWCASE_PRESENTATION_AUTO_ROTATE_IDLE_MS,
  SHOWCASE_PRESENTATION_AUTO_ROTATE_SPEED,
} from './showcase-presentation-mode.js';
import type { ShowcaseBloomIntensity } from './showcase-bloom-settings.js';
import {
  isShowcaseEdgeFleetHighlighted,
  isShowcaseFleetHighlighted,
  resolveShowcaseFleetDimmedNodeOpacity,
  resolveShowcaseFleetDimmedOpacity,
} from './showcase-fleet-filter.js';
import type { CatalogFleetId } from '../utils/fleet-catalog.js';
import { consoleDebug } from '../utils/console-debug.js';
import { resolveShowcaseBloomEffectConfig } from './showcase-graph-bloom.js';
import {
  capShowcaseBloomIntensityForGpu,
  type ShowcaseGpuProfile,
} from './showcase-graph-gpu-profile.js';
import {
  resolveShowcaseEdgeBloomColor,
  resolveShowcaseNodeBloomColor,
  resolveShowcasePulseBloomColor,
} from './showcase-graph-node-bloom.js';
import styles from './ShowcaseGraph.module.css';

export interface ShowcaseGraphProps {
  readonly graph?: TraceGraphView | undefined;
  readonly agents?: readonly AgentObservabilityRecord[] | undefined;
  readonly activeAgentIds?: ReadonlySet<string> | undefined;
  readonly selectedAgentId?: string | undefined;
  readonly layoutKind?: ShowcaseGraphLayoutKind;
  readonly timeline?: readonly TraceTimelineEvent[] | undefined;
  readonly liveEnabled?: boolean | undefined;
  readonly bloomIntensity?: ShowcaseBloomIntensity | undefined;
  readonly fleetFilter?: CatalogFleetId | null | undefined;
  readonly onFleetFilterChange?: ((fleet: CatalogFleetId | null) => void) | undefined;
  readonly presentationMode?: boolean | undefined;
  readonly presentationTraceCycle?: boolean | undefined;
  readonly onGpuProfileDetected?: ((profile: ShowcaseGpuProfile) => void) | undefined;
  readonly onSelectAgent?: ((agentId: string) => void) | undefined;
  readonly onClearFocus?: (() => void) | undefined;
  /** When false, pause the R3F loop but keep the WebGL context alive (mode switch). */
  readonly active?: boolean | undefined;
}

type ShowcaseRenderMode = 'force' | 'sphere' | 'placeholder';

interface ShowcaseGraphLayout {
  readonly mode: ShowcaseRenderMode;
  readonly nodes: readonly (ShowcaseForceNode | ShowcasePlaceholderNode)[];
  readonly edges: readonly ShowcaseForceEdge[];
}

interface ShowcaseViewport {
  readonly cameraPosition: readonly [number, number, number];
  readonly target: readonly [number, number, number];
  readonly minDistance: number;
  readonly maxDistance: number;
}

interface ShowcaseOrbitControls {
  target: THREE.Vector3;
  update: () => void;
}

interface CameraFocusAnimation {
  readonly fromCamera: THREE.Vector3;
  readonly toCamera: THREE.Vector3;
  readonly fromTarget: THREE.Vector3;
  readonly toTarget: THREE.Vector3;
  progress: number;
}

function ShowcaseInteractiveNode({
  node,
  position,
  isSelected,
  hoveredAgentId,
  selectedAgentId,
  bloomEnabled,
  fleetFilter,
  onHover,
  onSelect,
}: {
  readonly node: ShowcaseForceNode | ShowcasePlaceholderNode;
  readonly position: readonly [number, number, number];
  readonly isSelected: boolean;
  readonly hoveredAgentId: string | undefined;
  readonly selectedAgentId: string | undefined;
  readonly bloomEnabled: boolean;
  readonly fleetFilter: CatalogFleetId | null;
  readonly onHover: (agentId: string | undefined) => void;
  readonly onSelect: (agentId: string) => void;
}) {
  const label = useMemo(
    () =>
      buildShowcaseGraphLabelView({
        agentId: node.agentId,
        name: node.label,
        fleet: 'fleet' in node ? node.fleet : undefined,
        role: 'role' in node ? node.role : undefined,
      }),
    [node],
  );
  const testIdSuffix = showcaseGraphAgentTestId(node.agentId);
  const visibility = resolveShowcaseLabelVisibility({
    agentId: node.agentId,
    hoveredAgentId,
    selectedAgentId,
  });
  const scale = isSelected ? 1.08 : 1;
  const isActive = 'isActive' in node ? node.isActive : false;
  const isHovered = hoveredAgentId === node.agentId;
  const fleet = 'fleet' in node ? node.fleet : undefined;
  const fleetHighlighted = isShowcaseFleetHighlighted(fleet, fleetFilter);
  const nodeOpacity = resolveShowcaseFleetDimmedNodeOpacity(fleetHighlighted);
  const nodeColor = useMemo(
    () =>
      resolveShowcaseNodeBloomColor({
        baseColor: node.color,
        isActive,
        isSelected,
        isHovered,
        bloomEnabled: bloomEnabled && fleetHighlighted,
      }),
    [bloomEnabled, fleetHighlighted, isActive, isHovered, isSelected, node.color],
  );

  return (
    <group position={position}>
      <mesh
        scale={scale}
        frustumCulled={false}
        userData={{ agentId: node.agentId }}
        onPointerOver={(event) => {
          event.stopPropagation();
          onHover(node.agentId);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHover(undefined);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(node.agentId);
        }}
      >
        <sphereGeometry args={[node.radius, 36, 36]} />
        <meshBasicMaterial
          color={nodeColor}
          toneMapped={false}
          transparent={nodeOpacity < 1}
          opacity={nodeOpacity}
        />
      </mesh>
      {visibility.pinned ? (
        <Html
          position={[0, node.radius + 0.42, 0]}
          center
          distanceFactor={12}
          zIndexRange={[50, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <ShowcaseNodeLabel
            label={label}
            variant="pinned"
            testId={`showcase-graph-label-pinned-${testIdSuffix}`}
          />
        </Html>
      ) : null}
      {visibility.hover ? (
        <Html
          position={[0, node.radius + 0.42, 0]}
          center
          distanceFactor={12}
          zIndexRange={[40, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <ShowcaseNodeLabel
            label={label}
            variant="hover"
            testId={`showcase-graph-label-hover-${testIdSuffix}`}
          />
        </Html>
      ) : null}
    </group>
  );
}

function ShowcaseEdgePulseParticle({
  edge,
  pulse,
  bloomEnabled,
}: {
  readonly edge: ShowcaseForceEdge;
  readonly pulse: ShowcaseEdgePulse;
  readonly bloomEnabled: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = useMemo(() => resolveShowcasePulseBloomColor(bloomEnabled), [bloomEnabled]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (mesh === null) {
      return;
    }

    const progress = showcaseEdgePulseProgress(pulse, performance.now());
    const [x, y, z] = sampleShowcaseEdgePath(edge.pathPoints, progress);
    mesh.position.set(x, y, z);
    mesh.visible = progress < 1;
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <sphereGeometry args={[0.14, 10, 10]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.96}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

function ShowcaseAnimatedEdge({
  edge,
  edgeStyle,
  pulses,
  animateEdges,
  bloomEnabled,
  fleetFilter,
  fromFleet,
  toFleet,
}: {
  readonly edge: ShowcaseForceEdge;
  readonly edgeStyle: ShowcaseEdgeVisualStyle;
  readonly pulses: readonly ShowcaseEdgePulse[];
  readonly animateEdges: boolean;
  readonly bloomEnabled: boolean;
  readonly fleetFilter: CatalogFleetId | null;
  readonly fromFleet: string | undefined;
  readonly toFleet: string | undefined;
}) {
  const isPulsing = pulses.some((pulse) => pulseMatchesShowcaseEdge(pulse, edge));
  const fleetHighlighted = isShowcaseEdgeFleetHighlighted(fromFleet, toFleet, fleetFilter);
  const edgeOpacity = resolveShowcaseFleetDimmedOpacity(fleetHighlighted, edgeStyle.opacity);
  const lineColor = useMemo(
    () =>
      resolveShowcaseEdgeBloomColor({
        baseColor: edgeStyle.color,
        isPulsing,
        bloomEnabled: bloomEnabled && fleetHighlighted,
      }),
    [bloomEnabled, edgeStyle.color, fleetHighlighted, isPulsing],
  );

  const lineObject = useMemo(() => {
    const points = edge.pathPoints.map((point) => new THREE.Vector3(point[0], point[1], point[2]));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: lineColor,
      transparent: true,
      opacity: edgeOpacity,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    line.userData = { edgeShape: edge.edgeShape, edgeState: edgeStyle.state };
    return line;
  }, [edge.edgeShape, edge.pathPoints, edgeOpacity, edgeStyle.state, lineColor]);

  const edgePulses = useMemo(
    () => pulses.filter((pulse) => pulseMatchesShowcaseEdge(pulse, edge)),
    [edge, pulses],
  );

  return (
    <group>
      <primitive object={lineObject} />
      {animateEdges
        ? edgePulses.map((pulse) => (
            <ShowcaseEdgePulseParticle
              key={pulse.id}
              edge={edge}
              pulse={pulse}
              bloomEnabled={bloomEnabled && fleetHighlighted}
            />
          ))
        : null}
    </group>
  );
}

function ShowcaseCameraFocus({
  focusAgentId,
  nodes,
  controlsRef,
}: {
  readonly focusAgentId: string | undefined;
  readonly nodes: readonly ShowcaseForceNode[];
  readonly controlsRef: RefObject<ShowcaseOrbitControls | null>;
}) {
  const { camera } = useThree();
  const animationRef = useRef<CameraFocusAnimation | null>(null);

  useEffect(() => {
    if (focusAgentId === undefined) {
      animationRef.current = null;
      return;
    }

    const node = nodes.find((entry) => entry.agentId === focusAgentId);
    if (node === undefined) {
      return;
    }

    const viewport = computeShowcaseNodeFocusViewport(node);
    const controls = controlsRef.current;

    animationRef.current = {
      fromCamera: camera.position.clone(),
      toCamera: new THREE.Vector3(...viewport.cameraPosition),
      fromTarget: controls?.target.clone() ?? new THREE.Vector3(),
      toTarget: new THREE.Vector3(...viewport.target),
      progress: 0,
    };
  }, [camera, controlsRef, focusAgentId, nodes]);

  useFrame((_, delta) => {
    const animation = animationRef.current;
    if (animation === null || animation.progress >= 1) {
      return;
    }

    animation.progress = Math.min(1, animation.progress + delta * 2.6);
    const eased = animation.progress * (2 - animation.progress);
    camera.position.lerpVectors(animation.fromCamera, animation.toCamera, eased);

    const controls = controlsRef.current;
    if (controls !== null) {
      controls.target.lerpVectors(animation.fromTarget, animation.toTarget, eased);
      controls.update();
    }

    if (animation.progress >= 1) {
      animationRef.current = null;
    }
  });

  return null;
}

function resolveShowcaseViewport(
  layout: ShowcaseGraphLayout,
  forceBounds: ShowcaseBounds | undefined,
): ShowcaseViewport {
  if (layout.mode !== 'placeholder' && forceBounds !== undefined) {
    return {
      cameraPosition: showcaseCameraPosition(forceBounds),
      target: forceBounds.center,
      minDistance: Math.max(3, forceBounds.radius * 0.9),
      maxDistance: Math.max(24, forceBounds.radius * 7),
    };
  }

  return {
    cameraPosition: [0, 0, 9],
    target: [0, 0, 0],
    minDistance: 3,
    maxDistance: 24,
  };
}

function ShowcaseGraphScene({
  layout,
  selectedAgentId,
  viewport,
  activeAgentIds,
  maxMessageCount,
  pulses,
  animateEdges,
  bloomEnabled,
  bloomConfig,
  animateStars,
  fleetFilter,
  orbitalBands,
  presentationMode,
  onGpuProfileDetected,
  onSelectAgent,
  onClearFocus,
}: {
  readonly layout: ShowcaseGraphLayout;
  readonly selectedAgentId: string | undefined;
  readonly viewport: ShowcaseViewport;
  readonly activeAgentIds: ReadonlySet<string>;
  readonly maxMessageCount: number;
  readonly pulses: readonly ShowcaseEdgePulse[];
  readonly animateEdges: boolean;
  readonly bloomEnabled: boolean;
  readonly bloomConfig: ReturnType<typeof resolveShowcaseBloomEffectConfig>;
  readonly animateStars: boolean;
  readonly fleetFilter: CatalogFleetId | null;
  readonly orbitalBands: ReturnType<typeof resolveShowcaseOrbitalBands>;
  readonly presentationMode: boolean;
  readonly onGpuProfileDetected?: ((profile: ShowcaseGpuProfile) => void) | undefined;
  readonly onSelectAgent?: ((agentId: string) => void) | undefined;
  readonly onClearFocus?: (() => void) | undefined;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(
    presentationMode && !prefersReducedMotion,
  );
  const autoRotateResumeTimerRef = useRef<number | undefined>(undefined);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | undefined>(undefined);
  const controlsRef = useRef<ShowcaseOrbitControls | null>(null);
  const forceNodes = layout.nodes as ShowcaseForceNode[];
  const nodeFleetById = useMemo(
    () =>
      new Map(layout.nodes.map((node) => [node.agentId, 'fleet' in node ? node.fleet : undefined])),
    [layout.nodes],
  );

  useEffect(() => {
    setAutoRotateEnabled(presentationMode && !prefersReducedMotion);
  }, [presentationMode, prefersReducedMotion]);

  useEffect(
    () => () => {
      if (autoRotateResumeTimerRef.current !== undefined) {
        window.clearTimeout(autoRotateResumeTimerRef.current);
      }
    },
    [],
  );

  const pauseAutoRotate = useCallback(() => {
    if (!presentationMode) {
      return;
    }

    setAutoRotateEnabled(false);
    if (autoRotateResumeTimerRef.current !== undefined) {
      window.clearTimeout(autoRotateResumeTimerRef.current);
    }

    autoRotateResumeTimerRef.current = window.setTimeout(() => {
      if (!prefersReducedMotion) {
        setAutoRotateEnabled(true);
      }
    }, SHOWCASE_PRESENTATION_AUTO_ROTATE_IDLE_MS);
  }, [presentationMode, prefersReducedMotion]);

  const handleSelect = useCallback(
    (agentId: string) => {
      onSelectAgent?.(agentId);
    },
    [onSelectAgent],
  );

  useEffect(() => {
    if (presentationMode) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHoveredAgentId(undefined);
        onClearFocus?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClearFocus, presentationMode]);

  return (
    <>
      <color attach="background" args={['#05080c']} />
      <ambientLight intensity={1} />
      <ShowcaseBackdrop animateStars={animateStars} />
      {orbitalBands.length > 0 ? <ShowcaseFleetOrbitalBands bands={orbitalBands} /> : null}
      {layout.edges.map((edge) => {
        const isPulsing = pulses.some((pulse) => pulseMatchesShowcaseEdge(pulse, edge));
        const edgeStyle = resolveShowcaseEdgeVisualStyle({
          kind: edge.kind,
          messageCount: edge.messageCount,
          maxMessageCount,
          fromAgent: edge.fromAgent,
          toAgent: edge.toAgent,
          activeAgentIds,
          edgeShape: edge.edgeShape,
          isPulsing,
        });

        return (
          <ShowcaseAnimatedEdge
            key={`${edge.fromAgent}-${edge.toAgent}-${edge.kind}`}
            edge={edge}
            edgeStyle={edgeStyle}
            pulses={pulses}
            animateEdges={animateEdges}
            bloomEnabled={bloomEnabled}
            fleetFilter={fleetFilter}
            fromFleet={nodeFleetById.get(edge.fromAgent)}
            toFleet={nodeFleetById.get(edge.toAgent)}
          />
        );
      })}
      {layout.nodes.map((node) => {
        const position =
          layout.mode === 'placeholder'
            ? (node as ShowcasePlaceholderNode).position
            : ([
                (node as ShowcaseForceNode).x,
                (node as ShowcaseForceNode).y,
                (node as ShowcaseForceNode).z,
              ] as const);

        return (
          <ShowcaseInteractiveNode
            key={node.agentId}
            node={node}
            position={position}
            isSelected={selectedAgentId === node.agentId}
            hoveredAgentId={hoveredAgentId}
            selectedAgentId={selectedAgentId}
            bloomEnabled={bloomEnabled}
            fleetFilter={fleetFilter}
            onHover={setHoveredAgentId}
            onSelect={handleSelect}
          />
        );
      })}
      <ShowcaseCameraFocus
        focusAgentId={selectedAgentId}
        nodes={forceNodes}
        controlsRef={controlsRef}
      />
      <OrbitControls
        ref={controlsRef as never}
        makeDefault
        enablePan
        enableZoom
        enableRotate
        autoRotate={autoRotateEnabled}
        autoRotateSpeed={SHOWCASE_PRESENTATION_AUTO_ROTATE_SPEED}
        target={viewport.target}
        minDistance={viewport.minDistance}
        maxDistance={viewport.maxDistance}
        onStart={pauseAutoRotate}
      />
      <ShowcaseBloomEffects config={bloomConfig} onGpuProfileDetected={onGpuProfileDetected} />
    </>
  );
}

function resolveShowcaseLayout(
  graph: TraceGraphView | undefined,
  agents: readonly AgentObservabilityRecord[],
  activeAgentIds: ReadonlySet<string>,
  layoutKind: ShowcaseGraphLayoutKind,
): ShowcaseGraphLayout {
  if (graph !== undefined && graph.nodes.length > 0) {
    const graphLayout = layoutShowcaseGraph(graph, activeAgentIds, layoutKind);
    return {
      mode: layoutKind,
      nodes: graphLayout.nodes,
      edges: graphLayout.edges,
    };
  }

  return {
    mode: 'placeholder',
    nodes: buildShowcasePlaceholderNodes(agents, activeAgentIds),
    edges: [],
  };
}

/** Three.js showcase graph — labels, edge animation, bloom (Day 39–41). */
export function ShowcaseGraph({
  graph,
  agents = [],
  activeAgentIds = new Set<string>(),
  selectedAgentId,
  layoutKind = 'force',
  timeline,
  liveEnabled = true,
  bloomIntensity = 'medium',
  fleetFilter = null,
  onFleetFilterChange,
  presentationMode = false,
  presentationTraceCycle = false,
  onGpuProfileDetected,
  onSelectAgent,
  onClearFocus,
  active = true,
}: ShowcaseGraphProps) {
  const activeRef = useRef(active);
  activeRef.current = active;

  const prefersReducedMotion = usePrefersReducedMotion();
  const animateEdges = !prefersReducedMotion;
  const animateStars = !prefersReducedMotion;
  const [gpuProfile, setGpuProfile] = useState<ShowcaseGpuProfile>('unknown');
  const effectiveBloomIntensity = useMemo(
    () => capShowcaseBloomIntensityForGpu(bloomIntensity, gpuProfile),
    [bloomIntensity, gpuProfile],
  );
  const bloomEnabled = effectiveBloomIntensity !== 'off';
  const bloomConfig = useMemo(
    () =>
      resolveShowcaseBloomEffectConfig({
        intensity: effectiveBloomIntensity,
        gpuProfile,
      }),
    [effectiveBloomIntensity, gpuProfile],
  );

  const handleGpuProfileDetected = useCallback(
    (profile: ShowcaseGpuProfile) => {
      setGpuProfile(profile);
      onGpuProfileDetected?.(profile);
    },
    [onGpuProfileDetected],
  );
  const { pulses, pulseTotal } = useShowcaseEdgePulses({
    timeline,
    liveEnabled,
    animateEdges,
    traceId: graph?.trace_id,
  });

  const layout = useMemo(
    () => resolveShowcaseLayout(graph, agents, activeAgentIds, layoutKind),
    [activeAgentIds, agents, graph, layoutKind],
  );

  const maxMessageCount = useMemo(() => maxShowcaseEdgeMessageCount(layout.edges), [layout.edges]);

  const edgeStateCounts = useMemo(
    () => countShowcaseEdgeStates(layout.edges, activeAgentIds),
    [activeAgentIds, layout.edges],
  );

  const fleetsInGraph = useMemo(
    () => listShowcaseFleetsInGraph(graph?.nodes ?? []),
    [graph?.nodes],
  );
  const orbitalBands = useMemo(
    () => resolveShowcaseOrbitalBands(fleetsInGraph, presentationMode),
    [fleetsInGraph, presentationMode],
  );
  const autoRotateActive = presentationMode && !prefersReducedMotion;
  const showcaseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useShowcaseGraphResize(presentationMode);

  useEffect(() => {
    graphExportApi.exportShowcasePng = async (request) =>
      exportShowcaseCanvasToPng(showcaseCanvasRef.current, request);

    const win = window as unknown as Record<string, unknown>;
    win['__OACP_EXPORT_SHOWCASE_PNG__'] = graphExportApi.exportShowcasePng;

    return () => {
      graphExportApi.exportShowcasePng = null;
      delete win['__OACP_EXPORT_SHOWCASE_PNG__'];
    };
  }, []);

  const forceBounds = useMemo(() => {
    if (layout.mode === 'placeholder' || layout.nodes.length === 0) {
      return undefined;
    }
    return computeShowcaseBounds(layout.nodes as ShowcaseForceNode[]);
  }, [layout]);

  const viewport = useMemo(
    () => resolveShowcaseViewport(layout, forceBounds),
    [forceBounds, layout],
  );

  const visibleLabelCount = countVisibleShowcaseLabels(
    layout.nodes.map((node) => node.agentId),
    undefined,
    selectedAgentId,
  );

  const canvasKey =
    graph?.trace_id !== undefined ? `${graph.trace_id}-${layoutKind}` : `placeholder-${layoutKind}`;

  return (
    <div
      className={presentationMode ? `${styles.wrap} ${styles.wrapPresentation}` : styles.wrap}
      data-testid="showcase-graph"
      data-showcase-layout={layout.mode}
      data-showcase-edge-shape={layout.edges[0]?.edgeShape ?? 'none'}
      data-showcase-node-count={layout.nodes.length}
      data-showcase-edge-count={layout.edges.length}
      data-showcase-focused-agent={selectedAgentId ?? ''}
      data-showcase-visible-label-count={visibleLabelCount}
      data-showcase-edge-animation={animateEdges ? 'enabled' : 'static'}
      data-showcase-edge-active-count={edgeStateCounts.active}
      data-showcase-edge-idle-count={edgeStateCounts.idle}
      data-showcase-pulse-count={pulses.length}
      data-showcase-pulse-total={pulseTotal}
      data-showcase-timeline-count={timeline?.length ?? 0}
      data-showcase-bloom={bloomIntensity}
      data-showcase-bloom-effective={effectiveBloomIntensity}
      data-showcase-gpu-profile={gpuProfile}
      data-showcase-backdrop="starfield-hex"
      data-showcase-fleet-count={fleetsInGraph.length}
      data-showcase-fleet-filter={fleetFilter ?? 'all'}
      data-showcase-presentation={presentationMode ? 'enabled' : 'disabled'}
      data-showcase-auto-rotate={autoRotateActive ? 'enabled' : 'disabled'}
      data-showcase-orbital-bands={orbitalBands.length > 0 ? 'visible' : 'hidden'}
      aria-label="Showcase 3D delegation graph"
    >
      {presentationMode ? (
        <ShowcasePresentationExitHint cycleEnabled={presentationTraceCycle} />
      ) : null}
      {!presentationMode && onFleetFilterChange !== undefined ? (
        <ShowcaseFleetLegend
          fleets={fleetsInGraph}
          filterFleet={fleetFilter}
          onFilterFleetChange={onFleetFilterChange}
        />
      ) : null}
      <Suspense fallback={<div className={styles.fallback} role="status" />}>
        <Canvas
          key={`${canvasKey}-${presentationMode ? 'presentation' : 'standard'}`}
          className={styles.canvas}
          frameloop={active ? 'always' : 'never'}
          camera={{
            position: viewport.cameraPosition,
            fov: 42,
            near: 0.1,
            far: 200,
          }}
          gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
          dpr={active ? [1, 2] : 1}
          onCreated={({ gl }) => {
            showcaseCanvasRef.current = gl.domElement;

            const canvas = gl.domElement;
            const onContextLost = (event: Event): void => {
              event.preventDefault();
              consoleDebug('webgl.contextLost', { intentional: !activeRef.current });
            };

            canvas.addEventListener('webglcontextlost', onContextLost, false);

            return () => {
              canvas.removeEventListener('webglcontextlost', onContextLost, false);
            };
          }}
        >
          <ShowcaseGraphScene
            layout={layout}
            selectedAgentId={selectedAgentId}
            viewport={viewport}
            activeAgentIds={activeAgentIds}
            maxMessageCount={maxMessageCount}
            pulses={pulses}
            animateEdges={animateEdges}
            bloomEnabled={bloomEnabled}
            bloomConfig={bloomConfig}
            animateStars={animateStars}
            fleetFilter={fleetFilter}
            orbitalBands={orbitalBands}
            presentationMode={presentationMode}
            onGpuProfileDetected={handleGpuProfileDetected}
            onSelectAgent={onSelectAgent}
            onClearFocus={onClearFocus}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
