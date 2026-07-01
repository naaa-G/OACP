export const SHOWCASE_LAYOUT_KINDS = ['force', 'sphere'] as const;

export type ShowcaseGraphLayoutKind = (typeof SHOWCASE_LAYOUT_KINDS)[number];

export const DEFAULT_SHOWCASE_LAYOUT_KIND: ShowcaseGraphLayoutKind = 'force';

export function parseShowcaseLayoutKind(value: string | undefined): ShowcaseGraphLayoutKind {
  if (value === 'sphere') {
    return 'sphere';
  }
  return DEFAULT_SHOWCASE_LAYOUT_KIND;
}

export function showcaseLayoutKindLabel(kind: ShowcaseGraphLayoutKind): string {
  return kind === 'sphere' ? 'Sphere' : 'Force';
}

export function readShowcaseLayoutFromSearch(search: string): ShowcaseGraphLayoutKind | undefined {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('showcase_layout');
  if (raw === null) {
    return undefined;
  }
  return parseShowcaseLayoutKind(raw);
}
