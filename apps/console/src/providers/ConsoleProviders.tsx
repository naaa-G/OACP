import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createObservabilityFetch, ObservabilityProvider } from '@oacp/observability-client';
import { useMemo, useState, type ReactNode } from 'react';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      },
    },
  });
}

export interface ConsoleProvidersProps {
  readonly children: ReactNode;
}

export function ConsoleProviders({ children }: ConsoleProvidersProps) {
  const [queryClient] = useState(createQueryClient);

  const apiBase = import.meta.env.VITE_OACP_API_BASE ?? '';
  const apiKey = import.meta.env.VITE_OACP_API_KEY?.trim() ?? '';
  const observabilityConfig = useMemo(
    () => ({
      baseUrl: apiBase,
      snapshotPath: '/v1/observability/snapshot',
      ...(apiKey.length > 0 ? { apiKey } : {}),
      ...(apiKey.length > 0 ? { fetchImpl: createObservabilityFetch(apiKey) } : {}),
    }),
    [apiBase, apiKey],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ObservabilityProvider config={observabilityConfig}>{children}</ObservabilityProvider>
    </QueryClientProvider>
  );
}
