# Privacy Policy — Instagram DM Chat Extractor

**Last updated:** March 9, 2026

## Summary

This extension runs entirely in your browser. No data is collected, stored, or transmitted to any external server.

## Data handling

- All message extraction happens locally using Instagram's web API and your existing session cookies.
- Exported files (JSON/Markdown) are saved directly to your device via the browser's download API.
- No analytics, telemetry, or tracking of any kind is included.
- No user data is sent to the extension developer or any third party.

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Detect if you're on an Instagram DM page and read the contact name |
| `scripting` | Inject content scripts to fetch messages from Instagram's API |
| `host_permissions` (instagram.com) | Access Instagram's DM API endpoints to read message history |

## Contact

If you have questions about this policy, open an issue at [github.com/rohanbalkondekar/instagram-dm-extractor](https://github.com/rohanbalkondekar/instagram-dm-extractor/issues).
