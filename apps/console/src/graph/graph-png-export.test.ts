import { describe, expect, it } from 'vitest';

import { buildGraphExportFilename } from './graph-png-export.js';

describe('graph-png-export', () => {
  it('builds stable export filenames', () => {
    expect(buildGraphExportFilename('showcase', 'ae8ae735-9794-480c-b445-47c02265215b')).toMatch(
      /^oacp-showcase-graph-ae8ae735-\d{4}-\d{2}-\d{2}\.png$/,
    );
    expect(buildGraphExportFilename('ops', undefined)).toMatch(/^oacp-ops-graph-trace-/);
  });
});
