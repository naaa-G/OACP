export const GRAPH_PNG_EXPORT_WIDTH = 1920;
export const GRAPH_PNG_EXPORT_HEIGHT = 1080;

export const GRAPH_PNG_EXPORT_BACKGROUND = '#0b0f14';

export interface GraphPngExportDimensions {
  readonly width: number;
  readonly height: number;
}

export function buildGraphExportFilename(
  mode: 'ops' | 'showcase',
  traceId: string | undefined,
): string {
  const shortTrace = traceId?.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 8) ?? 'trace';
  const stamp = new Date().toISOString().slice(0, 10);
  return `oacp-${mode}-graph-${shortTrace}-${stamp}.png`;
}

export function downloadPngDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

export async function scaleDataUrlToPng(
  dataUrl: string,
  dimensions: GraphPngExportDimensions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext('2d');
      if (context === null) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }

      context.fillStyle = GRAPH_PNG_EXPORT_BACKGROUND;
      context.fillRect(0, 0, dimensions.width, dimensions.height);

      const scale = Math.min(dimensions.width / image.width, dimensions.height / image.height);
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const offsetX = (dimensions.width - drawWidth) / 2;
      const offsetY = (dimensions.height - drawHeight) / 2;
      context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = () => {
      reject(new Error('Failed to decode graph image for export'));
    };
    image.src = dataUrl;
  });
}

export async function canvasToExportPng(
  sourceCanvas: HTMLCanvasElement,
  dimensions: GraphPngExportDimensions,
): Promise<string> {
  const snapshot = sourceCanvas.toDataURL('image/png');
  return scaleDataUrlToPng(snapshot, dimensions);
}
