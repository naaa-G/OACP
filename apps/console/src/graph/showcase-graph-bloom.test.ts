import { describe, expect, it } from 'vitest';

import { resolveShowcaseBloomEffectConfig } from './showcase-graph-bloom.js';
import {
  capShowcaseBloomIntensityForGpu,
  detectShowcaseGpuProfile,
  resolveDefaultShowcaseBloomIntensity,
} from './showcase-graph-gpu-profile.js';

describe('showcase-graph-gpu-profile', () => {
  it('detects integrated GPUs from renderer strings', () => {
    expect(detectShowcaseGpuProfile('Intel(R) UHD Graphics 630')).toBe('integrated');
    expect(detectShowcaseGpuProfile('NVIDIA GeForce RTX 4070')).toBe('dedicated');
  });

  it('caps bloom intensity on integrated GPUs', () => {
    expect(capShowcaseBloomIntensityForGpu('high', 'integrated')).toBe('medium');
    expect(capShowcaseBloomIntensityForGpu('medium', 'integrated')).toBe('low');
    expect(capShowcaseBloomIntensityForGpu('high', 'dedicated')).toBe('high');
  });

  it('defaults bloom lower on integrated GPUs', () => {
    expect(resolveDefaultShowcaseBloomIntensity('integrated')).toBe('low');
    expect(resolveDefaultShowcaseBloomIntensity('dedicated')).toBe('medium');
  });
});

describe('showcase-graph-bloom', () => {
  it('disables bloom pass when intensity is off', () => {
    const config = resolveShowcaseBloomEffectConfig({
      intensity: 'off',
      gpuProfile: 'dedicated',
    });
    expect(config.enabled).toBe(false);
  });

  it('lowers bloom resolution on integrated GPUs', () => {
    const integrated = resolveShowcaseBloomEffectConfig({
      intensity: 'medium',
      gpuProfile: 'integrated',
    });
    const dedicated = resolveShowcaseBloomEffectConfig({
      intensity: 'medium',
      gpuProfile: 'dedicated',
    });

    expect(integrated.resolutionScale).toBeLessThan(dedicated.resolutionScale);
    expect(integrated.multisampling).toBe(0);
    expect(dedicated.multisampling).toBeGreaterThan(0);
  });
});
