/**
 * Orchestrator — message listener, thread detection, state management.
 * Shared execution context with other content scripts.
 */

// Guard against duplicate injection (popup fallback can re-inject).
// Flag set immediately so retries can't accumulate pollers/observers.
// Content scripts run at document_idle so document.body is always ready.
if (!window.__igDmExtractorLoaded) {
window.__igDmExtractorLoaded = true;

(() => {
  'use strict';

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  function freshState() {
    return {
      status: 'idle',
      threadId: null,
      urlThreadId: null,
      page: 0,
      totalMessages: 0,
      error: null,
      jsonData: null,
      mdText: null,
      chatTitle: null,
      extractionStartTime: null,
      stats: null,
    };
  }

  let state = freshState();

  function getThreadIdFromUrl() {
    const match = window.location.pathname.match(/\/direct\/t\/([^/]+)/);
    return match ? match[1] : null;
  }

  function isOnDmPage() {
    return /\/direct\/t\//.test(window.location.pathname);
  }

  function resetIfThreadChanged() {
    const currentUrlThread = getThreadIdFromUrl();
    if (currentUrlThread && currentUrlThread !== state.urlThreadId) {
      // User navigated to a different chat — reset state
      if (state.status !== 'extracting') {
        state = freshState();
        state.urlThreadId = currentUrlThread;
      }
    }
  }

  function sendError(errorMsg) {
    browserAPI.runtime.sendMessage({
      type: 'EXTRACTION_ERROR',
      error: errorMsg,
    }).catch(() => {});
  }

  // Watch for Instagram's client-side navigation (URL changes without page reload)
  let lastUrl = window.location.href;

  function checkUrlChange() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      resetIfThreadChanged();
    }
  }

  // Polling — reliable catch-all for SPA pushState/replaceState navigation
  // (content scripts run in isolated world, can't monkey-patch history API)
  setInterval(checkUrlChange, 500);

  // Immediate detection paths (fire before the 500ms poll)
  const urlObserver = new MutationObserver(checkUrlChange);
  urlObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', checkUrlChange);

  async function startExtraction(dateFilter) {
    // Block concurrent extractions
    if (state.status === 'extracting') return;

    // Ensure clean state for current thread
    resetIfThreadChanged();

    const { csrftoken, dsUserId } = ChatExtractor.getCredentials();
    if (!dsUserId) {
      state.status = 'error';
      state.error = 'Please log into Instagram first.';
      sendError(state.error);
      return;
    }

    const rawThreadId = getThreadIdFromUrl();
    if (!rawThreadId) {
      state.status = 'error';
      state.error = 'Navigate to an Instagram DM conversation first.';
      sendError(state.error);
      return;
    }

    state.status = 'extracting';
    state.error = null;
    state.page = 0;
    state.totalMessages = 0;
    state.urlThreadId = rawThreadId;
    state.jsonData = null;
    state.mdText = null;
    state.stats = null;
    state.extractionStartTime = Date.now();

    try {
      // Resolve thread ID
      const resolved = await ChatExtractor.resolveThreadId(rawThreadId, csrftoken);
      if (!resolved.ok) {
        state.status = 'error';
        state.error = resolved.message;
        sendError(state.error);
        return;
      }
      state.threadId = resolved.threadId;

      // Fetch all messages
      const result = await ChatExtractor.fetchAllMessages(
        state.threadId,
        csrftoken,
        (progress) => {
          state.page = progress.page;
          state.totalMessages = progress.totalMessages;

          // Resolve chat title from first API response's threadInfo
          if (!state.chatTitle && progress.threadInfo) {
            let title = progress.threadInfo.thread_title || '';
            if (!title) {
              const users = progress.threadInfo.users || [];
              title = users.map(u => u.username || '?').join(', ');
            }
            if (title) state.chatTitle = title;
          }

          // Send progress to popup
          browserAPI.runtime.sendMessage({
            type: 'PROGRESS',
            page: progress.page,
            totalMessages: progress.totalMessages,
            chatTitle: state.chatTitle,
          }).catch(() => {});
          // Update badge
          browserAPI.runtime.sendMessage({
            type: 'UPDATE_BADGE',
            count: progress.totalMessages,
          }).catch(() => {});
        },
        dateFilter
      );

      if (!result.ok) {
        state.status = 'error';
        state.error = result.message || 'Extraction failed.';
        sendError(state.error);
        return;
      }

      const { threadInfo, items } = result;
      const myUserId = Number(ChatExtractor.getCredentials().dsUserId);
      const userMap = ChatParser.buildUserMap(threadInfo, myUserId);

      // Parse all messages and reverse to chronological order
      let messages = items.map(item => ChatParser.parseMessage(item, myUserId, userMap));
      messages.reverse();

      // Apply client-side date filter
      if (dateFilter) {
        messages = messages.filter(m => {
          const ts = m.timestampUnix;
          return ts >= dateFilter.startUnix && ts <= dateFilter.endUnix;
        });
      }

      // Build JSON output
      const jsonData = ChatParser.buildOutput(threadInfo, messages, myUserId, userMap);
      state.jsonData = jsonData;
      state.chatTitle = jsonData.chatWith;

      // Compute extraction stats
      const durationMs = Date.now() - state.extractionStartTime;
      const durationSecs = Math.round(durationMs / 1000);
      const minutes = Math.floor(durationSecs / 60);
      const seconds = durationSecs % 60;
      const durationText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

      state.stats = ChatStats.computeStats(messages, durationText);

      // Convert to markdown (with stats metadata)
      state.mdText = ChatMarkdown.convertToMarkdown(jsonData, state.stats);

      state.status = 'complete';
      state.totalMessages = messages.length;

      // Notify popup
      browserAPI.runtime.sendMessage({
        type: 'COMPLETE',
        totalMessages: messages.length,
        chatTitle: state.chatTitle,
        stats: state.stats,
      }).catch(() => {});
      browserAPI.runtime.sendMessage({
        type: 'UPDATE_BADGE',
        count: messages.length,
      }).catch(() => {});
    } catch (err) {
      state.status = 'error';
      state.error = err.message || 'Unexpected error during extraction.';
      sendError(state.error);
    } finally {
      // Guarantee extraction lock is released even if catch itself fails
      if (state.status === 'extracting') {
        state.status = 'error';
        state.error = state.error || 'Extraction ended unexpectedly.';
      }
    }
  }

  function handleMessage(msg) {
    switch (msg.type) {
      case 'CHECK_PAGE':
        resetIfThreadChanged();
        return {
          onDmPage: isOnDmPage(),
          threadId: getThreadIdFromUrl(),
          status: state.status,
          totalMessages: state.totalMessages,
          chatTitle: state.chatTitle,
          error: state.error,
          page: state.page,
          stats: state.stats,
        };

      case 'START_EXTRACTION': {
        const resp = { started: state.status !== 'extracting' };
        startExtraction(msg.dateFilter || null);
        return resp;
      }

      case 'GET_CHAT_NAME': {
        const id = getThreadIdFromUrl();
        if (!id) return null;
        const { csrftoken } = ChatExtractor.getCredentials();
        if (!csrftoken) return null;
        return ChatExtractor.getThreadTitle(id, csrftoken);
      }

      case 'GET_STATE':
        return {
          status: state.status,
          totalMessages: state.totalMessages,
          chatTitle: state.chatTitle,
          error: state.error,
          page: state.page,
          stats: state.stats,
        };

      case 'DOWNLOAD_JSON':
        if (state.jsonData) {
          const slug = (state.chatTitle || 'chat').replace(/[^\p{L}\p{M}\p{N}._-]/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'chat';
          ChatDownloader.downloadJson(state.jsonData, `${slug}.json`);
          return { downloaded: true };
        }
        return { downloaded: false, error: 'No data available.' };

      case 'DOWNLOAD_MD':
        if (state.mdText) {
          const slug = (state.chatTitle || 'chat').replace(/[^\p{L}\p{M}\p{N}._-]/gu, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'chat';
          ChatDownloader.downloadMarkdown(state.mdText, `${slug}.md`);
          return { downloaded: true };
        }
        return { downloaded: false, error: 'No data available.' };

      default:
        return null;
    }
  }

  // Expose handler for popup's scripting.executeScript calls (Chrome)
  window.__igDmHandleMessage = handleMessage;

  // Also keep runtime.onMessage for Firefox and content-script-to-popup messages
  browserAPI.runtime.onMessage.addListener((msg, _sender) => {
    const result = handleMessage(msg);
    return result !== null ? Promise.resolve(result) : false;
  });
})();

} // end duplicate guard
