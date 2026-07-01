import { ObservabilityClientError } from './errors.js';

export interface ObservabilityErrorDetails {
  readonly title: string;
  readonly message: string;
  readonly hint: string;
  readonly status: number;
}

/** Map snapshot client errors to actionable Console copy (Day 14). */
export function formatObservabilityError(error: unknown): ObservabilityErrorDetails {
  if (error instanceof ObservabilityClientError) {
    if (error.status === 0) {
      return {
        title: 'OACP server unreachable',
        message: error.message,
        hint: 'Start OACP (MCPLab Docker on :3001 or `pnpm --filter @oacp/server start`), ensure the Vite proxy target matches, then click Refresh.',
        status: 0,
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        title: 'Authentication required',
        message: error.message,
        hint: 'Provide valid API credentials or configure the server to allow unauthenticated observability in development.',
        status: error.status,
      };
    }

    if (error.status >= 500) {
      return {
        title: 'OACP server error',
        message: error.message,
        hint: 'Check server logs for the snapshot route. Click Refresh after the service recovers.',
        status: error.status,
      };
    }

    if (error.status === 404) {
      return {
        title: 'Observability API not found',
        message: error.message,
        hint: 'Upgrade the OACP server image or enable legacy `/playground/snapshot` fallback (automatic in the client).',
        status: 404,
      };
    }

    return {
      title: 'Failed to load observability snapshot',
      message: error.message,
      hint: 'Verify the OACP server is running and reachable from this browser origin.',
      status: error.status,
    };
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  return {
    title: 'Unexpected error',
    message,
    hint: 'Click Refresh or reload the page. If the problem persists, check the browser console.',
    status: -1,
  };
}

export type ConnectionStatus = 'connected' | 'reconnecting' | 'offline';

export interface ResolveConnectionStatusInput {
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly isLoading: boolean;
  readonly hasSnapshot: boolean;
}

/** Derive header connection badge state from TanStack Query snapshot flags. */
export function resolveConnectionStatus(input: ResolveConnectionStatusInput): ConnectionStatus {
  if (input.isError) {
    if (input.isFetching) {
      return 'reconnecting';
    }
    return 'offline';
  }

  if (input.isFetching && input.isLoading) {
    return 'reconnecting';
  }

  if (input.hasSnapshot) {
    return 'connected';
  }

  if (input.isFetching) {
    return 'reconnecting';
  }

  return 'reconnecting';
}
