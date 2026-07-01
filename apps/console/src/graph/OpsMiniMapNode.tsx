import type { MiniMapNodeProps } from '@xyflow/react';

/** Circle minimap glyph matching ops agent nodes (Day 31). */
export function OpsMiniMapNode({ x, y, width, height, color, selected }: MiniMapNodeProps) {
  const radius = Math.max(width, height) / 2;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  return (
    <circle
      className="react-flow__minimap-node"
      cx={centerX}
      cy={centerY}
      r={radius}
      fill={color}
      stroke={selected ? '#3dd6c6' : '#556680'}
      strokeWidth={1.5}
    />
  );
}
