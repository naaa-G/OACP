import { toPng } from 'html-to-image';

import {
  GRAPH_PNG_EXPORT_BACKGROUND,
  GRAPH_PNG_EXPORT_HEIGHT,
  GRAPH_PNG_EXPORT_WIDTH,
  scaleDataUrlToPng,
} from './graph-png-export.js';
import type { GraphExportRequest } from './graph-export-api.js';

export async function exportOpsGraphElementToPng(
  element: HTMLElement,
  request?: GraphExportRequest,
): Promise<string | null> {
  const width = request?.dimensions?.width ?? GRAPH_PNG_EXPORT_WIDTH;
  const height = request?.dimensions?.height ?? GRAPH_PNG_EXPORT_HEIGHT;

  try {
    const snapshot = await toPng(element, {
      backgroundColor: GRAPH_PNG_EXPORT_BACKGROUND,
      cacheBust: true,
      pixelRatio: 1,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) {
          return true;
        }

        return node.dataset.exportExclude !== 'true';
      },
    });

    return await scaleDataUrlToPng(snapshot, { width, height });
  } catch {
    return null;
  }
}
