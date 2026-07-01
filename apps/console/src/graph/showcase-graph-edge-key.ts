/** Stable showcase edge key for pulse routing and React keys. */
export function showcaseGraphEdgeKey(fromAgent: string, toAgent: string, kind: string): string {
  return `${fromAgent}|${toAgent}|${kind}`;
}

export function matchesShowcaseGraphEdgeKey(
  edgeKey: string,
  fromAgent: string,
  toAgent: string,
  kind: string,
): boolean {
  return edgeKey === showcaseGraphEdgeKey(fromAgent, toAgent, kind);
}
