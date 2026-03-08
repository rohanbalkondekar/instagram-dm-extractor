(() => {
  'use strict';

  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

  let cachedThreadName = null;
  let activeTabId = null;

  const els = {
    notDm: document.getElementById('not-dm'),
    ready: document.getElementById('ready'),
    extracting: document.getElementById('extracting'),
    complete: document.getElementById('complete'),
    error: document.getElementById('error'),
    threadInfo: document.getElementById('thread-info'),
    threadInfoExtracting: document.getElementById('thread-info-extracting'),
    threadInfoComplete: document.getElementById('thread-info-complete'),
    extractBtn: document.getElementById('extract-btn'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    completeText: document.getElementById('complete-text'),
    downloadJson: document.getElementById('download-json'),
    downloadMd: document.getElementById('download-md'),
    extractAgain: document.getElementById('extract-again'),
    errorText: document.getElementById('error-text'),
    retryBtn: document.getElementById('retry-btn'),
    statsSection: document.getElementById('stats-section'),
    statsHeader: document.getElementById('stats-header'),
    statsChevron: document.getElementById('stats-chevron'),
    statsBody: document.getElementById('stats-body'),
    statsDuration: document.getElementById('stats-duration'),
    statsDateRange: document.getElementById('stats-date-range'),
    statsAvgDay: document.getElementById('stats-avg-day'),
    statsPerSender: document.getElementById('stats-per-sender'),
    statsInitiations: document.getElementById('stats-initiations'),
    statsResponseTime: document.getElementById('stats-response-time'),
    statsTypes: document.getElementById('stats-types'),
    dateRangeSelect: document.getElementById('date-range-select'),
    customDateRange: document.getElementById('custom-date-range'),
    dateStart: document.getElementById('date-start'),
    dateEnd: document.getElementById('date-end'),
  };

  function hideAll() {
    els.notDm.classList.add('hidden');
    els.ready.classList.add('hidden');
    els.extracting.classList.add('hidden');
    els.complete.classList.add('hidden');
    els.error.classList.add('hidden');
  }

  function showState(name) {
    hideAll();
    const el = els[name];
    if (el) el.classList.remove('hidden');
  }

  function setThreadInfo(text) {
    const html = `<strong>${escapeHtml(text)}</strong>`;
    els.threadInfo.innerHTML = html;
    els.threadInfoExtracting.innerHTML = html;
    els.threadInfoComplete.innerHTML = html;
    els.extractBtn.textContent = `Extract Messages from ${text}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderSubSection(container, data) {
    container.innerHTML = '';
    for (const [key, val] of Object.entries(data)) {
      const row = document.createElement('div');
      row.className = 'stats-sub-row';
      row.innerHTML = `<span>${escapeHtml(key)}</span><span>${escapeHtml(String(val))}</span>`;
      container.appendChild(row);
    }
  }

  function showStats(stats) {
    if (!stats) {
      els.statsSection.classList.add('hidden');
      return;
    }
    els.statsSection.classList.remove('hidden');
    els.statsBody.classList.remove('collapsed-body');
    els.statsChevron.classList.remove('collapsed');

    els.statsDuration.textContent = stats.duration || '?';
    els.statsAvgDay.textContent = stats.avgPerDay ?? '?';

    const dr = stats.dateRange || {};
    if (dr.oldest && dr.newest) {
      const oldest = (dr.oldest || '').split(' ')[0];
      const newest = (dr.newest || '').split(' ')[0];
      els.statsDateRange.textContent = oldest === newest ? oldest : `${oldest} \u2192 ${newest}`;
    } else {
      els.statsDateRange.textContent = '?';
    }

    renderSubSection(els.statsPerSender, stats.perSender || {});
    renderSubSection(els.statsInitiations, stats.initiations || {});
    renderSubSection(els.statsResponseTime, stats.responseTime || {});
    renderSubSection(els.statsTypes, stats.typeBreakdown || {});
  }

  els.statsHeader.addEventListener('click', () => {
    els.statsBody.classList.toggle('collapsed-body');
    els.statsChevron.classList.toggle('collapsed');
  });

  async function getActiveTab() {
    const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  const CONTENT_SCRIPTS = [
    'content/parser.js',
    'content/markdown.js',
    'content/downloader.js',
    'content/stats.js',
    'content/extractor.js',
    'content/content.js',
  ];

  async function injectIfNeeded(tabId) {
    try {
      await browserAPI.scripting.executeScript({
        target: { tabId },
        files: CONTENT_SCRIPTS,
      });
    } catch (_) {}
  }

  async function sendToContent(tab, message) {
    await injectIfNeeded(tab.id);

    // Use scripting.executeScript with a func to communicate.
    // tabs.sendMessage fails in Chrome when both manifest and programmatic
    // injection have run — Chrome returns null instead of the response.
    try {
      const [result] = await browserAPI.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (msg) => {
          // This runs in the same isolated world as the content scripts.
          // Dispatch the message directly to our handler via a global.
          if (typeof window.__igDmHandleMessage === 'function') {
            return await window.__igDmHandleMessage(msg);
          }
          return null;
        },
        args: [message],
      });
      return result?.result ?? null;
    } catch (_) {
      return null;
    }
  }

  async function checkPage() {
    const tab = await getActiveTab();
    if (!tab) {
      showState('notDm');
      return;
    }

    // Skip tab.url check — Firefox doesn't provide tab.url with activeTab permission.
    // Let the content script determine if we're on a DM page via CHECK_PAGE response.
    activeTabId = tab.id;

    const resp = await sendToContent(tab, { type: 'CHECK_PAGE' });
    if (!resp || !resp.onDmPage) {
      showState('notDm');
      els.notDm.innerHTML =
        'Open a DM conversation in <mark><b>full view</b></mark> to extract messages.';
      return;
    }

    cachedThreadName = resp.chatTitle || null;
    if (cachedThreadName) setThreadInfo(cachedThreadName);

    switch (resp.status) {
      case 'extracting':
        showState('extracting');
        els.progressText.textContent = `Page ${resp.page} \u2014 ${resp.totalMessages} msgs`;
        break;
      case 'complete':
        showState('complete');
        els.completeText.textContent = `Done! ${resp.totalMessages} messages extracted.`;
        showStats(resp.stats);
        break;
      case 'error':
        showState('error');
        els.errorText.textContent = resp.error || 'An error occurred.';
        break;
      default: {
        showState('ready');
        // Try instant DOM scrape first, then async API fallback
        if (!cachedThreadName) {
          try {
            const [r] = await browserAPI.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                try {
                  // Strategy 1: header area span with title attr (display name)
                  const headerSpan = document.querySelector('header span[title]');
                  if (headerSpan?.title) return headerSpan.title;
                  // Strategy 2: Instagram class combo for DM header name
                  const el = document.querySelector('.x1lliihq.x193iq5w.x6ikm8r.x10wlt62.xlyipyv.xuxw1ft');
                  if (el) {
                    const inner = el.querySelector('span[title]');
                    if (inner?.title) return inner.title;
                    if (el.textContent?.trim()) return el.textContent.trim();
                  }
                  // Strategy 3: any span[title] in the main thread area
                  const allTitled = document.querySelectorAll('div[role="main"] span[title]');
                  if (allTitled.length === 1 && allTitled[0].title) return allTitled[0].title;
                } catch (e) {
                  return 'DOM_ERROR:' + e.message;
                }
                return null;
              },
            });
            if (r?.result && typeof r.result === 'string' && !r.result.startsWith('DOM_ERROR')) {
              cachedThreadName = r.result;
            }
          } catch (_) {}
        }
        if (cachedThreadName) {
          setThreadInfo(cachedThreadName);
        }
        // Async API fallback if DOM scrape didn't work
        if (!cachedThreadName) {
          sendToContent(tab, { type: 'GET_CHAT_NAME' }).then(name => {
            if (name) {
              cachedThreadName = name;
              setThreadInfo(name);
            }
          }).catch(() => {});
        }
        break;
      }
    }
  }

  els.dateRangeSelect.addEventListener('change', () => {
    const val = els.dateRangeSelect.value;
    if (val === 'custom') {
      els.customDateRange.classList.remove('hidden');
    } else {
      els.customDateRange.classList.add('hidden');
    }
  });

  function computeDateFilter() {
    const val = els.dateRangeSelect.value;
    if (val === 'all') return null;

    const nowSecs = Math.floor(Date.now() / 1000);

    if (val === 'custom') {
      let startStr = els.dateStart.value;
      let endStr = els.dateEnd.value;
      if (!startStr && !endStr) return null; // both empty = all messages
      if (startStr && endStr && startStr > endStr) [startStr, endStr] = [endStr, startStr];
      const startUnix = startStr ? Math.floor(new Date(startStr + 'T00:00:00').getTime() / 1000) : 0;
      const endUnix = endStr ? Math.floor(new Date(endStr + 'T23:59:59').getTime() / 1000) : nowSecs;
      return { startUnix, endUnix };
    }

    const days = parseInt(val, 10);
    return { startUnix: nowSecs - days * 86400, endUnix: nowSecs };
  }

  async function startExtraction() {
    const tab = await getActiveTab();
    if (!tab) return;

    showState('extracting');
    if (cachedThreadName) setThreadInfo(cachedThreadName);
    els.progressText.textContent = 'Starting...';
    els.progressBar.style.width = '0%';
    els.progressBar.classList.add('indeterminate');

    const dateFilter = computeDateFilter();
    const resp = await sendToContent(tab, { type: 'START_EXTRACTION', dateFilter });
    if (!resp || !resp.started) {
      showState('ready');
      if (cachedThreadName) setThreadInfo(cachedThreadName);
    }
  }

  // Listen for messages from content script
  browserAPI.runtime.onMessage.addListener((msg, sender) => {
    if (sender.tab && sender.tab.id !== activeTabId) return;
    if (msg.type === 'PROGRESS') {
      showState('extracting');
      els.progressBar.classList.remove('indeterminate');
      const pct = Math.min(95, msg.page * 5); // Indeterminate-ish progress
      els.progressBar.style.width = `${pct}%`;
      els.progressText.textContent = `Page ${msg.page} \u2014 ${msg.totalMessages} msgs`;
      if (msg.chatTitle) {
        cachedThreadName = msg.chatTitle;
        setThreadInfo(msg.chatTitle);
      }
    } else if (msg.type === 'COMPLETE') {
      showState('complete');
      els.progressBar.classList.remove('indeterminate');
      els.progressBar.style.width = '100%';
      els.completeText.textContent = `Done! ${msg.totalMessages} messages extracted.`;
      if (msg.chatTitle) {
        cachedThreadName = msg.chatTitle;
        setThreadInfo(msg.chatTitle);
      }
      showStats(msg.stats);
    } else if (msg.type === 'EXTRACTION_ERROR') {
      showState('error');
      els.errorText.textContent = msg.error || 'An error occurred.';
    }
  });

  els.extractBtn.addEventListener('click', startExtraction);
  els.extractAgain.addEventListener('click', () => {
    showState('ready');
    if (cachedThreadName) setThreadInfo(cachedThreadName);
  });
  els.retryBtn.addEventListener('click', startExtraction);

  els.downloadJson.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) return;
    const resp = await sendToContent(tab, { type: 'DOWNLOAD_JSON' });
    if (resp && !resp.downloaded) {
      els.completeText.textContent = resp.error || 'Download failed.';
    }
  });

  els.downloadMd.addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab) return;
    const resp = await sendToContent(tab, { type: 'DOWNLOAD_MD' });
    if (resp && !resp.downloaded) {
      els.completeText.textContent = resp.error || 'Download failed.';
    }
  });

  // Initial check
  checkPage();
})();
