import { createContext, useContext, type ReactNode } from 'react';

export interface ObservabilityClientConfig {
  /** API origin prefix. Empty string = same origin (Vite proxy or server-served Console). */
  readonly baseUrl?: string | undefined;
  readonly snapshotPath?: string | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
  /** Shared secret for protected OACP routes (`Authorization: Bearer`). */
  readonly apiKey?: string | undefined;
}

const ObservabilityConfigContext = createContext<ObservabilityClientConfig>({});

export interface ObservabilityProviderProps {
  readonly children: ReactNode;
  readonly config?: ObservabilityClientConfig | undefined;
}

export function ObservabilityProvider({ children, config = {} }: ObservabilityProviderProps) {
  return (
    <ObservabilityConfigContext.Provider value={config}>
      {children}
    </ObservabilityConfigContext.Provider>
  );
}

export function useObservabilityConfig(): ObservabilityClientConfig {
  return useContext(ObservabilityConfigContext);
}
