/**
 * HTML and CSV export — same JSON input as ChatMarkdown.convertToMarkdown.
 * Shared execution context with other content scripts.
 */

/* exported ChatExporters */
// eslint-disable-next-line no-var
var ChatExporters = (() => {
  'use strict';

  const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  // Trust boundary: every piece of user content goes through this before
  // reaching the HTML file. Chat text is attacker-controlled.
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
  }

  // Only http(s) reaches an href — blocks javascript:/data: URLs arriving
  // in link or media messages.
  function safeUrl(url) {
    const cleaned = ChatMarkdown.cleanInstagramUrl(String(url || ''));
    return /^https?:\/\//i.test(cleaned) ? cleaned : null;
  }

  function linkOrText(url, label) {
    const href = safeUrl(url);
    if (!href) return escapeHtml(label);
    return `<a href="${escapeHtml(href)}" rel="noreferrer noopener">${escapeHtml(label)}</a>`;
  }

  function msgDate(msg) {
    const m = (msg.timestamp || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }

  function reactionText(msg) {
    return (msg.reactions || []).map(r => `${r.user || '?'}: ${r.emoji || '?'}`).join(', ');
  }

  const STYLE = `
:root { color-scheme: light dark; }
body { margin: 0; padding: 24px 16px; font: 15px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fafafa; color: #1c1c1e; }
header { max-width: 720px; margin: 0 auto 24px; border-bottom: 1px solid #ddd; padding-bottom: 16px; }
h1 { font-size: 20px; margin: 0 0 8px; }
.meta { margin: 2px 0; font-size: 13px; color: #666; }
main { max-width: 720px; margin: 0 auto; }
.day { text-align: center; font-size: 12px; color: #888; margin: 20px 0 12px; }
.msg { margin: 0 0 10px; max-width: 78%; padding: 8px 12px; border-radius: 14px; background: #fff; border: 1px solid #e4e4e7; }
.msg.me { margin-left: auto; background: #dcf0ff; border-color: #c3e2fb; }
.head { font-size: 12px; color: #666; margin-bottom: 3px; display: flex; gap: 8px; justify-content: space-between; }
.sender { font-weight: 600; color: #1c1c1e; }
.text { white-space: pre-wrap; overflow-wrap: anywhere; }
.reply { border-left: 3px solid #b9b9be; padding-left: 8px; margin-bottom: 5px; font-size: 13px; color: #555; white-space: pre-wrap; }
.reactions { margin-top: 4px; font-size: 12px; color: #666; }
.system { max-width: 100%; text-align: center; background: none; border: none; color: #888; font-size: 12px; }
a { color: #0b6bcb; }
@media (prefers-color-scheme: dark) {
  body { background: #121214; color: #ececef; }
  header { border-color: #303034; }
  .msg { background: #1e1e21; border-color: #303034; }
  .msg.me { background: #123a56; border-color: #1a4f74; }
  .sender { color: #ececef; }
  a { color: #6cb6ff; }
}
`.trim();

  function renderMessage(msg) {
    const sender = escapeHtml(msg.sender || '?');
    const time = escapeHtml(msg.timestamp || '');

    if (msg.type === 'action_log') {
      return `<article class="msg system"><div class="text">${escapeHtml(msg.text || '')}</div></article>`;
    }

    const parts = [`<article class="msg${msg.sender === 'me' ? ' me' : ''}">`];
    parts.push(`<div class="head"><span class="sender">${sender}</span><time>${time}</time></div>`);

    if (msg.replyTo) {
      const rs = escapeHtml(msg.replyTo.sender || '?');
      parts.push(`<div class="reply">${rs}: ${escapeHtml(msg.replyTo.text || '')}</div>`);
    }

    // Media and links render as links, matching how the JSON references them.
    const url = msg.mediaUrl || msg.linkUrl;
    parts.push(`<div class="text">${url ? linkOrText(url, msg.text || url) : escapeHtml(msg.text || '')}</div>`);

    for (const extra of [msg.reelCaption, msg.clipCaption]) {
      if (extra) parts.push(`<div class="reply">${escapeHtml(extra)}</div>`);
    }

    const reactions = reactionText(msg);
    if (reactions) parts.push(`<div class="reactions">${escapeHtml(reactions)}</div>`);

    parts.push('</article>');
    return parts.join('');
  }

  function convertToHtml(data) {
    const chatWith = data.chatWith || 'Unknown';
    const participants = data.participants || [];
    const messages = data.messages || [];
    const dateRange = data.dateRange || {};

    const body = [];
    let currentDate = null;
    for (const msg of messages) {
      const date = msgDate(msg);
      if (date && date !== currentDate) {
        body.push(`<div class="day">${escapeHtml(date)}</div>`);
        currentDate = date;
      }
      body.push(renderMessage(msg));
    }

    const period = (dateRange.oldest || dateRange.newest)
      ? `<p class="meta">Period: ${escapeHtml(dateRange.oldest || '?')} to ${escapeHtml(dateRange.newest || '?')}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Chat with ${escapeHtml(chatWith)}</title>
<style>
${STYLE}
</style>
</head>
<body>
<header>
<h1>Chat with ${escapeHtml(chatWith)}</h1>
<p class="meta">Participants: ${escapeHtml(participants.join(', '))}</p>
${period}
<p class="meta">${messages.length} messages${data.extractedAt ? ` &middot; exported ${escapeHtml(data.extractedAt)}` : ''}</p>
</header>
<main>
${body.join('\n')}
</main>
</body>
</html>
`;
  }

  const CSV_HEADER = [
    'timestamp', 'timestamp_unix', 'sender', 'type', 'text',
    'media_url', 'reply_to_sender', 'reply_to_text', 'reactions',
  ];

  // RFC 4180: quote when the field holds a comma, quote or line break;
  // escape an embedded quote by doubling it.
  function csvCell(value) {
    const str = String(value ?? '');
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  }

  function convertToCsv(data) {
    const messages = data.messages || [];
    const rows = [CSV_HEADER];

    for (const msg of messages) {
      rows.push([
        msg.timestamp || '',
        msg.timestampUnix ?? '',
        msg.sender || '',
        msg.type || '',
        msg.text || '',
        msg.mediaUrl || msg.linkUrl || '',
        msg.replyTo ? (msg.replyTo.sender || '') : '',
        msg.replyTo ? (msg.replyTo.text || '') : '',
        reactionText(msg),
      ]);
    }

    // BOM so Excel reads it as UTF-8 (emoji, non-Latin names). CRLF per RFC 4180.
    return '\uFEFF' + rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  return { escapeHtml, csvCell, convertToHtml, convertToCsv };
})();
