/**
 * Tests for the HTML and CSV exporters.
 * Run: npm test   (node --test, no dependencies)
 *
 * Content scripts are plain IIFE globals, not modules, so they are loaded by
 * evaluating the sources in one shared scope — the same way the browser runs
 * them. ponytail: no bundler, no jsdom; the exporters touch no DOM.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CONTENT_DIR = path.join(__dirname, '..', 'extension', 'content');

function loadExporters() {
  const src = ['markdown.js', 'exporters.js']
    .map(f => fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8'))
    .join('\n');
  // eslint-disable-next-line no-new-func
  return new Function(`${src}\nreturn ChatExporters;`)();
}

const ChatExporters = loadExporters();

// Minimal RFC 4180 reader, used only to prove the writer round-trips.
function parseCsv(text) {
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"') {
        if (body[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r' && body[i + 1] === '\n') {
      row.push(field); field = ''; rows.push(row); row = []; i++;
    } else if (c === '\n') {
      row.push(field); field = ''; rows.push(row); row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const HOSTILE_TEXT = '<script>alert(1)</script> "quoted" & ampersand \'apos\'';
const MESSY_TEXT = 'line one, with comma\nline "two" quoted';

const FIXTURE = {
  extractedAt: '2026-07-25T10:00:00.000Z',
  chatWith: 'Ana & Bo <friends>',
  threadId: '123',
  participants: ['me (99)', 'ana_b', 'bo_c'],
  messageCount: 5,
  dateRange: { oldest: '2026-07-20 09:00:00 UTC', newest: '2026-07-21 11:30:00 UTC' },
  messages: [
    {
      id: '1', sender: 'me', timestamp: '2026-07-20 09:00:00 UTC',
      timestampUnix: 1784718000, type: 'text', text: 'Hey both 👋 привет',
    },
    {
      id: '2', sender: 'ana_b', timestamp: '2026-07-20 09:05:00 UTC',
      timestampUnix: 1784718300, type: 'text', text: HOSTILE_TEXT,
      reactions: [{ user: 'me', emoji: '❤️' }],
    },
    {
      id: '3', sender: 'bo_c', timestamp: '2026-07-20 09:10:00 UTC',
      timestampUnix: 1784718600, type: 'text', text: MESSY_TEXT,
      replyTo: { sender: 'ana_b', text: 'earlier "reply", text' },
    },
    {
      id: '4', sender: 'ana_b', timestamp: '2026-07-21 11:00:00 UTC',
      timestampUnix: 1784804400, type: 'media', text: '[Photo]',
      mediaUrl: 'https://scontent.cdninstagram.com/pic.jpg?a=1&b=2',
    },
    {
      id: '5', sender: 'bo_c', timestamp: '2026-07-21 11:30:00 UTC',
      timestampUnix: 1784806200, type: 'link', text: 'click me',
      linkUrl: 'javascript:alert(1)',
    },
  ],
};

test('HTML escapes hostile message content', () => {
  const html = ChatExporters.convertToHtml(FIXTURE);

  assert.ok(!html.includes('<script>'), 'raw <script> tag leaked into HTML');
  assert.ok(!html.includes('alert(1)</script>'), 'raw closing script tag leaked');
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'), 'script payload not escaped');
  assert.ok(html.includes('&quot;quoted&quot;'), 'double quote not escaped');
  assert.ok(html.includes('&amp; ampersand'), 'ampersand not escaped');
  assert.ok(html.includes('&#39;apos&#39;'), 'single quote not escaped');
  // Title comes from the thread name, also user-controlled.
  assert.ok(html.includes('Ana &amp; Bo &lt;friends&gt;'), 'thread title not escaped');
});

test('HTML is self-contained and links media instead of embedding it', () => {
  const html = ChatExporters.convertToHtml(FIXTURE);

  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.ok(html.includes('<style>'), 'CSS should be inline');
  assert.ok(!/<(script|iframe)\b/i.test(html), 'no script or iframe elements');
  assert.ok(!/\b(src|href)\s*=\s*["']https?:\/\/(?!scontent)/i.test(html), 'no external asset requests');

  assert.ok(
    html.includes('href="https://scontent.cdninstagram.com/pic.jpg?a=1&amp;b=2"'),
    'media URL should render as an escaped link'
  );
  assert.ok(!html.includes('javascript:'), 'javascript: URL must not reach an href');
});

test('HTML renders every message and participant', () => {
  const html = ChatExporters.convertToHtml(FIXTURE);

  for (const p of FIXTURE.participants) {
    assert.ok(html.includes(ChatExporters.escapeHtml(p)), `participant missing: ${p}`);
  }
  assert.strictEqual((html.match(/<article class="msg/g) || []).length, FIXTURE.messages.length);
  assert.ok(html.includes('Hey both 👋 привет'), 'unicode text lost');
  assert.ok(html.includes('2026-07-20') && html.includes('2026-07-21'), 'day separators missing');
  assert.ok(html.includes('earlier &quot;reply&quot;, text'), 'reply context missing');
  assert.ok(html.includes('me: ❤️'), 'reaction missing');
});

test('CSV starts with a UTF-8 BOM', () => {
  const csv = ChatExporters.convertToCsv(FIXTURE);
  assert.strictEqual(csv.charCodeAt(0), 0xfeff, 'CSV must start with U+FEFF for Excel');
  assert.strictEqual(Buffer.from(csv, 'utf8').subarray(0, 3).toString('hex'), 'efbbbf');
});

test('CSV round-trips commas, quotes and newlines per RFC 4180', () => {
  const csv = ChatExporters.convertToCsv(FIXTURE);
  const rows = parseCsv(csv);

  assert.strictEqual(rows.length, FIXTURE.messages.length + 1, 'one header row plus one row per message');
  assert.deepStrictEqual(rows[0][0], 'timestamp');
  assert.strictEqual(rows[0].length, 9);

  const textCol = rows[0].indexOf('text');
  const messy = rows[3];
  assert.strictEqual(messy[textCol], MESSY_TEXT, 'comma/quote/newline field did not round-trip');
  assert.strictEqual(rows[2][textCol], HOSTILE_TEXT, 'hostile text did not round-trip');
  assert.strictEqual(rows[3][rows[0].indexOf('reply_to_text')], 'earlier "reply", text');

  // Raw form: quoted field, doubled inner quotes.
  assert.ok(csv.includes('"line one, with comma\nline ""two"" quoted"'), 'RFC 4180 quoting is wrong');
  assert.ok(!/(^|,)line one, with comma/m.test(csv.replace(/"[^"]*"/g, '')), 'comma field left unquoted');
});

test('CSV carries every sender and unicode intact', () => {
  const csv = ChatExporters.convertToCsv(FIXTURE);
  const rows = parseCsv(csv);
  const senderCol = rows[0].indexOf('sender');
  const senders = new Set(rows.slice(1).map(r => r[senderCol]));

  assert.deepStrictEqual([...senders].sort(), ['ana_b', 'bo_c', 'me']);
  assert.ok(csv.includes('Hey both 👋 привет'), 'unicode text lost');
  assert.strictEqual(rows[4][rows[0].indexOf('media_url')], 'https://scontent.cdninstagram.com/pic.jpg?a=1&b=2');
  assert.ok(csv.endsWith('\r\n'), 'CSV should end with CRLF');
});

test('csvCell quotes only when RFC 4180 requires it', () => {
  assert.strictEqual(ChatExporters.csvCell('plain'), 'plain');
  assert.strictEqual(ChatExporters.csvCell('a,b'), '"a,b"');
  assert.strictEqual(ChatExporters.csvCell('say "hi"'), '"say ""hi"""');
  assert.strictEqual(ChatExporters.csvCell('a\nb'), '"a\nb"');
  assert.strictEqual(ChatExporters.csvCell(null), '');
});
