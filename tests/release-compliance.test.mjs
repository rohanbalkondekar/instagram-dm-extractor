import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const manifest = JSON.parse(read('extension/manifest.json'));
const privacy = read('docs/PRIVACY.md');
const chromeListing = read('docs/chrome-web-store-listing.md');
const firefoxListing = read('docs/firefox-amo-listing.md');
const popup = read('extension/popup/popup.html');
const exportTemplate = read('extension/template/chat_export.html');

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.version, '2.4.2');
assert.equal(manifest.name, 'Instagram Chat Downloader & DM Export');
assert.equal(manifest.description, 'Export one Instagram conversation to files created in your browser.');
assert.deepEqual(manifest.permissions, ['scripting', 'storage']);
assert.deepEqual(manifest.host_permissions, ['https://www.instagram.com/*']);
assert.equal(manifest.background.service_worker, 'background.js');

const listingSummary = chromeListing.match(/## Summary\s+([^\n]+)/)?.[1];
assert.equal(listingSummary, manifest.description, 'Chrome summary drifted from the manifest');
assert.match(chromeListing, /PDF, plain text, HTML, CSV, JSON, or Markdown/);
assert.equal(
  (chromeListing.match(/PDF, plain text, HTML, CSV, JSON, or Markdown/g) || []).length,
  1,
  'format list must appear once'
);
assert.ok(
  (chromeListing.match(/\bInstagram\b/gi) || []).length <= 5,
  'Chrome listing repeats Instagram more than five times'
);
assert.match(chromeListing, /optional link to a related extension's Chrome Web Store page/i);

for (const [label, text] of [
  ['privacy policy', privacy],
  ['Firefox listing', firefoxListing],
]) {
  assert.doesNotMatch(text, /does not collect, store, or transmit any personal data/i, `${label} denies local handling`);
  assert.doesNotMatch(text, /at no point does any data leave your browser/i, `${label} denies remote media requests`);
  assert.doesNotMatch(text, /does not integrate with or send data to any third-party services/i, `${label} denies remote media requests`);
}

for (const required of [
  'Personal communications',
  '`csrftoken` and `ds_user_id`',
  '`chrome.storage.local`',
  'Giphy',
  'Limited Use',
  'complies with the Chrome Web Store User Data Policy',
  'does not receive or retain your account or conversation data',
]) {
  assert.match(privacy, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
}

assert.match(popup, /Get Instagrow/);
assert.match(exportTemplate, /Exported with.*Instagrow/s);

function textFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...textFiles(path));
    else if (['.css', '.html', '.js', '.json', '.svg'].includes(extname(entry.name))) files.push(path);
  }
  return files;
}

const remoteCode = /<script[^>]+src\s*=\s*["']\s*https?:\/\/|importScripts\s*\(\s*["']https?:\/\/|\bimport\s*\(\s*["']https?:\/\/|eval\s*\(|new\s+Function\s*\(/i;
for (const file of textFiles(join(root, 'extension'))) {
  assert.doesNotMatch(readFileSync(file, 'utf8'), remoteCode, `remote executable code in ${relative(root, file)}`);
}

console.log('release-compliance: all assertions passed');
