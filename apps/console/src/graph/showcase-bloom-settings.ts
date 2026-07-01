export const SHOWCASE_BLOOM_INTENSITY_ORDER = ['off', 'low', 'medium', 'high'] as const;

export type ShowcaseBloomIntensity = (typeof SHOWCASE_BLOOM_INTENSITY_ORDER)[number];

export const DEFAULT_SHOWCASE_BLOOM_INTENSITY: ShowcaseBloomIntensity = 'medium';

export function parseShowcaseBloomIntensity(
  value: string | undefined | null,
): ShowcaseBloomIntensity {
  if (value === undefined || value === null || value.trim().length === 0) {
    return DEFAULT_SHOWCASE_BLOOM_INTENSITY;
  }

  const normalized = value.trim().toLowerCase();
  if ((SHOWCASE_BLOOM_INTENSITY_ORDER as readonly string[]).includes(normalized)) {
    return normalized as ShowcaseBloomIntensity;
  }

  return DEFAULT_SHOWCASE_BLOOM_INTENSITY;
}

export function readShowcaseBloomFromSearch(search: string): string | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  return params.get('showcase_bloom') ?? undefined;
}

export function showcaseBloomIntensityLabel(intensity: ShowcaseBloomIntensity): string {
  switch (intensity) {
    case 'off':
      return 'Off';
    case 'low':
      return 'Low';
    case 'medium':
      return 'Med';
    case 'high':
      return 'High';
  }
}
