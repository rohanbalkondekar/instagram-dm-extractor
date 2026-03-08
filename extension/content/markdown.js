/**
 * JSON-to-Markdown conversion — port of json_to_md.py
 * Shared execution context with other content scripts.
 */

/* exported ChatMarkdown */
// eslint-disable-next-line no-var
var ChatMarkdown = (() => {
  'use strict';

  function cleanInstagramUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname && parsed.hostname.includes('instagram.com')) {
        const u = parsed.searchParams.get('u');
        if (u) return decodeURIComponent(u);
      }
    } catch (_) { /* not a valid URL */ }
    return url;
  }

  function shouldIncludeReply(messages, idx, replyTo, window) {
    if (window === 0) return true;
    const replyText = replyTo.text || '';
    const replySender = replyTo.sender || '';
    const start = Math.max(0, idx - window);
    for (let i = start; i < idx; i++) {
      const m = messages[i];
      if (m.sender === replySender && (m.text || '') === replyText) {
        return false;
      }
    }
    return true;
  }

  function formatMessage(msg, senderMap, messages, idx, replyWindow) {
    if (msg.type === 'action_log') return null;

    const ts = msg.timestamp || '';
    let timeStr = '??:??';
    // Parse "2026-03-03 12:18:26 UTC"
    const m = ts.match(/(\d{2}):(\d{2}):\d{2}/);
    if (m) timeStr = `${m[1]}:${m[2]}`;

    const sender = senderMap[msg.sender] || msg.sender || '?';

    let text = msg.text || '';

    // Clean Instagram redirect URLs in link messages
    if (msg.type === 'link' && msg.linkUrl) {
      text = cleanInstagramUrl(msg.linkUrl);
    }

    // Replace newlines with " | "
    text = text.replace(/\n+/g, ' | ');

    const parts = [`[${timeStr}] ${sender}: ${text}`];

    // Reply context
    const replyTo = msg.replyTo;
    if (replyTo && shouldIncludeReply(messages, idx, replyTo, replyWindow)) {
      const replySender = senderMap[replyTo.sender] || replyTo.sender || '?';
      let replyText = (replyTo.text || '').replace(/\n/g, ' | ');
      if (replyText.length > 40) replyText = replyText.slice(0, 40) + '...';
      parts.push(` (re ${replySender}: "${replyText}")`);
    }

    // Reactions
    for (const r of (msg.reactions || [])) {
      const rUser = senderMap[r.user] || r.user || '?';
      parts.push(` [${rUser}:${r.emoji}]`);
    }

    return parts.join('');
  }

  function formatStatsBlock(stats) {
    if (!stats) return '';
    const lines = [];
    lines.push('## Metadata');
    lines.push(`- Messages: ${stats.messageCount}`);
    lines.push(`- Avg/day: ${stats.avgPerDay}`);
    if (stats.duration) lines.push(`- Extraction duration: ${stats.duration}`);

    const senderEntries = Object.entries(stats.perSender || {});
    if (senderEntries.length) {
      lines.push(`- Messages per sender: ${senderEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }

    const initEntries = Object.entries(stats.initiations || {});
    if (initEntries.length) {
      lines.push(`- Conversation initiations: ${initEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }

    const rtEntries = Object.entries(stats.responseTime || {});
    if (rtEntries.length) {
      lines.push(`- Avg response time: ${rtEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }

    const typeEntries = Object.entries(stats.typeBreakdown || {});
    if (typeEntries.length) {
      lines.push(`- Message types: ${typeEntries.map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    }

    return lines.join('\n');
  }

  function convertToMarkdown(data, stats, replyWindow = 2) {
    const chatWith = data.chatWith || 'Unknown';
    const participants = data.participants || [];
    const messages = data.messages || [];
    const dateRange = data.dateRange || {};

    // Determine other participant
    let otherUsername = null;
    for (const p of participants) {
      if (!p.startsWith('me')) {
        otherUsername = p;
        break;
      }
    }
    if (!otherUsername) otherUsername = 'unknown';
    const abbreviation = otherUsername[0].toUpperCase();

    const senderMap = { me: 'me' };
    if (otherUsername) senderMap[otherUsername] = abbreviation;

    // Date range
    function extractDate(tsStr) {
      const match = (tsStr || '').match(/^(\d{4}-\d{2}-\d{2})/);
      return match ? match[1] : '?';
    }
    const oldestDate = extractDate(dateRange.oldest);
    const newestDate = extractDate(dateRange.newest);

    const lines = [];
    lines.push(`# Chat: me <> ${chatWith} (${otherUsername})`);
    lines.push(`# ${abbreviation} = ${otherUsername}`);
    lines.push(`# Period: ${oldestDate} to ${newestDate}`);
    lines.push('');

    const statsBlock = formatStatsBlock(stats);
    if (statsBlock) {
      lines.push(statsBlock);
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    let currentDate = null;

    for (let idx = 0; idx < messages.length; idx++) {
      const msg = messages[idx];
      const ts = msg.timestamp || '';
      const dateMatch = ts.match(/^(\d{4}-\d{2}-\d{2})/);
      const msgDate = dateMatch ? dateMatch[1] : null;

      if (msgDate && msgDate !== currentDate) {
        if (currentDate !== null) lines.push('');
        lines.push(`--- ${msgDate} ---`);
        currentDate = msgDate;
      }

      const formatted = formatMessage(msg, senderMap, messages, idx, replyWindow);
      if (formatted) lines.push(formatted);
    }

    return lines.join('\n') + '\n';
  }

  return { cleanInstagramUrl, convertToMarkdown };
})();
