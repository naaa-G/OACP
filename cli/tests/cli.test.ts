import { describe, expect, it } from 'vitest';

import { parseRunCommandArgs } from '../src/commands/run.js';
import { slugFromPrompt } from '@oacp/server';

describe('oacp CLI (Day 24)', () => {
  it('parseRunCommandArgs collects quoted-style prompt tokens', () => {
    const parsed = parseRunCommandArgs(['build', 'todo', 'app']);
    expect(parsed).not.toBe('help');
    if (parsed !== 'help') {
      expect(parsed.prompt).toBe('build todo app');
    }
  });

  it('parseRunCommandArgs supports --prompt flag', () => {
    const parsed = parseRunCommandArgs(['--prompt', 'build habit tracker', '--format', 'json']);
    expect(parsed).not.toBe('help');
    if (parsed !== 'help') {
      expect(parsed.prompt).toBe('build habit tracker');
      expect(parsed.format).toBe('json');
    }
  });

  it('slugFromPrompt derives todo-list from build todo app', () => {
    expect(slugFromPrompt('build todo app')).toBe('todo-app');
  });
});
