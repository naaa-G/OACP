import { useCallback, useState } from 'react';

import type { GraphMode } from '../config/graph-mode.js';
import { graphExportApi, invokeGraphExportHandler } from '../graph/graph-export-api.js';
import {
  buildGraphExportFilename,
  downloadPngDataUrl,
  GRAPH_PNG_EXPORT_HEIGHT,
  GRAPH_PNG_EXPORT_WIDTH,
} from '../graph/graph-png-export.js';
import styles from './GraphExportButton.module.css';

export interface GraphExportButtonProps {
  readonly mode: GraphMode;
  readonly traceId: string | undefined;
  readonly disabled?: boolean | undefined;
}

/** Export the active Ops or Showcase graph as a README-ready PNG (Day 44). */
export function GraphExportButton({ mode, traceId, disabled = false }: GraphExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (disabled || isExporting || (mode !== 'ops' && mode !== 'showcase')) {
      return;
    }

    setIsExporting(true);
    try {
      const handler =
        mode === 'ops' ? graphExportApi.exportOpsPng : graphExportApi.exportShowcasePng;
      const dataUrl = await invokeGraphExportHandler(handler, {
        dimensions: {
          width: GRAPH_PNG_EXPORT_WIDTH,
          height: GRAPH_PNG_EXPORT_HEIGHT,
        },
      });

      if (dataUrl === null) {
        return;
      }

      downloadPngDataUrl(dataUrl, buildGraphExportFilename(mode, traceId));
    } finally {
      setIsExporting(false);
    }
  }, [disabled, isExporting, mode, traceId]);

  if (mode !== 'ops' && mode !== 'showcase') {
    return null;
  }

  return (
    <button
      type="button"
      className={styles.button}
      data-testid="graph-export-png"
      data-graph-export-mode={mode}
      aria-label={`Export ${mode} graph as PNG`}
      aria-busy={isExporting}
      disabled={disabled || isExporting}
      title="Download graph PNG (1920×1080)"
      onClick={() => {
        void handleExport();
      }}
    >
      {isExporting ? 'Exporting…' : 'PNG'}
    </button>
  );
}
