declare module 'd3-force-3d' {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
  }

  export interface Force<NodeDatum extends SimulationNodeDatum> {
    (alpha: number): void;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum> {
    restart(): this;
    stop(): this;
    tick(): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<NodeDatum> | undefined;
    force(name: string, force: Force<NodeDatum> | null): this;
    on(typenames: string, listener: null | ((...args: unknown[]) => void)): this;
    numDimensions(): number;
    numDimensions(dimensions: number): this;
  }

  export interface ForceLink<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    links(): SimulationLinkDatum<NodeDatum>[];
    links(links: SimulationLinkDatum<NodeDatum>[]): this;
    id(): (node: NodeDatum, index: number, nodes: NodeDatum[]) => string | number;
    id(id: (node: NodeDatum, index: number, nodes: NodeDatum[]) => string | number): this;
    distance(): number;
    distance(
      distance: number | ((link: SimulationLinkDatum<NodeDatum>, index: number) => number),
    ): this;
    strength(): number;
    strength(
      strength: number | ((link: SimulationLinkDatum<NodeDatum>, index: number) => number),
    ): this;
  }

  export interface ForceManyBody<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    strength(): number;
    strength(
      strength: number | ((node: NodeDatum, index: number, nodes: NodeDatum[]) => number),
    ): this;
  }

  export interface ForceCenter<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
  }

  export interface ForceCollide<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    radius(): number;
    radius(radius: number | ((node: NodeDatum, index: number, nodes: NodeDatum[]) => number)): this;
    strength(): number;
    strength(strength: number): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[],
    numDimensions?: number,
  ): Simulation<NodeDatum>;

  export function forceLink<NodeDatum extends SimulationNodeDatum>(
    links?: SimulationLinkDatum<NodeDatum>[],
  ): ForceLink<NodeDatum>;

  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ForceManyBody<NodeDatum>;

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(
    x?: number,
    y?: number,
    z?: number,
  ): ForceCenter<NodeDatum>;

  export function forceCollide<NodeDatum extends SimulationNodeDatum>(
    radius?: number | ((node: NodeDatum, index: number, nodes: NodeDatum[]) => number),
  ): ForceCollide<NodeDatum>;
}
