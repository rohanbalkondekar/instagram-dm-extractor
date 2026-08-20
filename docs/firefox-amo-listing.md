# Firefox AMO listing: Instagram Chat Downloader & DM Export

Copy these values into the **Describe Add-on** form on [addons.mozilla.org](https://addons.mozilla.org).

## Name

```text
Instagram Chat Downloader & DM Export
```

## Summary

```text
Export one Instagram conversation to files created in your browser.
```

## Description

```markdown
Save one DM conversation from your own account as PDF, plain text, HTML, CSV, JSON, or Markdown.

Features:
- Contact and group names
- Preset and custom date ranges
- Adaptive request pacing
- Local conversation statistics
- Permanent links for shared posts, reels, and profiles

The developer does not receive your account or conversation data. An opened HTML or PDF export can request message media from Meta hosts or Giphy. The popup and exported HTML include an optional link to a related extension's Chrome Web Store page.

Open source under the MIT License: [github.com/rohanbalkondekar/instagram-dm-extractor](https://github.com/rohanbalkondekar/instagram-dm-extractor)
```

## Experimental

- [ ] This add-on is experimental

## Requires payment

- [ ] This add-on requires payment

## Categories

1. Social & Communication
2. Download Management

## Support website

```text
https://github.com/rohanbalkondekar/instagram-dm-extractor
```

## License

```text
MIT License
```

## Privacy Policy

Select **Yes** and use the canonical policy:

```text
https://github.com/rohanbalkondekar/instagram-dm-extractor/blob/main/docs/PRIVACY.md
```

The policy discloses these data types and behaviors:

- Instagram account identifiers and usernames
- Personal communications and message metadata
- Website content, links, and media URLs
- The first-party `csrftoken` and `ds_user_id` cookies
- The pending PDF export in local extension storage
- Direct media requests to Instagram or Meta hosts and Giphy
- The Limited Use terms

## Notes to Reviewer

```text
How to test:

1. Sign in at instagram.com.
2. Open a DM conversation.
3. Select the extension icon.
4. Choose a date range and select Extract Messages.
5. Save the result as PDF, text, HTML, CSV, JSON, or Markdown.
6. Confirm that the PDF print page removes igdmPendingPdf from local extension storage after reading it.

Permissions:
- scripting communicates with the packaged content scripts on the supported site.
- storage holds one pending local PDF export.
- https://www.instagram.com/* access reads the chosen conversation and calls the site's API.

The developer does not receive account or conversation data. An opened HTML or PDF export can request message media from Meta hosts or Giphy.

Source code and privacy policy:
https://github.com/rohanbalkondekar/instagram-dm-extractor
```
