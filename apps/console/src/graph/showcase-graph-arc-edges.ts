export const SHOWCASE_ARC_SEGMENTS = 28;
export const SHOWCASE_ARC_ELEVATION = 0.22;

/** Sample a raised great-circle arc between two 3D node positions (Day 38). */
export function sampleShowcaseGreatCircleArc(
  source: readonly [number, number, number],
  target: readonly [number, number, number],
  segments = SHOWCASE_ARC_SEGMENTS,
  arcElevation = SHOWCASE_ARC_ELEVATION,
): readonly (readonly [number, number, number])[] {
  const sx = source[0];
  const sy = source[1];
  const sz = source[2];
  const tx = target[0];
  const ty = target[1];
  const tz = target[2];

  const sourceLength = Math.hypot(sx, sy, sz);
  const targetLength = Math.hypot(tx, ty, tz);

  if (sourceLength <= 1e-6 || targetLength <= 1e-6) {
    return [source, target];
  }

  const sdx = sx / sourceLength;
  const sdy = sy / sourceLength;
  const sdz = sz / sourceLength;
  const tdx = tx / targetLength;
  const tdy = ty / targetLength;
  const tdz = tz / targetLength;

  const dot = Math.min(1, Math.max(-1, sdx * tdx + sdy * tdy + sdz * tdz));
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega);

  const points: (readonly [number, number, number])[] = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const lift = 1 + arcElevation * Math.sin(Math.PI * t);
    const radius = sourceLength + (targetLength - sourceLength) * t;

    if (sinOmega <= 1e-6) {
      points.push([sdx * radius * lift, sdy * radius * lift, sdz * radius * lift]);
      continue;
    }

    const weightA = Math.sin((1 - t) * omega) / sinOmega;
    const weightB = Math.sin(t * omega) / sinOmega;
    const dx = sdx * weightA + tdx * weightB;
    const dy = sdy * weightA + tdy * weightB;
    const dz = sdz * weightA + tdz * weightB;
    points.push([dx * radius * lift, dy * radius * lift, dz * radius * lift]);
  }

  return points;
}

/** Midpoint height above the chord — used to verify arcs clear node surfaces. */
export function showcaseArcMidpointLift(
  pathPoints: readonly (readonly [number, number, number])[],
  source: readonly [number, number, number],
  target: readonly [number, number, number],
): number {
  if (pathPoints.length < 3) {
    return 0;
  }

  const mid = pathPoints[Math.floor(pathPoints.length / 2)];
  if (mid === undefined) {
    return 0;
  }
  const midX = mid[0];
  const midY = mid[1];
  const midZ = mid[2];
  const chordMidX = (source[0] + target[0]) / 2;
  const chordMidY = (source[1] + target[1]) / 2;
  const chordMidZ = (source[2] + target[2]) / 2;

  return Math.hypot(midX - chordMidX, midY - chordMidY, midZ - chordMidZ);
}
