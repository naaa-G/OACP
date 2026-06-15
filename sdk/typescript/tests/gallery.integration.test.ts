import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, it } from 'vitest';

const execFileAsync = promisify(execFile);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

async function runGalleryVerify(
  scriptRelative: string,
  extraArgs: readonly string[] = [],
): Promise<void> {
  const examplesDir = join(repoRoot, 'examples');
  await execFileAsync('pnpm', ['exec', 'tsx', scriptRelative, ...extraArgs], {
    cwd: examplesDir,
    shell: true,
    timeout: 120_000,
  });
}

describe('Example gallery (Day 25)', () => {
  it('coding swarm --verify passes', async () => {
    await runGalleryVerify('gallery/coding-swarm/coding-swarm.ts', ['--verify']);
  }, 120_000);

  it('research swarm --verify passes', async () => {
    await runGalleryVerify('gallery/research-swarm/research-swarm.ts', ['--verify']);
  }, 120_000);

  it('bug-finder swarm --verify passes', async () => {
    await runGalleryVerify('gallery/bug-finder-swarm/bug-finder-swarm.ts', ['--verify']);
  }, 120_000);

  it('bug-finder swarm --verify-recovery passes', async () => {
    await runGalleryVerify('gallery/bug-finder-swarm/bug-finder-swarm.ts', ['--verify-recovery']);
  }, 120_000);
});
