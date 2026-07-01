import type { GraphPngExportDimensions } from './graph-png-export.js';

export interface GraphExportRequest {
  readonly dimensions?: GraphPngExportDimensions | undefined;
}

export type GraphExportHandler = (request?: GraphExportRequest) => Promise<string | null>;

/** Imperative bridge for Ops / Showcase PNG export (Day 44). */
export const graphExportApi = {
  exportOpsPng: null as GraphExportHandler | null,
  exportShowcasePng: null as GraphExportHandler | null,
};

export async function invokeGraphExportHandler(
  handler: GraphExportHandler | null,
  request?: GraphExportRequest,
): Promise<string | null> {
  if (handler === null) {
    return null;
  }

  return handler(request);
}
