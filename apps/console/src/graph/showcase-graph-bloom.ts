import type { ShowcaseBloomIntensity } from './showcase-bloom-settings.js';
import type { ShowcaseGpuProfile } from './showcase-graph-gpu-profile.js';

export interface ShowcaseBloomEffectConfig {
  readonly enabled: boolean;
  readonly intensity: number;
  readonly luminanceThreshold: number;
  readonly luminanceSmoothing: number;
  readonly mipmapBlur: boolean;
  readonly resolutionScale: number;
  readonly multisampling: number;
}

const SHOWCASE_BLOOM_BASE: Record<
  ShowcaseBloomIntensity,
  Omit<ShowcaseBloomEffectConfig, 'enabled' | 'multisampling' | 'resolutionScale'>
> = {
  off: {
    intensity: 0,
    luminanceThreshold: 1,
    luminanceSmoothing: 0.02,
    mipmapBlur: false,
  },
  low: {
    intensity: 0.55,
    luminanceThreshold: 1,
    luminanceSmoothing: 0.03,
    mipmapBlur: true,
  },
  medium: {
    intensity: 0.95,
    luminanceThreshold: 1,
    luminanceSmoothing: 0.025,
    mipmapBlur: true,
  },
  high: {
    intensity: 1.35,
    luminanceThreshold: 0.98,
    luminanceSmoothing: 0.02,
    mipmapBlur: true,
  },
};

export function resolveShowcaseBloomEffectConfig({
  intensity,
  gpuProfile,
}: {
  readonly intensity: ShowcaseBloomIntensity;
  readonly gpuProfile: ShowcaseGpuProfile;
}): ShowcaseBloomEffectConfig {
  const base = SHOWCASE_BLOOM_BASE[intensity];
  const enabled = intensity !== 'off';

  const resolutionScale = gpuProfile === 'integrated' ? 0.55 : gpuProfile === 'unknown' ? 0.75 : 1;
  const multisampling = gpuProfile === 'dedicated' ? 4 : 0;

  return {
    enabled,
    intensity: base.intensity,
    luminanceThreshold: base.luminanceThreshold,
    luminanceSmoothing: base.luminanceSmoothing,
    mipmapBlur: base.mipmapBlur,
    resolutionScale,
    multisampling,
  };
}
