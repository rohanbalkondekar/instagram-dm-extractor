/**
 * Background service worker — badge updates during extraction.
 */

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

browserAPI.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'UPDATE_BADGE') {
    const text = msg.count > 0 ? String(msg.count) : '';
    browserAPI.action.setBadgeText({ text });
    browserAPI.action.setBadgeBackgroundColor({ color: '#0095f6' });
  }
});
