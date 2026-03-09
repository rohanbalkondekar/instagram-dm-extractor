# Firefox AMO Listing — Instagram DM Chat Extractor

Copy-paste values for the **Describe Add-on** submission form on [addons.mozilla.org](https://addons.mozilla.org).

---

## Name

```
Instagram DM Chat Extractor
```

## Summary (250 chars max)

```
Extract Instagram DM conversations as JSON and Markdown
```

## Description (Markdown supported)

```
Extract your Instagram DM conversations directly from the browser — no data ever leaves your machine.

**Features:**
- **Chat name resolution** — shows contact names, not cryptic thread IDs
- **Date filtering** — all messages, past 1/7/30 days, or a custom range
- **Adaptive speed** — starts fast, backs off on rate limits
- **Stats** — per-sender counts, response times, conversation initiations, message types
- **Dual export** — JSON (structured) + Markdown (LLM-ready with metadata header)

Open source (MIT). Full source code: [github.com/rohanbalkondekar/instagram-dm-extractor](https://github.com/rohanbalkondekar/instagram-dm-extractor)
```

## Experimental

- [ ] This add-on is experimental

## Requires payment

- [ ] This add-on requires payment

## Categories

1. Social & Communication
2. Download Management

## Support email

```
(leave blank or fill in your email)
```

## Support website

```
https://github.com/rohanbalkondekar/instagram-dm-extractor
```

## License

```
MIT License
```

## Privacy Policy

Select **Yes**, then paste:

```
Instagram DM Chat Extractor ("the Extension") is an open-source browser extension that allows users to export their Instagram direct message conversations.

Data Collection:
The Extension does NOT collect, store, or transmit any personal data. No personal information is collected. No usage data or analytics are collected. No cookies are set by the Extension. No data is sent to external servers, third-party services, or the developer.

How it works:
The Extension operates entirely within your browser. It uses your existing Instagram session cookies to make requests to Instagram's web API. Message data is processed locally in your browser's memory. The exported file is saved directly to your device using the browser's built-in download functionality. At no point does any data leave your browser or get transmitted to any server other than Instagram's own servers.

Permissions:
- activeTab — detect whether the current tab is an Instagram DM conversation
- scripting — inject content scripts that interact with Instagram's messaging API
- Host access to instagram.com — make API requests for retrieving message data

The Extension does not integrate with or send data to any third-party services.

Full policy: https://github.com/rohanbalkondekar/instagram-dm-extractor/blob/main/docs/PRIVACY.md
```

## Notes to Reviewer

```
How to test:

1. You need an Instagram account (instagram.com).
2. Log in and open any DM conversation (instagram.com/direct/inbox/, then click a thread).
3. Click the extension icon in the toolbar.
4. The popup shows the chat name and a date-range picker.
5. Select a date range (or leave "All messages") and click "Extract Messages".
6. The extension scrolls through messages via Instagram's web API.
7. Once complete, click "Download JSON" or "Download MD" to save the export locally.

No external services are contacted — all data stays in the browser. The extension only activates on instagram.com pages.

Source code: https://github.com/rohanbalkondekar/instagram-dm-extractor
```
