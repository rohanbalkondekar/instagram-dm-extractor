/**
 * Extractor over Instagram's GraphQL endpoint, against a stubbed fetch.
 * The responses below are synthetic: they use the field names extractor.js reads, not a capture
 * from Instagram. This checks the request, pagination and conversion logic, not Instagram's API.
 * Run: node tests/graphql-extractor.test.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const load = (file, name) => new Function(`${readFileSync(join(root, 'extension/content', file), 'utf8')}; return ${name};`)();

const node = (id, igid, ms, content, extra = {}) => ({ node: { message_id: id, sender: { igid }, timestamp_ms: String(ms), content, ...extra } });
const text = (body) => ({ __typename: 'SlideMessageText', text_body: body });
const thread = {
  id: 'T1', thread_key: 'K1', thread_title: '', viewer_id: '1', is_group: false,
  users: [{ pk: '2', username: 'friend' }],
  slide_messages: {
    edges: [node('m3', '2', 3000, text('newest')), node('m2', '1', 2000, text('middle'))],
    page_info: { has_next_page: true, end_cursor: 'c1' },
  },
};
const olderPage = { fetch__SlideThread: { as_ig_direct_thread: { slide_messages: {
  edges: [
    node('m2', '1', 2000, text('middle')),
    node('m1', '2', 1000, { __typename: 'SlideMessageImageContent', image: { url: 'https://cdn.example/a.jpg' } }),
    node('m0', '2', 500, { __typename: 'SlideMessageUnknownShare' }, { content_type: 'XMA' }),
  ],
  page_info: { has_next_page: false, end_cursor: null },
} } } };

const requests = [];
globalThis.document = {
  cookie: 'csrftoken=csrf; ds_user_id=1',
  documentElement: { innerHTML: '"DTSGInitialData",[],{"token":"DTSG"} "LSD",[],{"token":"LSDTOKEN"}' },
};
globalThis.location = { href: 'https://www.instagram.com/direct/t/999/' };
globalThis.fetch = async (url, init) => {
  const body = new URLSearchParams(init.body.toString());
  requests.push({ url, name: body.get('fb_api_req_friendly_name'), variables: JSON.parse(body.get('variables')), headers: init.headers, body });
  const data = body.get('fb_api_req_friendly_name') === 'IGDThreadDetailQuery'
    ? { get_slide_thread_nullable: { as_ig_direct_thread: thread } }
    : olderPage;
  return { ok: true, status: 200, text: async () => 'for (;;);' + JSON.stringify({ data }) };
};

const ChatExtractor = load('extractor.js', 'ChatExtractor');
const ChatParser = load('parser.js', 'ChatParser');

const { csrftoken, dsUserId } = ChatExtractor.getCredentials();
const resolved = await ChatExtractor.resolveThreadId('999', csrftoken);
assert.deepEqual(resolved, { ok: true, threadId: 'T1' });
const result = await ChatExtractor.fetchAllMessages(resolved.threadId, csrftoken, null, null);
assert.equal(result.ok, true);

// Every request goes to Instagram's GraphQL endpoint with the page's own tokens, and nowhere else.
assert.deepEqual(requests.map(r => r.url), Array(2).fill('https://www.instagram.com/api/graphql'));
assert.deepEqual(requests.map(r => r.name), ['IGDThreadDetailQuery', 'IGDMessageListOffMsysQuery']);
assert.equal(requests[0].variables.thread_fbid, '999');
assert.equal(requests[1].variables.after, 'c1');
assert.equal(requests[1].variables.id, 'T1');
assert.equal(requests[1].body.get('fb_dtsg'), 'DTSG');
assert.equal(requests[1].headers['X-FB-LSD'], 'LSDTOKEN');
assert.equal(requests[1].headers['X-CSRFToken'], 'csrf');

// The message repeated across pages is kept once; order stays newest first.
assert.deepEqual(result.items.map(i => i.item_id), ['m3', 'm2', 'm1', 'm0']);
assert.equal(result.items[0].timestamp, 3_000_000);
assert.equal(result.items[2].item_type, 'media');
assert.equal(result.items[2].media.image_versions2.candidates[0].url, 'https://cdn.example/a.jpg');
assert.equal(result.items[3].text, '[XMA]');

// The converted items go through the unchanged parser.
const userMap = ChatParser.buildUserMap(result.threadInfo, dsUserId);
const parsed = result.items.map(i => ChatParser.parseMessage(i, dsUserId, userMap));
assert.deepEqual(parsed.slice(0, 2).map(m => [m.sender, m.text, m.timestampUnix]), [['friend', 'newest', 3], ['me', 'middle', 2]]);
assert.equal(ChatParser.buildOutput(result.threadInfo, parsed, dsUserId, userMap).chatWith, 'friend');

console.log('graphql-extractor: all assertions passed');
