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
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ext = join(root, 'extension');
const dist = join(root, 'dist');
const manifest = JSON.parse(readFileSync(join(ext, 'manifest.json'), 'utf8'));
const version = manifest.version;
const fixedTime = new Date('2000-01-01T00:00:00.000Z');
mkdirSync(dist, { recursive: true });

// Firefox (through 142) uses event-page background.scripts, not a service worker.
const firefoxBackground = { scripts: ['background.js'] };

function deterministicFiles(stage, relative = '') {
  const dir = join(stage, relative);
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  for (const entry of entries) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...deterministicFiles(stage, path));
    } else if (entry.isFile()) {
      utimesSync(join(stage, path), fixedTime, fixedTime);
      files.push(path);
    } else {
      throw new Error(`unsupported package entry: ${path}`);
    }
  }

  return files;
}

function build(browser, mutate) {
  const stage = mkdtempSync(join(tmpdir(), `igdm-${browser}-`));
  cpSync(ext, stage, { recursive: true });
  const m = JSON.parse(readFileSync(join(stage, 'manifest.json'), 'utf8'));
  mutate(m);
  writeFileSync(join(stage, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  const out = join(dist, `instagram-dm-extractor-${browser}-${version}.zip`);
  rmSync(out, { force: true });
  const files = deterministicFiles(stage);
  // Fixed times, sorted entries, no platform extras, and store-only compression
  // make the same source tree byte-identical across repeated release builds.
  execFileSync('zip', ['-q', '-X', '-0', out, ...files], {
    cwd: stage,
    env: { ...process.env, TZ: 'UTC' },
  });
  rmSync(stage, { recursive: true, force: true });
  const key = Object.keys(m.background).join('+');
  console.log(`${browser}: ${out}  (background.${key})`);
}

build('chrome', () => {}); // source manifest is already Chrome-shaped
build('firefox', (m) => { m.background = firefoxBackground; });
console.log(`packaged v${version}`);
