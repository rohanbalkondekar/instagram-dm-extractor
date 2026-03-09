# Privacy Policy

**Instagram DM Chat Extractor**
**Effective date:** March 9, 2026

## Introduction

Instagram DM Chat Extractor ("the Extension") is an open-source browser extension that allows users to export their Instagram direct message conversations. This privacy policy explains how the Extension handles user data.

## Data Collection

The Extension does **not** collect, store, or transmit any personal data. Specifically:

- No personal information is collected.
- No usage data or analytics are collected.
- No cookies are set by the Extension.
- No data is sent to external servers, third-party services, or the developer.

## How the Extension Works

The Extension operates entirely within your browser. When you initiate an extraction:

1. It uses your existing Instagram session (cookies already present in your browser) to make requests to Instagram's web API.
2. Message data is processed locally in your browser's memory.
3. The exported file is saved directly to your device using the browser's built-in download functionality.

At no point does any data leave your browser or get transmitted to any server other than Instagram's own servers (which your browser is already communicating with).

## Permissions

The Extension requests the following browser permissions, each strictly necessary for its core functionality:

- **activeTab** — To detect whether the current tab is an Instagram DM conversation.
- **scripting** — To inject content scripts that interact with Instagram's messaging API.
- **Host access to instagram.com** — To make API requests to Instagram's servers for retrieving message data.

## Third-Party Services

The Extension does not integrate with or send data to any third-party services.

## Changes to This Policy

Any changes to this privacy policy will be posted in this repository. The effective date at the top of this document will be updated accordingly.

## Open Source

This Extension is open source and its complete source code is available for inspection at [github.com/rohanbalkondekar/instagram-dm-extractor](https://github.com/rohanbalkondekar/instagram-dm-extractor).

## Contact

If you have questions or concerns about this privacy policy, please open an issue on the [GitHub repository](https://github.com/rohanbalkondekar/instagram-dm-extractor/issues).
