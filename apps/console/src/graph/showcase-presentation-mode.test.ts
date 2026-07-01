import { describe, expect, it } from 'vitest';

import {
  parsePresentationModeFlag,
  parsePresentationTraceCycleFlag,
  parsePresentationTraceCycleMs,
} from './showcase-presentation-mode.js';
import {
  resolveShowcaseOrbitalBands,
  shouldShowShowcaseOrbitalBands,
} from './showcase-orbital-bands-visibility.js';

describe('showcase-presentation-mode', () => {
  it('parses presentation URL flags', () => {
    expect(parsePresentationModeFlag('1')).toBe(true);
    expect(parsePresentationModeFlag('true')).toBe(true);
    expect(parsePresentationModeFlag('0')).toBe(false);
    expect(parsePresentationTraceCycleFlag('yes')).toBe(true);
  });

  it('defaults trace cycle interval to 60 seconds', () => {
    expect(parsePresentationTraceCycleMs(undefined)).toBe(60_000);
    expect(parsePresentationTraceCycleMs('30000')).toBe(30_000);
    expect(parsePresentationTraceCycleMs('2')).toBe(60_000);
  });
});

describe('showcase-orbital-bands-visibility', () => {
  it('hides orbital bands for single-fleet operator views', () => {
    expect(shouldShowShowcaseOrbitalBands(['mcplab'], false)).toBe(false);
    expect(resolveShowcaseOrbitalBands(['mcplab'], false)).toEqual([]);
  });

  it('shows orbital bands for multi-fleet traces', () => {
    expect(shouldShowShowcaseOrbitalBands(['mcplab', 'startup-demo'], false)).toBe(true);
    expect(resolveShowcaseOrbitalBands(['mcplab', 'startup-demo'], false)).toHaveLength(2);
  });

  it('shows orbital bands during presentation even for one fleet', () => {
    expect(shouldShowShowcaseOrbitalBands(['mcplab'], true)).toBe(true);
    expect(resolveShowcaseOrbitalBands(['mcplab'], true)).toHaveLength(1);
  });
});
