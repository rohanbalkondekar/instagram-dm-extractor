/**
 * HTML generator — loads template and replaces placeholders with chat data.
 * Shared execution context with other content scripts.
 */

/* exported ChatHtmlGenerator */
// eslint-disable-next-line no-var
var ChatHtmlGenerator = (() => {
  'use strict';

  const TEMPLATE_URL = chrome.runtime.getURL('template/chat_export.html');
  const SCRIPT_URL = chrome.runtime.getURL('template/chat_export.js');

  let cachedTemplate = null;

  async function loadTemplate() {
    if (cachedTemplate) return cachedTemplate;
    const [html, js] = await Promise.all([
      fetch(TEMPLATE_URL).then(r => r.text()),
      fetch(SCRIPT_URL).then(r => r.text()),
    ]);
    // The template loads the renderer via <script src> so it can run as an
    // extension page (MV3 forbids inline scripts there). For the standalone
    // downloaded file, inline the script so the export is a single self-contained
    // file. Use a function replacer so $-sequences in the code are not expanded.
    cachedTemplate = html.replace(
      /<script src="chat_export\.js"><\/script>/,
      () => '<script>\n' + js + '\n</script>'
    );
    return cachedTemplate;
  }

  function getDisplayName(chatData) {
      if (chatData.chatWith) {
        return chatData.chatWith;
      }
    
      const participants = chatData.participants || [];

      // parser.js emits the viewer as "me" or "me (<id>)"; match that exactly,
      // not any username that merely contains "me" (james, mehul, homer...).
      for (const p of participants) {
        if (p !== 'me' && !p.startsWith('me (')) {
          return p.replace(/^_|_$/g, '');
        }
      }

      return 'Unknown';
    }

  function getAvatarInitials(chatData) {
      const displayName = getDisplayName(chatData);
    
      return displayName
        .split(' ')
        .map(word => word[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }

  function getStatusText(chatData) {
    const messages = chatData.messages || [];
    if (messages.length === 0) return 'No messages';
    
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg.timestampUnix) return 'Active recently';
    const lastMsgDate = new Date(lastMsg.timestampUnix * 1000);
    const daysSince = Math.floor((Date.now() - lastMsgDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince <= 0) return 'Active now';
    if (daysSince === 1) return 'Active yesterday';
    if (daysSince < 7) return 'Active ' + daysSince + 'd ago';
    if (daysSince < 30) return 'Active ' + Math.floor(daysSince / 7) + 'w ago';
    return 'Active ' + daysSince + ' days ago';
  }

  async function generateHtml(chatData, stats) {
    const template = await loadTemplate();
    
    const displayName = getDisplayName(chatData);
    const avatarInitials = getAvatarInitials(chatData);
    const statusText = getStatusText(chatData);
    const messageCount = (chatData.messages || []).length;
    
    // The JSON is embedded inside a <script> block, so escape "<" to keep
    // attacker-controlled message text (e.g. "</script>") from breaking out
    // of the script context. < is valid in both JSON and JS source.
    const chatJson = JSON.stringify(chatData, null, 2).replace(/</g, '\\u003c');
    const statsJson = JSON.stringify(stats || {}).replace(/</g, '\\u003c');

    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const exportTime = `${hours}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const exportDate = `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

    // Single pass over all placeholders. Sequential .replace() calls are unsafe:
    // an earlier pass can inject attacker-controlled chat text that contains a
    // later placeholder token (e.g. a DM saying "__STATS_JSON__"), and the later
    // pass would then substitute into the attacker's copy, corrupting the export.
    // One combined regex never rescans replacement text.
    const values = {
      __AVATAR_INITIALS__: escapeHtml(avatarInitials),
      __DISPLAY_NAME__: escapeHtml(displayName),
      __STATUS_TEXT__: escapeHtml(statusText),
      __MESSAGE_COUNT__: String(messageCount),
      __EXPORT_TIME__: exportTime,
      __EXPORT_DATE__: exportDate,
      __CHAT_JSON__: chatJson,
      __STATS_JSON__: statsJson,
    };
    return template.replace(
      /__(?:AVATAR_INITIALS|DISPLAY_NAME|STATUS_TEXT|MESSAGE_COUNT|EXPORT_TIME|EXPORT_DATE|CHAT_JSON|STATS_JSON)__/g,
      (m) => values[m]
    );
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { generateHtml, escapeHtml };
})();
