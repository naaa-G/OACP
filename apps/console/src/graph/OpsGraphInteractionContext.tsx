import { createContext, useContext, type ReactNode } from 'react';

export interface OpsGraphInteractionContextValue {
  readonly hoveredAgentId?: string | undefined;
  readonly pinnedAgentId?: string | undefined;
  readonly hoveredEdgeId?: string | undefined;
  readonly onPinLabel: (agentId: string) => void;
  readonly onEdgeHover: (edgeId: string | undefined) => void;
}

const OpsGraphInteractionContext = createContext<OpsGraphInteractionContextValue | null>(null);

export function OpsGraphInteractionProvider({
  value,
  children,
}: {
  readonly value: OpsGraphInteractionContextValue;
  readonly children: ReactNode;
}) {
  return (
    <OpsGraphInteractionContext.Provider value={value}>
      {children}
    </OpsGraphInteractionContext.Provider>
  );
}

export function useOpsGraphInteraction(): OpsGraphInteractionContextValue {
  const value = useContext(OpsGraphInteractionContext);
  if (value === null) {
    throw new Error('useOpsGraphInteraction must be used within OpsGraphInteractionProvider');
  }
  return value;
}

/** Optional hook for custom nodes when provider is absent (tests). */
export function useOptionalOpsGraphInteraction(): OpsGraphInteractionContextValue | null {
  return useContext(OpsGraphInteractionContext);
}
