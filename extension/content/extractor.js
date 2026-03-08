/**
 * API calls, pagination, rate limiting — port of extract_chat.py:50-115, 118-144, 205-262, 524-545
 * Shared execution context with other content scripts.
 */

/* exported ChatExtractor */
// eslint-disable-next-line no-var
var ChatExtractor = (() => {
  'use strict';

  const BASE_URL = 'https://www.instagram.com/api/v1';
  const IG_APP_ID = '936619743392459';
  const MESSAGES_PER_PAGE = 40;
  const MAX_RETRIES = 3;

  const INITIAL_DELAY = 100;
  const MIN_DELAY = 50;
  const MAX_DELAY = 10000;
  const BACKOFF_MULTIPLIER = 3;
  const DECAY_FACTOR = 0.8;

  let wwwClaim = '0';
  let currentDelay = INITIAL_DELAY;
  let lastRequestHit429 = false;

  function getCookie(name) {
    const match = document.cookie.split('; ').find(c => c.startsWith(name + '='));
    return match ? match.split('=')[1] : '';
  }

  function getCredentials() {
    const csrftoken = getCookie('csrftoken');
    const dsUserId = getCookie('ds_user_id');
    return { csrftoken, dsUserId: dsUserId ? Number(dsUserId) : null };
  }

  function getHeaders(csrftoken) {
    return {
      'X-CSRFToken': csrftoken,
      'X-IG-App-ID': IG_APP_ID,
      'X-IG-WWW-Claim': wwwClaim,
      'X-ASBD-ID': '129477',
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
    };
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

  async function apiFetch(endpoint, params, csrftoken) {
    const url = new URL(`${BASE_URL}${endpoint}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const resp = await fetch(url.toString(), {
          method: 'GET',
          headers: getHeaders(csrftoken),
          credentials: 'include',
        });

        // Capture claim header
        const claim = resp.headers.get('x-ig-set-www-claim');
        if (claim) wwwClaim = claim;

        if (resp.ok) {
          return { ok: true, data: await resp.json() };
        }

        if (resp.status === 429) {
          lastRequestHit429 = true;
          const wait = Math.min(5000 * Math.pow(2, attempt), 60000);
          await delay(wait);
          continue;
        }

        if (resp.status === 401 || resp.status === 403) {
          let data = {};
          try { data = await resp.json(); } catch (_) { /* empty */ }
          const msg = JSON.stringify(data);
          if (msg.includes('login_required')) {
            return { ok: false, error: 'login_required', message: 'Session expired. Refresh Instagram and retry.' };
          }
          if (msg.includes('checkpoint_required')) {
            return { ok: false, error: 'checkpoint_required', message: 'Security challenge required. Complete it in Instagram, then retry.' };
          }
          return { ok: false, error: 'auth_error', message: `Auth error (${resp.status})` };
        }

        // Other errors — retry
        await delay(2000);
      } catch (e) {
        await delay(2000);
      }
    }
    return { ok: false, error: 'retries_exhausted', message: 'Failed after retries.' };
  }

  async function apiFetchSafe(endpoint, params, csrftoken) {
    const result = await apiFetch(endpoint, params, csrftoken);
    return result.ok ? result.data : null;
  }

  async function fetchInbox(csrftoken) {
    const threads = [];
    let cursor = null;
    while (true) {
      const params = {
        visual_message_return_type: 'unseen',
        thread_message_limit: '1',
        persistentBadging: 'true',
        limit: '20',
        is_prefetching: 'false',
        folder: '0',
      };
      if (cursor) params.cursor = cursor;

      const result = await apiFetch('/direct_v2/inbox/', params, csrftoken);
      if (!result.ok) return threads;

      const inbox = result.data.inbox || {};
      const batch = inbox.threads || [];
      threads.push(...batch);

      if (!inbox.has_older) break;
      cursor = inbox.oldest_cursor;
      if (!cursor) break;
      await adaptiveDelay();
    }
    return threads;
  }

  async function resolveThreadId(rawId, csrftoken) {
    // Try direct access first
    const params = { visual_message_return_type: 'unseen', limit: '1' };
    const data = await apiFetchSafe(`/direct_v2/threads/${rawId}/`, params, csrftoken);
    if (data && data.thread) return { ok: true, threadId: rawId };

    // Search inbox for matching thread
    const threads = await fetchInbox(csrftoken);
    for (const t of threads) {
      const matches = [
        String(t.thread_v2_id || ''),
        String(t.thread_id || ''),
        String(t.messaging_thread_key || ''),
      ];
      if (matches.includes(rawId)) {
        return { ok: true, threadId: t.thread_id };
      }
    }
    return { ok: false, error: 'thread_not_found', message: 'Could not find this conversation.' };
  }

  async function fetchAllMessages(threadId, csrftoken, onProgress, dateFilter) {
    currentDelay = INITIAL_DELAY;
    lastRequestHit429 = false;
    const allItems = [];
    let cursor = null;
    let page = 0;
    let threadInfo = null;

    while (true) {
      const params = {
        visual_message_return_type: 'unseen',
        limit: String(MESSAGES_PER_PAGE),
      };
      if (cursor) params.cursor = cursor;

      const result = await apiFetch(`/direct_v2/threads/${threadId}/`, params, csrftoken);
      if (!result.ok) {
        return { ok: false, error: result.error, message: result.message, threadInfo, items: allItems };
      }

      const thread = result.data.thread || {};

      if (threadInfo === null) {
        threadInfo = {};
        for (const [k, v] of Object.entries(thread)) {
          if (k !== 'items') threadInfo[k] = v;
        }
      }

      const items = thread.items || [];
      page++;
      allItems.push(...items);

      if (onProgress) {
        onProgress({ page, pageMessages: items.length, totalMessages: allItems.length, threadInfo });
      }

      // Early termination: if oldest item on this page is before startUnix, stop
      if (dateFilter && dateFilter.startUnix && items.length) {
        const oldestItem = items[items.length - 1]; // items are newest-first
        const oldestTs = oldestItem.timestamp ? Math.floor(oldestItem.timestamp / 1_000_000) : 0;
        if (oldestTs < dateFilter.startUnix) break;
      }


      if (!thread.has_older) break;
      cursor = thread.oldest_cursor;
      if (!cursor) break;
      await adaptiveDelay();
    }

    return { ok: true, threadInfo, items: allItems };
  }

  async function getThreadTitle(rawThreadId, csrftoken) {
    const params = { visual_message_return_type: 'unseen', limit: '1' };
    const data = await apiFetchSafe(`/direct_v2/threads/${rawThreadId}/`, params, csrftoken);
    if (!data || !data.thread) return null;
    const thread = data.thread;
    let title = thread.thread_title || '';
    if (!title) {
      const users = thread.users || [];
      title = users.map(u => u.username || '?').join(', ');
    }
    return title || null;
  }

  return { getCredentials, resolveThreadId, fetchAllMessages, getThreadTitle };
})();
