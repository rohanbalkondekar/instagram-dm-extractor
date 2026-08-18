/**
 * Adversarial tests for the HTML export: attacker-controlled DM content must
 * not escape the <script> data block, corrupt the export, or steal a
 * placeholder substitution.
 * Run: node tests/html-export-security.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Stub the extension APIs html.js touches, then load it.
globalThis.chrome = { runtime: { getURL: (p) => join(root, 'extension', p) } };
globalThis.fetch = async (p) => ({ text: async () => readFileSync(p, 'utf8') });
const src = readFileSync(join(root, 'extension/content/html.js'), 'utf8');
const ChatHtmlGenerator = new Function(`${src}; return ChatHtmlGenerator;`)();

const breakout = '</script><script>window.__pwned=1</script>';
const dollars = "replacement patterns: $& $' $` $$ $1";
// Attacker tries to steal a later placeholder substitution (see html.js single-pass note).
const collision = 'PWN__STATS_JSON__ __CHAT_JSON__ __MESSAGE_COUNT__ END';
const chatData = {
  chatWith: '<img src=x onerror=alert(1)> $& __CHAT_JSON__',
  participants: ['me', 'attacker'],
  messages: [
    { sender: 'attacker', text: breakout, timestampUnix: 1700000000 },
    { sender: 'me', text: dollars, timestampUnix: 1700000001 },
    { sender: 'attacker', text: collision, timestampUnix: 1700000002 },
    {
      sender: 'attacker',
      text: 'reaction vector',
      timestampUnix: 1700000003,
      reactions: [{ user: '<b>evil</b>', emoji: '<script>x</script>' }],
    },
  ],
};

const template = readFileSync(join(root, 'extension/template/chat_export.html'), 'utf8');
const stats = { '<key>': "$' stats", '__CHAT_JSON__': 'x' };
const html = await ChatHtmlGenerator.generateHtml(chatData, stats);

// 1. No script-tag breakout: the export gains no </script> beyond the template's own.
const count = (s) => (s.match(/<\/script/gi) || []).length;
assert.equal(count(html), count(template), 'chat data introduced a </script> terminator');
assert.ok(!html.includes(breakout), 'raw breakout payload present in export');

// 2. The inline <script> data block actually compiles. This is the assertion that
//    catches F1: a stolen/corrupted placeholder substitution produces a SyntaxError
//    that the template's try/catch cannot swallow (it is a parse error, not runtime).
const block = html.match(/<script>([\s\S]*?)<\/script>/)[1];
assert.doesNotThrow(() => new vm.Script(block), 'embedded <script> block does not compile');

// 3. Embedded JSON round-trips exactly (covers < escaping, $-patterns, and the F1
//    collision: a stolen substitution would splice foreign JSON in and break parsing).
const m = html.match(/try {\s*chatData = ([\s\S]*?);\s*extractionStats = ([\s\S]*?);\s*} catch/);
assert.ok(m, 'could not locate embedded chat JSON');
assert.deepEqual(JSON.parse(m[1]), chatData, 'chat data corrupted during embedding');
assert.deepEqual(JSON.parse(m[2]), stats, 'stats corrupted during embedding');

// 5. Display name is HTML-escaped in the header, never raw.
assert.ok(!html.includes('<img src=x onerror'), 'unescaped display name in header');
assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'), 'escaped display name missing');

// 6. The export's CSP is present and locked down (no exfiltration widening).
const csp = (template.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
assert.ok(/default-src 'none'/.test(csp), 'CSP missing default-src none');
assert.ok(/form-action 'none'/.test(csp), 'CSP missing form-action none');
assert.ok(!/img-src[^;]*\bhttps:(?![/\w])/.test(csp), 'CSP allows img-src to any https host');

console.log('html-export-security: all assertions passed');
