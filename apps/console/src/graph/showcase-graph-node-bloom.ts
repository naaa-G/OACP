import * as THREE from 'three';

export const SHOWCASE_NODE_BLOOM_ACTIVE_MULTIPLIER = 2.35;
export const SHOWCASE_NODE_BLOOM_SELECTED_MULTIPLIER = 3.1;
export const SHOWCASE_NODE_BLOOM_HOVER_MULTIPLIER = 2.8;
export const SHOWCASE_EDGE_PULSE_BLOOM_MULTIPLIER = 3.4;
export const SHOWCASE_EDGE_PULSE_BLOOM_COLOR = '#9ed4ff';

/** Lift active node colors above luminance threshold 1 for selective bloom (Day 41). */
export function resolveShowcaseNodeBloomColor({
  baseColor,
  isActive,
  isSelected,
  isHovered,
  bloomEnabled,
}: {
  readonly baseColor: string;
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly bloomEnabled: boolean;
}): THREE.Color {
  const color = new THREE.Color(baseColor);

  if (!bloomEnabled) {
    return color;
  }

  if (isSelected) {
    color.multiplyScalar(SHOWCASE_NODE_BLOOM_SELECTED_MULTIPLIER);
    return color;
  }

  if (isHovered) {
    color.multiplyScalar(SHOWCASE_NODE_BLOOM_HOVER_MULTIPLIER);
    return color;
  }

  if (isActive) {
    color.multiplyScalar(SHOWCASE_NODE_BLOOM_ACTIVE_MULTIPLIER);
  }

  return color;
}

export function resolveShowcaseEdgeBloomColor({
  baseColor,
  isPulsing,
  bloomEnabled,
}: {
  readonly baseColor: string;
  readonly isPulsing: boolean;
  readonly bloomEnabled: boolean;
}): THREE.Color {
  if (!bloomEnabled || !isPulsing) {
    return new THREE.Color(baseColor);
  }

  return new THREE.Color(SHOWCASE_EDGE_PULSE_BLOOM_COLOR).multiplyScalar(
    SHOWCASE_EDGE_PULSE_BLOOM_MULTIPLIER,
  );
}

export function resolveShowcasePulseBloomColor(bloomEnabled: boolean): THREE.Color {
  if (!bloomEnabled) {
    return new THREE.Color(SHOWCASE_EDGE_PULSE_BLOOM_COLOR);
  }

  return new THREE.Color(SHOWCASE_EDGE_PULSE_BLOOM_COLOR).multiplyScalar(
    SHOWCASE_EDGE_PULSE_BLOOM_MULTIPLIER,
  );
}

export function shouldShowcaseNodeBloom({
  isActive,
  isSelected,
  isHovered,
  bloomEnabled,
}: {
  readonly isActive: boolean;
  readonly isSelected: boolean;
  readonly isHovered: boolean;
  readonly bloomEnabled: boolean;
}): boolean {
  return bloomEnabled && (isActive || isSelected || isHovered);
}
