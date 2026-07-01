import { describe, expect, it } from 'vitest';

import { ObservabilityClientError } from './errors.js';
import { formatObservabilityError, resolveConnectionStatus } from './error-messages.js';

describe('formatObservabilityError', () => {
  it('maps network errors to unreachable copy', () => {
    const details = formatObservabilityError(
      new ObservabilityClientError('Network error fetching snapshot: Failed to fetch', {
        status: 0,
      }),
    );
    expect(details.title).toBe('OACP server unreachable');
    expect(details.hint).toContain('Refresh');
  });

  it('maps 401 to authentication copy', () => {
    const details = formatObservabilityError(
      new ObservabilityClientError('Unauthorized', { status: 401 }),
    );
    expect(details.title).toBe('Authentication required');
  });

  it('maps 500 to server error copy', () => {
    const details = formatObservabilityError(
      new ObservabilityClientError('Internal Server Error', { status: 500 }),
    );
    expect(details.title).toBe('OACP server error');
  });
});

describe('resolveConnectionStatus', () => {
  it('returns connected when snapshot loaded', () => {
    expect(
      resolveConnectionStatus({
        isError: false,
        isFetching: false,
        isLoading: false,
        hasSnapshot: true,
      }),
    ).toBe('connected');
  });

  it('returns reconnecting during initial load', () => {
    expect(
      resolveConnectionStatus({
        isError: false,
        isFetching: true,
        isLoading: true,
        hasSnapshot: false,
      }),
    ).toBe('reconnecting');
  });

  it('returns reconnecting when retrying after error', () => {
    expect(
      resolveConnectionStatus({
        isError: true,
        isFetching: true,
        isLoading: false,
        hasSnapshot: false,
      }),
    ).toBe('reconnecting');
  });

  it('returns offline when fetch failed and idle', () => {
    expect(
      resolveConnectionStatus({
        isError: true,
        isFetching: false,
        isLoading: false,
        hasSnapshot: false,
      }),
    ).toBe('offline');
  });
});
