/**
 * Chat statistics computation.
 * Shared execution context with other content scripts.
 */

/* exported ChatStats */
// eslint-disable-next-line no-var
var ChatStats = (() => {
  'use strict';

  const INITIATION_GAP = 4 * 3600;   // 4 hours in seconds
  const RESPONSE_TIME_CAP = 24 * 3600; // ignore gaps > 24h

  function formatDuration(seconds) {
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  function computeStats(messages, durationText) {
    const result = {
      duration: durationText,
      messageCount: messages.length,
      dateRange: {},
      avgPerDay: 0,
      perSender: {},
      typeBreakdown: {},
      initiations: {},
      responseTime: {},
    };

    if (!messages.length) return result;

    // Date range
    const oldestUnix = messages[0].timestampUnix;
    const newestUnix = messages[messages.length - 1].timestampUnix;
    result.dateRange = {
      oldest: messages[0].timestamp,
      newest: messages[messages.length - 1].timestamp,
    };

    // Avg per day
    const daySpan = (newestUnix - oldestUnix) / 86400;
    result.avgPerDay = daySpan > 0 ? Math.round((messages.length / daySpan) * 10) / 10 : messages.length;

    // Per sender + type breakdown
    for (const msg of messages) {
      result.perSender[msg.sender] = (result.perSender[msg.sender] || 0) + 1;
      result.typeBreakdown[msg.type] = (result.typeBreakdown[msg.type] || 0) + 1;
    }

    // Initiations (gap >= 4h from previous message)
    result.initiations[messages[0].sender] = 1; // first message always counts
    for (let i = 1; i < messages.length; i++) {
      const gap = messages[i].timestampUnix - messages[i - 1].timestampUnix;
      if (gap >= INITIATION_GAP) {
        result.initiations[messages[i].sender] = (result.initiations[messages[i].sender] || 0) + 1;
      }
    }

    // Response time (when sender changes, record delay; ignore >24h gaps)
    const responseTimes = {}; // sender -> [delays]
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].sender !== messages[i - 1].sender) {
        const delay = messages[i].timestampUnix - messages[i - 1].timestampUnix;
        if (delay > 0 && delay <= RESPONSE_TIME_CAP) {
          const sender = messages[i].sender;
          if (!responseTimes[sender]) responseTimes[sender] = [];
          responseTimes[sender].push(delay);
        }
      }
    }
    for (const [sender, times] of Object.entries(responseTimes)) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      result.responseTime[sender] = formatDuration(avg);
    }

    return result;
  }

  return { computeStats, formatDuration };
})();
