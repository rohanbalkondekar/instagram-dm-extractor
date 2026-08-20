# Chrome Web Store listing

## Name

Instagram Chat Downloader & DM Export

## Summary

Export one Instagram conversation to files created in your browser.

## Description

Save one DM conversation from your own account as PDF, plain text, HTML, CSV, JSON, or Markdown.

Choose a date range, extract the messages, and keep the result on your computer. The extension also reports local statistics, including messages per sender, date range, response time, and message types.

Data handling:

- The extension runs only on `https://www.instagram.com/*`.
- It uses two first-party session cookies to request message data from the site's HTTPS API.
- It processes messages, usernames, timestamps, reactions, links, and media URLs in your browser.
- The PDF flow uses `chrome.storage.local` for one pending export. The print page removes that data after reading it.
- The developer does not receive conversation data or analytics.
- An opened HTML or PDF export can request message media from Meta hosts or Giphy.
- The popup and exported HTML include an optional link to a related extension's Chrome Web Store page. It does not install anything or affect exports.

How to use it:

1. Sign in on the supported website and open a DM conversation.
2. Select the extension icon.
3. Choose a date range and select Extract Messages.
4. Choose an export format.

Source and privacy policy: https://github.com/rohanbalkondekar/instagram-dm-extractor

This independent extension is not affiliated with, endorsed by, or sponsored by Meta.

## What is new

v2.4.2: Corrected data-handling disclosures, narrowed permissions, reduced listing repetition, and made release ZIPs reproducible. Export features are unchanged.
