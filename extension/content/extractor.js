/**
 * Extractor: Instagram removed /api/v1/direct_v2/* from www (404, Oct 2026).
 * The web client now reads DMs through GraphQL (IGDThreadDetailQuery + IGDMessageListOffMsysQuery).
 * This module keeps the original interface and converts GraphQL nodes to the old v1 item shape
 * so parser.js / markdown.js / html.js work unchanged.
 */

/* exported ChatExtractor */
// eslint-disable-next-line no-var
var ChatExtractor = (() => {
  'use strict';

  const GRAPHQL_URL = 'https://www.instagram.com/api/graphql';
  const IG_APP_ID = '936619743392459';
  const ASBD_ID = '359341';
  const DOC_THREAD_DETAIL = '29613940454875963';   // IGDThreadDetailQuery
  const DOC_MESSAGE_LIST = '28798548116496168';    // IGDMessageListOffMsysQuery
  const PAGE_SIZE = 20;  // server caps pages at 20 (tested: first=100 still returns 20)
  const MAX_RETRIES = 3;

  const INITIAL_DELAY = 300;
  const MIN_DELAY = 200;
  const MAX_DELAY = 10000;
  const BACKOFF_MULTIPLIER = 3;
  const DECAY_FACTOR = 0.8;

  let currentDelay = INITIAL_DELAY;
  let lastRequestHit429 = false;
  let tokens = null;
  const detailCache = {};  // internal thread id -> IGDThreadDetailQuery thread object

  function getCookie(name) {
    const match = document.cookie.split('; ').find(c => c.startsWith(name + '='));
    return match ? match.split('=')[1] : '';
  }

  function getCredentials() {
    const csrftoken = getCookie('csrftoken');
    const dsUserId = getCookie('ds_user_id');
    return { csrftoken, dsUserId: dsUserId ? Number(dsUserId) : null };
  }

  function extractTokens(html) {
    const dtsg = (html.match(/"DTSGInitialData",\[\],\{"token":"([^"]+)"/) ||
                  html.match(/"dtsg":\{"token":"([^"]+)"/) || [])[1];
    const lsd = (html.match(/"LSD",\[\],\{"token":"([^"]+)"/) || [])[1];
    return dtsg && lsd ? { dtsg, lsd } : null;
  }

  async function getTokens() {
    if (tokens) return tokens;
    tokens = extractTokens(document.documentElement.innerHTML);
    if (!tokens) {
      const resp = await fetch(location.href, { credentials: 'include' });
      tokens = extractTokens(await resp.text());
    }
    if (!tokens) throw new Error('Could not find fb_dtsg/lsd tokens on the page. Refresh Instagram and retry.');
    return tokens;
  }

  function jazoest(dtsg) {
    let sum = 0;
    for (let i = 0; i < dtsg.length; i++) sum += dtsg.charCodeAt(i);
    return '2' + sum;
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function adaptiveDelay() {
    if (lastRequestHit429) {
      currentDelay = Math.min(currentDelay * BACKOFF_MULTIPLIER, MAX_DELAY);
      lastRequestHit429 = false;
    } else {
      currentDelay = Math.max(currentDelay * DECAY_FACTOR, MIN_DELAY);
    }
    await delay(currentDelay);
  }

  async function gql(friendlyName, docId, variables, csrftoken) {
    let tk;
    try {
      tk = await getTokens();
    } catch (e) {
      return { ok: false, error: 'tokens', message: e.message };
    }
    const body = new URLSearchParams({
      __d: 'www',
      __a: '1',
      __comet_req: '7',
      fb_dtsg: tk.dtsg,
      jazoest: jazoest(tk.dtsg),
      lsd: tk.lsd,
      fb_api_caller_class: 'RelayModern',
      fb_api_req_friendly_name: friendlyName,
      server_timestamps: 'true',
      variables: JSON.stringify(variables),
      doc_id: docId,
    });

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(GRAPHQL_URL, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': csrftoken,
            'X-FB-LSD': tk.lsd,
            'X-IG-App-ID': IG_APP_ID,
            'X-ASBD-ID': ASBD_ID,
            'X-FB-Friendly-Name': friendlyName,
          },
          body,
        });

        if (resp.status === 429) {
          lastRequestHit429 = true;
          await delay(Math.min(5000 * Math.pow(2, attempt), 60000));
          continue;
        }
        const text = await resp.text();
        if (!resp.ok) {
          console.warn('[ig-dm-extractor]', friendlyName, resp.status, text.slice(0, 300));
          if (resp.status === 401 || resp.status === 403) {
            return { ok: false, error: 'auth_error', message: `Auth error (${resp.status})` };
          }
          await delay(2000);
          continue;
        }
        const firstLine = text.replace(/^for \(;;\);/, '').split('\n')[0];
        const json = JSON.parse(firstLine);
        if (json.errors && !json.data) {
          console.warn('[ig-dm-extractor]', friendlyName, JSON.stringify(json.errors).slice(0, 300));
          return { ok: false, error: 'graphql_error', message: json.errors[0]?.message || 'GraphQL error' };
        }
        if (json.require_login || json.error === 1357001) {
          return { ok: false, error: 'login_required', message: 'Session expired. Refresh Instagram and retry.' };
        }
        if (!json.data) {
          console.warn('[ig-dm-extractor]', friendlyName, 'response without data:', firstLine.slice(0, 300));
          return { ok: false, error: 'no_data', message: 'Unexpected response from Instagram.' };
        }
        return { ok: true, data: json.data };
      } catch (e) {
        console.warn('[ig-dm-extractor]', friendlyName, e);
        await delay(2000);
      }
    }
    return { ok: false, error: 'retries_exhausted', message: 'Failed after retries.' };
  }

  async function fetchThreadDetail(rawId, csrftoken) {
    const result = await gql('IGDThreadDetailQuery', DOC_THREAD_DETAIL, {
      min_uq_seq_id: null,
      thread_fbid: String(rawId),
      __relay_internal__pv__IGDEnableOffMsysChatThemesQErelayprovider: false,
      __relay_internal__pv__IGDInitialMessagePageCountrelayprovider: PAGE_SIZE,
    }, csrftoken);
    if (!result.ok) return result;
    const thread = result.data?.get_slide_thread_nullable?.as_ig_direct_thread;
    if (!thread) return { ok: false, error: 'thread_not_found', message: 'Could not find this conversation.' };
    return { ok: true, thread };
  }

  // ---- GraphQL node -> legacy v1 item ----

  function firstUrl(o) {
    if (!o || typeof o !== 'object') return '';
    for (const k of ['attachment_cdn_url', 'attachment_mp4_url', 'attachment_webp_url', 'playable_url', 'audio_src', 'preview_cdn_url', 'preview_url', 'url']) {
      if (typeof o[k] === 'string' && o[k].startsWith('http')) return o[k];
    }
    for (const v of Object.values(o)) {
      if (v && typeof v === 'object') {
        const u = firstUrl(Array.isArray(v) ? v[0] : v);
        if (u) return u;
      }
    }
    return '';
  }

  function nodeToItem(n) {
    const c = n.content || {};
    const kind = c.__typename || '';
    const item = {
      item_id: n.message_id || n.id,
      user_id: Number(n.sender?.igid || n.sender_fbid || 0),
      timestamp: Number(n.timestamp_ms || 0) * 1000,
    };
    const text = n.text_body || c.text_body || '';
    const url = firstUrl(c);

    if (kind === 'SlideMessageText') {
      item.item_type = 'text';
      item.text = text;
    } else if (kind === 'SlideMessageImageContent') {
      item.item_type = 'media';
      item.media = { media_type: 1, image_versions2: { candidates: url ? [{ url }] : [] } };
    } else if (kind === 'SlideMessageVideosContent') {
      item.item_type = 'media';
      item.media = { media_type: 2, video_versions: url ? [{ url }] : [], image_versions2: { candidates: [] } };
    } else if (kind === 'SlideMessageAudiosContent') {
      item.item_type = 'voice_media';
      item.voice_media = { media: { audio: { audio_src: url } } };
    } else if (kind === 'SlideMessageAnimatedMediaContent') {
      item.item_type = 'animated_media';
      item.animated_media = { images: { fixed_height: { url } } };
    } else if (kind.startsWith('SlideMessageRaven')) {
      item.item_type = 'raven_media';
    } else if (kind === 'SlideMessageAdminText') {
      item.item_type = 'action_log';
      item.action_log = { description: text || '[Action]' };
    } else {
      // XMA shares, stickers, notes, AI responses, reaction logs, etc.
      item.item_type = 'text';
      const label = `[${n.content_type || kind || 'Contenido'}]`;
      item.text = text ? `${label} ${text}` : (url ? `${label} ${url}` : label);
    }

    const r = n.replied_to_message;
    if (r) {
      item.replied_to_message = {
        user_id: Number(r.sender?.igid || r.sender_fbid || 0),
        text: r.text_body || (r.content_type ? `[${r.content_type}]` : ''),
      };
    }
    const reactions = n.msg_reactions || n.reactions || [];
    if (reactions.length) {
      item.reactions = {
        emojis: reactions.map(x => ({
          emoji: x.reaction || x.emoji || '?',
          sender_id: Number(x.sender?.igid || x.sender_igid || x.sender_id || 0),
        })),
      };
    }
    return item;
  }

  function threadInfoFrom(t) {
    return {
      thread_id: t.thread_key || t.id,
      thread_title: t.thread_title || '',
      viewer_id: t.viewer_id,
      is_group: t.is_group,
      users: (t.users || []).map(u => ({ pk: u.pk || u.id, username: u.username, full_name: u.full_name })),
    };
  }

  // ---- public API (same as original) ----

  async function resolveThreadId(rawId, csrftoken) {
    const res = await fetchThreadDetail(rawId, csrftoken);
    if (!res.ok) return res;
    detailCache[res.thread.id] = res.thread;
    return { ok: true, threadId: res.thread.id };
  }

  async function fetchAllMessages(threadId, csrftoken, onProgress, dateFilter) {
    currentDelay = INITIAL_DELAY;
    lastRequestHit429 = false;
    const allItems = [];
    const seen = new Set();
    let page = 0;

    const detail = detailCache[threadId];
    if (!detail) return { ok: false, error: 'thread_not_found', message: 'Thread not resolved.', threadInfo: null, items: [] };
    const threadInfo = threadInfoFrom(detail);

    // First page comes embedded in IGDThreadDetailQuery; older pages via IGDMessageListOffMsysQuery.
    let conn = detail.slide_messages;
    while (conn) {
      const items = (conn.edges || []).map(e => nodeToItem(e.node)).filter(it => {
        if (seen.has(it.item_id)) return false;
        seen.add(it.item_id);
        return true;
      });
      page++;
      allItems.push(...items);
      if (onProgress) {
        onProgress({ page, pageMessages: items.length, totalMessages: allItems.length, threadInfo });
      }

      if (dateFilter && dateFilter.startUnix && items.length) {
        const oldestTs = Math.floor(items[items.length - 1].timestamp / 1_000_000);
        if (oldestTs < dateFilter.startUnix) break;
      }

      const pi = conn.page_info || {};
      if (!pi.has_next_page || !pi.end_cursor) break;
      await adaptiveDelay();

      const result = await gql('IGDMessageListOffMsysQuery', DOC_MESSAGE_LIST, {
        after: pi.end_cursor,
        before: null,
        first: PAGE_SIZE,
        last: null,
        newer_than_message_id: null,
        older_than_message_id: null,
        id: String(threadId),
        __relay_internal__pv__IGDInitialMessagePageCountrelayprovider: PAGE_SIZE,
      }, csrftoken);
      if (!result.ok) {
        return { ok: false, error: result.error, message: result.message, threadInfo, items: allItems };
      }
      conn = result.data?.fetch__SlideThread?.as_ig_direct_thread?.slide_messages;
    }

    return { ok: true, threadInfo, items: allItems };
  }

  async function getThreadTitle(rawThreadId, csrftoken) {
    const res = await fetchThreadDetail(rawThreadId, csrftoken);
    if (!res.ok) return null;
    const t = res.thread;
    return t.thread_title || (t.users || []).map(u => u.username || '?').join(', ') || null;
  }

  return { getCredentials, resolveThreadId, fetchAllMessages, getThreadTitle };
})();
