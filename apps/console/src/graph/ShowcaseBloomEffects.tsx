import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useThree } from '@react-three/fiber';
import { KernelSize } from 'postprocessing';
import { useEffect } from 'react';

import type { ShowcaseBloomEffectConfig } from './showcase-graph-bloom.js';
import {
  detectShowcaseGpuProfile,
  readWebGlRendererInfo,
  type ShowcaseGpuProfile,
} from './showcase-graph-gpu-profile.js';

export interface ShowcaseBloomEffectsProps {
  readonly config: ShowcaseBloomEffectConfig;
  readonly onGpuProfileDetected?: ((profile: ShowcaseGpuProfile) => void) | undefined;
}

function ShowcaseBloomPass({ config }: { readonly config: ShowcaseBloomEffectConfig }) {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const height = typeof window !== 'undefined' ? window.innerHeight : 720;

  return (
    <Bloom
      intensity={config.intensity}
      luminanceThreshold={config.luminanceThreshold}
      luminanceSmoothing={config.luminanceSmoothing}
      mipmapBlur={config.mipmapBlur}
      kernelSize={KernelSize.MEDIUM}
      width={Math.max(320, Math.floor(width * config.resolutionScale))}
      height={Math.max(240, Math.floor(height * config.resolutionScale))}
    />
  );
}

/** Unreal-style bloom for active showcase nodes and edge pulses (Day 41). */
export function ShowcaseBloomEffects({ config, onGpuProfileDetected }: ShowcaseBloomEffectsProps) {
  const { gl } = useThree();

  useEffect(() => {
    onGpuProfileDetected?.(detectShowcaseGpuProfile(readWebGlRendererInfo(gl.getContext())));
  }, [gl, onGpuProfileDetected]);

  if (!config.enabled) {
    return null;
  }

  return (
    <EffectComposer multisampling={config.multisampling} enableNormalPass={false}>
      <ShowcaseBloomPass config={config} />
    </EffectComposer>
  );
}
