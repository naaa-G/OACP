import { describe, expect, it } from 'vitest';

import { PACKAGE_VERSION, PROTOCOL_VERSION } from '../src/index.js';

describe('@oacp/core', () => {
  it('exports the active protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('0.1');
  });

  it('exports a semver package version', () => {
    expect(PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
