import type { Node } from '@xyflow/react';

import type { OpsAgentNodeData } from './OpsAgentNode.js';

/** SVG-safe fills — CSS variables and color-mix are unreliable inside MiniMap. */
export function resolveOpsMiniMapNodeColor(node: Node): string {
  const data = node.data as OpsAgentNodeData | undefined;
  if (data?.isGhost === true) {
    return '#4a5568';
  }
  if (data?.focusRole === 'dimmed') {
    return '#3a4454';
  }
  if (data?.focusRole === 'focused' || data?.isSelected === true) {
    return '#3dd6c6';
  }
  if (data?.focusRole === 'neighbor') {
    return '#7dd3c7';
  }
  if (data?.isActive === true) {
    return '#5eead4';
  }
  return '#6b7a90';
}

export const OPS_MINIMAP_BG_COLOR = '#121820';
export const OPS_MINIMAP_MASK_COLOR = 'rgba(11, 15, 20, 0.55)';
