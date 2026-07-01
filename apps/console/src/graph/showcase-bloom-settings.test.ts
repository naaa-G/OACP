import { describe, expect, it } from 'vitest';

import {
  parseShowcaseBloomIntensity,
  readShowcaseBloomFromSearch,
  showcaseBloomIntensityLabel,
} from './showcase-bloom-settings.js';

describe('showcase-bloom-settings', () => {
  it('parses bloom intensity from URL search params', () => {
    expect(readShowcaseBloomFromSearch('?mode=showcase&showcase_bloom=high')).toBe('high');
    expect(parseShowcaseBloomIntensity('low')).toBe('low');
    expect(parseShowcaseBloomIntensity('invalid')).toBe('medium');
  });

  it('labels bloom intensity options', () => {
    expect(showcaseBloomIntensityLabel('off')).toBe('Off');
    expect(showcaseBloomIntensityLabel('high')).toBe('High');
  });
});
