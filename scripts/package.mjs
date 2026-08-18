/**
 * Build per-browser zips from extension/.
 * Chrome and Firefox need different MV3 background keys, and shipping both keys
 * makes Chrome log a "'background.scripts' requires manifest version 2" warning.
 * So the source manifest stays Chrome-clean (service_worker only) and the Firefox
 * package swaps in background.scripts. Output: dist/<name>-<browser>-<version>.zip
 *
 * Run: node scripts/package.mjs   (or: npm run package)
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, mkdirSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(root, 'extension');
const dist = join(root, 'dist');
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'));
const version = manifest.version;
mkdirSync(dist, { recursive: true });

// Firefox (through 142) uses event-page background.scripts, not a service worker.
const firefoxBackground = { scripts: ['background.js'] };

function build(browser, mutate) {
  const stage = mkdtempSync(join(tmpdir(), `igdm-${browser}-`));
  cpSync(ext, stage, { recursive: true });
  const m = JSON.parse(readFileSync(join(stage, 'manifest.json'), 'utf8'));
  mutate(m);
  writeFileSync(join(stage, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  const out = join(dist, `instagram-dm-extractor-${browser}-${version}.zip`);
  rmSync(out, { force: true });
  // zip from inside the stage so paths are top-level (store requirement)
  execFileSync('zip', ['-qr', out, '.', '-x', '.*'], { cwd: stage });
  rmSync(stage, { recursive: true, force: true });
  const key = Object.keys(m.background).join('+');
  console.log(`${browser}: ${out}  (background.${key})`);
}

build('chrome', () => {}); // source manifest is already Chrome-shaped
build('firefox', (m) => { m.background = firefoxBackground; });
console.log(`packaged v${version}`);
