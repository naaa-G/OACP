import type { ShowcaseBloomIntensity } from './showcase-bloom-settings.js';

export type ShowcaseGpuProfile = 'integrated' | 'dedicated' | 'unknown';

const INTEGRATED_GPU_PATTERN =
  /intel|iris|uhd|hd graphics|apple gpu|apple m[0-9]|llvmpipe|swiftshader|mesa/i;

/** Classify GPU from WebGL renderer string (Day 41 perf profile). */
export function detectShowcaseGpuProfile(rendererInfo: string | undefined): ShowcaseGpuProfile {
  if (rendererInfo === undefined || rendererInfo.trim().length === 0) {
    return 'unknown';
  }

  return INTEGRATED_GPU_PATTERN.test(rendererInfo) ? 'integrated' : 'dedicated';
}

export function readWebGlRendererInfo(gl: WebGLRenderingContext): string | undefined {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo === null) {
    return undefined;
  }

  const renderer: unknown = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  return typeof renderer === 'string' ? renderer : undefined;
}

export function resolveDefaultShowcaseBloomIntensity(
  profile: ShowcaseGpuProfile,
): ShowcaseBloomIntensity {
  return profile === 'integrated' ? 'low' : 'medium';
}

/** Downgrade bloom on integrated GPUs to protect 45fps target. */
export function capShowcaseBloomIntensityForGpu(
  intensity: ShowcaseBloomIntensity,
  profile: ShowcaseGpuProfile,
): ShowcaseBloomIntensity {
  if (profile !== 'integrated') {
    return intensity;
  }

  if (intensity === 'high') {
    return 'medium';
  }

  if (intensity === 'medium') {
    return 'low';
  }

  return intensity;
}

export function showcaseGpuProfileLabel(profile: ShowcaseGpuProfile): string {
  switch (profile) {
    case 'integrated':
      return 'Integrated GPU';
    case 'dedicated':
      return 'Dedicated GPU';
    case 'unknown':
      return 'Unknown GPU';
  }
}
