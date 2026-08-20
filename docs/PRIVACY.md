# Privacy Policy

**Instagram Chat Downloader & DM Export**

**Effective date:** August 21, 2026

## Scope

The extension exports a direct-message conversation that you choose from your signed-in account. It processes the data in your browser. The developer does not receive or retain your account or conversation data.

## Data the extension handles

The extension handles these data types only for the export that you request:

- Instagram account identifiers and usernames
- Personal communications, reactions, timestamps, and message metadata
- Website content, links, and media URLs in the conversation
- Authentication information: the `csrftoken` and `ds_user_id` cookies from your existing session

The extension does not collect analytics, create an advertising profile, or send conversation data to the developer.

## Processing and storage

The extension sends HTTPS requests to Instagram's web API through your signed-in session. It processes the response in the content script's memory and creates the selected file in your browser.

For PDF export, the extension writes one pending export to `chrome.storage.local`. The print page removes it after reading it. If the print page does not open or finish loading, the pending export can remain until another PDF export overwrites it, you clear the extension's data, or you remove the extension.

## Remote media

An HTML or PDF export can display media URLs included in the conversation. Opening that export can make direct requests to Instagram or Meta media hosts and Giphy. Those services receive the normal request data needed to return the media, such as the media URL, IP address, and browser headers. The extension does not send the full conversation or message text with those requests.

The popup and exported HTML also contain an optional link to the Instagrow Chrome Web Store page. The browser contacts the Chrome Web Store only if you select that link.

## Permissions

- **scripting** lets the popup communicate with the packaged content scripts on the supported site.
- **storage** holds the pending local PDF export described above.
- **Access to `https://www.instagram.com/*`** lets the extension read the chosen conversation and call the site's API.

The extension does not request the Chrome cookies permission. It reads the two named first-party cookies from the page context.

## Limited Use

The extension uses the handled data only to provide the user-requested conversation export and related local statistics. The developer does not sell, transfer, or use this data for advertising, credit decisions, or human review.

The extension's use of user data complies with the Chrome Web Store User Data Policy, including its Limited Use requirements.

## Security

Requests to the site and its media hosts use HTTPS. Export processing stays in the browser. The source code is available for inspection at [github.com/rohanbalkondekar/instagram-dm-extractor](https://github.com/rohanbalkondekar/instagram-dm-extractor).

## Changes and contact

Policy changes will appear in this repository with a new effective date. Open a question or report at the [GitHub issue tracker](https://github.com/rohanbalkondekar/instagram-dm-extractor/issues).
