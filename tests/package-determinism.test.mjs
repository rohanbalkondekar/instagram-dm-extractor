import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const chromeZip = join(root, 'dist/instagram-dm-extractor-chrome-2.4.2.zip');
const firefoxZip = join(root, 'dist/instagram-dm-extractor-firefox-2.4.2.zip');

function buildHashes() {
  execFileSync(process.execPath, ['scripts/package.mjs'], { cwd: root, stdio: 'pipe' });
  return [chromeZip, firefoxZip].map((path) =>
    createHash('sha256').update(readFileSync(path)).digest('hex')
  );
}

const first = buildHashes();
const second = buildHashes();
assert.deepEqual(second, first, 'release ZIP hashes changed across identical builds');

console.log(`package-determinism: chrome=${second[0]} firefox=${second[1]}`);
