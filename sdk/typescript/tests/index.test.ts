import { describe, expect, it } from 'vitest';

import {
  CORE_VERSION,
  MESSAGE_TYPES,
  PROTOCOL_VERSION,
  SDK_VERSION,
  createMessageBus,
  validateMessage,
} from '../src/index.js';

describe('@oacp/sdk', () => {
  it('re-exports the protocol version from core', () => {
    expect(PROTOCOL_VERSION).toBe('1.0');
  });

  it('re-exports the core package version', () => {
    expect(CORE_VERSION).toBe('1.0.0');
  });

  it('exports an SDK version', () => {
    expect(SDK_VERSION).toBe('0.1.0');
  });

  it('re-exports message type constants', () => {
    const types = MESSAGE_TYPES as { TASK_REQUEST: string };
    expect(types.TASK_REQUEST).toBe('task_request');
  });

  it('re-exports validateMessage from core', () => {
    expect(typeof validateMessage).toBe('function');
  });

  it('re-exports createMessageBus from core', () => {
    expect(typeof createMessageBus).toBe('function');
  });
});
