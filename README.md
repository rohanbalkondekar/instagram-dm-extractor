<p align="center">
  <img src="screenshots/promo-marquee.png" alt="Instagram DM Chat Extractor" width="700" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue?style=flat-square" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/license-MIT-yellow?style=flat-square" alt="MIT License" />
  <a href="https://chromewebstore.google.com/detail/instagram-dm-chat-extract/emfaleblgmheiblldkceadiokffhgcje"><img src="https://img.shields.io/chrome-web-store/rating/emfaleblgmheiblldkceadiokffhgcje?label=Chrome&style=flat-square" alt="Chrome Web Store Rating" /></a>
  <a href="https://addons.mozilla.org/en-US/firefox/addon/instagram-dm-chat-extractor/"><img src="https://img.shields.io/amo/rating/instagram-dm-chat-extractor?label=Firefox&style=flat-square" alt="Firefox Add-ons Rating" /></a>
  <a href="https://youtu.be/fIPEUwBmvj8"><img src="https://img.shields.io/badge/▶_demo-FF0000?style=flat-square&logo=youtube&logoColor=white" alt="Watch Demo" /></a>
</p>

***

<table>
  <thead>
    <tr>
      <th>Browser</th>
      <th>Install from</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/chrome/chrome_48x48.png" height="40" alt="Chrome"></td>
      <td><a href="https://chromewebstore.google.com/detail/instagram-dm-chat-extract/emfaleblgmheiblldkceadiokffhgcje">Chrome Web Store</a></td>
    </tr>
    <tr>
      <td><img src="https://cdnjs.cloudflare.com/ajax/libs/browser-logos/74.1.0/firefox/firefox_48x48.png" height="40" alt="Firefox"></td>
      <td><a href="https://addons.mozilla.org/en-US/firefox/addon/instagram-dm-chat-extractor/">Firefox Add-ons</a></td>
    </tr>
  </tbody>
</table>

***

## Features

| Feature | Description |
|---|---|
| **Chat name resolution** | Shows the contact name before extraction — no cryptic thread IDs |
| **Date filtering** | All messages, past 1/7/30 days, or a custom range |
| **Adaptive speed** | Starts fast, backs off on rate limits |
| **Stats** | Per-sender counts, response times, conversation initiations, message types |
| **Dual export** | JSON (structured) + Markdown (LLM-ready with metadata header) |

## Screenshots

<table>
  <tr>
    <td align="center"><img src="screenshots/screenshot-ready.png" width="400" /><br /><em>Open a DM and click Extract</em></td>
    <td align="center"><img src="screenshots/screenshot-datefilter.png" width="400" /><br /><em>Filter by custom date range</em></td>
  </tr>
  <tr>
    <td align="center"><img src="screenshots/screenshot-extracting.png" width="400" /><br /><em>Live progress tracking</em></td>
    <td align="center"><img src="screenshots/screenshot-complete.png" width="400" /><br /><em>Conversation stats and export</em></td>
  </tr>
</table>

## Install (development)

**Chrome / Chromium:**
1. Clone this repo
2. Go to `chrome://extensions` → enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. **Load Temporary Add-on** → select `extension/manifest.json`

## Usage

1. Open a DM conversation on [instagram.com](https://www.instagram.com)
2. Click the extension icon
3. Pick a date range → **Extract Messages**
4. Download as **JSON** or **MD**

## How it works

Uses Instagram's web DM API (`/api/v1/direct_v2/threads/`) — the same one the webapp uses. Reads your session cookies to authenticate, paginates through messages, parses 15+ message types, and exports locally. **No data leaves your browser.**

## License

[MIT](LICENSE)
