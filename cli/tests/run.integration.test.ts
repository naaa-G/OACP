import { describe, expect, it } from 'vitest';

import { parseRunCommandArgs, runRunCommand } from '../src/commands/run.js';

describe('oacp run integration (Day 24)', () => {
  it('runs startup team workflow and returns JSON output', async () => {
    const parsed = parseRunCommandArgs([
      'build',
      'habit',
      'tracker',
      '--format',
      'json',
      '--quiet',
    ]);
    expect(parsed).not.toBe('help');
    if (parsed === 'help') {
      return;
    }

    const exitCode = await runRunCommand(parsed);
    expect(exitCode).toBe(0);
  }, 90_000);
});
