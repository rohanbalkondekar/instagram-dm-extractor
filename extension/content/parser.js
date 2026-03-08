/**
 * Message parsing — port of extract_chat.py:265-428
 * Shared execution context with other content scripts.
 */

/* exported ChatParser */
// eslint-disable-next-line no-var
var ChatParser = (() => {
  'use strict';

  function formatTs(tsMicro) {
    if (!tsMicro) return '?';
    const ms = typeof tsMicro === 'number' && tsMicro > 1e15
      ? Math.floor(tsMicro / 1000)
      : tsMicro;
    const dt = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())} ` +
      `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())} UTC`;
  }

  function buildUserMap(threadInfo, myUserId) {
    const userMap = {};
    for (const u of (threadInfo.users || [])) {
      const pk = u.pk ?? u.pk_id;
      if (pk != null) {
        userMap[Number(pk)] = u.username || `user_${pk}`;
      }
    }
    userMap[myUserId] = 'me';

    const inviter = threadInfo.inviter;
    if (inviter) {
      const pk = inviter.pk;
      if (pk && Number(pk) !== myUserId) {
        userMap[Number(pk)] = inviter.username || `user_${pk}`;
      }
    }
    return userMap;
  }

  function parseMessage(item, myUserId, userMap) {
    const ts = item.timestamp || 0;
    const userId = item.user_id || 0;
    const itemType = item.item_type || 'unknown';
    const sender = Number(userId) === myUserId
      ? 'me'
      : (userMap[Number(userId)] || `user_${userId}`);

    const msg = {
      id: item.item_id || '',
      sender,
      timestamp: formatTs(ts),
      timestampUnix: ts ? Math.floor(ts / 1_000_000) : 0,
      type: itemType,
    };

    switch (itemType) {
      case 'text':
        msg.text = item.text || '';
        break;

      case 'media': {
        const media = item.media || {};
        const mediaType = media.media_type || 1;
        const label = mediaType === 2 ? '[Video]' : '[Photo]';
        const candidates = (media.image_versions2 || {}).candidates || [];
        let url = candidates.length ? candidates[0].url : null;
        if (mediaType === 2) {
          const vv = media.video_versions || [];
          if (vv.length) url = vv[0].url || url;
        }
        msg.text = label;
        if (url) msg.mediaUrl = url;
        break;
      }

      case 'media_share': {
        const shared = item.media_share || {};
        const caption = shared.caption || {};
        const captionText = caption.text || '';
        const user = (shared.user || {}).username || '';
        msg.text = user ? `[Shared post by @${user}]` : '[Shared post]';
        if (captionText) msg.text += `: ${captionText.slice(0, 100)}`;
        break;
      }

      case 'reel_share': {
        const reel = item.reel_share || {};
        const reactionText = reel.text || '';
        const reelMedia = reel.media || {};
        const caption = reelMedia.caption || {};
        const captionText = caption.text || '';
        const reelOwner = (reelMedia.user || {}).username || '';
        msg.text = reactionText || '[Reel share]';
        if (captionText) msg.reelCaption = captionText.slice(0, 200);
        if (reelOwner) msg.reelOwner = reelOwner;
        break;
      }

      case 'story_share': {
        const story = item.story_share || {};
        const storyMessage = story.message || '';
        msg.text = storyMessage ? `[Story share: ${storyMessage}]` : '[Story share]';
        break;
      }

      case 'voice_media': {
        const voice = item.voice_media || {};
        const media = voice.media || {};
        const audio = media.audio || {};
        const url = audio.audio_src || '';
        const duration = audio.duration || 0;
        msg.text = duration ? `[Voice message (${duration}ms)]` : '[Voice message]';
        if (url) msg.mediaUrl = url;
        break;
      }

      case 'animated_media': {
        const anim = item.animated_media || {};
        const images = anim.images || {};
        const url = (images.fixed_height || {}).url || '';
        msg.text = '[GIF]';
        if (url) msg.mediaUrl = url;
        break;
      }

      case 'link': {
        const link = item.link || {};
        const text = link.text || '';
        const linkCtx = link.link_context || {};
        const url = linkCtx.link_url || '';
        msg.text = text || url || '[Link]';
        if (url) msg.linkUrl = url;
        break;
      }

      case 'clip': {
        const clip = (item.clip || {}).clip || {};
        const caption = clip.caption || {};
        const captionText = caption.text || '';
        const owner = (clip.user || {}).username || '';
        msg.text = owner ? `[Clip by @${owner}]` : '[Clip]';
        if (captionText) msg.clipCaption = captionText.slice(0, 200);
        break;
      }

      case 'placeholder': {
        const placeholder = item.placeholder || {};
        msg.text = placeholder.message || '[Message unavailable]';
        break;
      }

      case 'action_log': {
        const action = item.action_log || {};
        msg.text = action.description || '[Action]';
        break;
      }

      case 'raven_media':
        msg.text = '[Disappearing photo/video]';
        break;

      case 'xma':
      case 'xma_media_share': {
        let xma = item.xma_media_share || item.xma || {};
        if (Array.isArray(xma) && xma.length) xma = xma[0];
        let title = '';
        if (xma && typeof xma === 'object') {
          title = xma.title_text || xma.caption_body_text || '';
        }
        msg.text = title ? `[Shared content: ${title}]` : '[Shared content]';
        break;
      }

      default:
        msg.text = `[Unsupported: ${itemType}]`;
        msg.rawData = item;
    }

    // Replied-to message
    const replied = item.replied_to_message;
    if (replied) {
      const repliedUserId = replied.user_id || 0;
      const repliedSender = Number(repliedUserId) === myUserId
        ? 'me'
        : (userMap[Number(repliedUserId)] || `user_${repliedUserId}`);
      let repliedText = replied.text || '';
      if (!repliedText && replied.item_type === 'media') {
        repliedText = '[Media]';
      }
      msg.replyTo = { sender: repliedSender, text: repliedText };
    }

    // Reactions
    const reactions = item.reactions || {};
    const likes = reactions.likes || [];
    const emojis = reactions.emojis || [];
    const allReactions = [];
    for (const r of likes) {
      const rSender = Number(r.sender_id || 0) === myUserId
        ? 'me'
        : (userMap[Number(r.sender_id || 0)] || '?');
      allReactions.push({ user: rSender, emoji: '\u2764\uFE0F' });
    }
    for (const r of emojis) {
      const rSender = Number(r.sender_id || 0) === myUserId
        ? 'me'
        : (userMap[Number(r.sender_id || 0)] || '?');
      allReactions.push({ user: rSender, emoji: r.emoji || '?' });
    }
    if (allReactions.length) msg.reactions = allReactions;

    return msg;
  }

  function buildOutput(threadInfo, messages, myUserId, userMap) {
    let title = threadInfo.thread_title || '';
    if (!title) {
      const users = threadInfo.users || [];
      title = users.map(u => u.username || '?').join(', ');
    }

    const participants = [];
    for (const [uid, uname] of Object.entries(userMap)) {
      if (Number(uid) === myUserId) {
        participants.unshift(`me (${threadInfo.viewer_id || myUserId})`);
      } else {
        participants.push(uname);
      }
    }

    const dateRange = {};
    if (messages.length) {
      dateRange.oldest = messages[0].timestamp;
      dateRange.newest = messages[messages.length - 1].timestamp;
    }

    return {
      extractedAt: new Date().toISOString(),
      chatWith: title,
      threadId: threadInfo.thread_id || '',
      participants,
      messageCount: messages.length,
      dateRange,
      messages,
    };
  }

  return { formatTs, buildUserMap, parseMessage, buildOutput };
})();
