import {
  GRAPH_PNG_EXPORT_HEIGHT,
  GRAPH_PNG_EXPORT_WIDTH,
  canvasToExportPng,
} from './graph-png-export.js';
import type { GraphExportRequest } from './graph-export-api.js';

export async function exportShowcaseCanvasToPng(
  canvas: HTMLCanvasElement | null,
  request?: GraphExportRequest,
): Promise<string | null> {
  if (canvas === null) {
    return null;
  }

  const width = request?.dimensions?.width ?? GRAPH_PNG_EXPORT_WIDTH;
  const height = request?.dimensions?.height ?? GRAPH_PNG_EXPORT_HEIGHT;

  try {
    return await canvasToExportPng(canvas, { width, height });
  } catch {
    return null;
  }
}
