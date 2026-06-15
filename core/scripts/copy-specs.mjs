import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const coreRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoSpecs = join(coreRoot, '..', 'specs');
const target = join(coreRoot, 'schemas');

if (!existsSync(join(repoSpecs, 'oacp.schema.json'))) {
  console.error('Expected specs at', repoSpecs);
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(repoSpecs, target, { recursive: true });

console.log('Copied specs -> core/schemas');
