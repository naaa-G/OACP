import { resolveConnectionStatus, type ConnectionStatus } from '@oacp/observability-client';

export interface UseConnectionStatusInput {
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly isLoading: boolean;
  readonly hasSnapshot: boolean;
}

export function useConnectionStatus(input: UseConnectionStatusInput): ConnectionStatus {
  return resolveConnectionStatus(input);
}
