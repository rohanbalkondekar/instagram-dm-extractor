# Release 2.3.0

> **STATUS: DRAFT. REQUIRES OWNER APPROVAL.**
> Nothing in this file has been submitted, published, or uploaded to any store.
> Every block marked `DRAFT COPY` is a proposal. The owner picks one, edits it, or
> rejects all of them before anything ships.

---

## 1. What changed since 2.2.0

| Change | File | Why |
|---|---|---|
| HTML export | `extension/content/exporters.js` | New format. Single self-contained file, no external requests |
| CSV export | `extension/content/exporters.js` | New format. RFC 4180, UTF-8 BOM for Excel |
| Popup buttons for both | `popup.html`, `popup.js`, `downloader.js`, `content.js` | Wiring |
| `exporters.js` registered in **both** injection paths | `manifest.json` `content_scripts`, `popup.js` `CONTENT_SCRIPTS` | These two lists must stay in sync. A script in one and not the other fails only on the path that missed it |
| Escaping tests | `test/exporters.test.js` | 7 tests, `npm test`, zero dependencies |
| Version `2.2.0` to `2.3.0` | `extension/manifest.json` | Minor bump: two new features, no breaking change, no new permission |
| `background.service_worker` restored | `extension/manifest.json` | See below. This is the one item that must not be dropped |
| `npm run package` | `package.json` | Repeatable submission zip |

### The `background.service_worker` line

`main` carries `"background": { "scripts": ["background.js"] }` with no
`service_worker` key. That key was removed in `c600319` ("Fix Firefox AMO
validation") because Firefox uses `scripts`.

The zip attached to the v2.2.0 GitHub release for Chrome carries **both** keys.
So the repo manifest since March has been the Firefox-shaped manifest, and the
Chrome package that actually shipped was a different file that never came back
into git.

Chrome MV3 requires `background.service_worker`. Packaging `main` as-is would
have shipped a Chrome build whose background script never runs, which kills the
extraction-progress badge, and would likely fail upload validation outright.

2.3.0 restores both keys in the single tracked manifest. Firefox reads
`scripts`, Chrome reads `service_worker`, and the repo stops carrying a manifest
that cannot ship to the store it is published on.

**If AMO rejects the package on the `service_worker` key**, delete that one line
and repackage for Firefox only. Do not delete it from the Chrome package.

---

## 2. Packaging

```bash
npm test        # must be 7/7
npm run package # writes dist/instagram-dm-extractor.zip and prints its contents
```

The zip is `extension/` zipped **from inside**, so `manifest.json` sits at the
root. That is what both stores require. Dotfiles are excluded. `dist/` is
gitignored.

Expected contents, 16 files:

```
manifest.json  background.js
popup/popup.html  popup/popup.js  popup/popup.css
content/parser.js  content/markdown.js  content/exporters.js
content/downloader.js  content/stats.js  content/extractor.js  content/content.js
icons/icon16.png  icons/icon48.png  icons/icon128.png  icons/icon.svg
```

Nothing else. No `.git`, no `test/`, no `node_modules`, no `screenshots/`, no
`output/`, no zips inside the zip.

### How this differs from the v2.2.0 release

The v2.2.0 GitHub release carries two hand-made assets and no script produced
them:

- `instagram-dm-extractor.zip`, nested under an `extension/` folder. A store
  upload cannot use that shape, so this was the "load unpacked" convenience
  asset, not the submission package.
- `firefox-addon.zip`, root-level, correct store shape, Firefox manifest.

The exact file uploaded to the Chrome Web Store for 2.2.0 is **not recoverable
from this repo**. The nearest evidence is the Chrome manifest embedded in the
first zip. `npm run package` reproduces the correct shape (root-level, same as
`firefox-addon.zip`) from the tracked source, which the previous release did
not have. One zip now serves both stores and load-unpacked.

---

## 3. Store listing copy, DRAFT COPY, requires owner approval

### 3.1 Title: recommend NO CHANGE this release

Current, 27 characters, keep exactly:

```
Instagram DM Chat Extractor
```

Reasoning:

- The title is the field that carries the existing ranking. Published research on
  997 store-listing title changes found roughly 30% of changes gained position and
  roughly 30% lost it. That is a coin flip on the one field that currently earns.
- The short description is the semantic-match field, it holds no ranking hostage,
  and it can absorb every new keyword. Change the field that is free to change,
  not the field that is not.
- Changing the title and the description in the same release also makes the result
  unattributable. Ship the description change, watch it, then decide on the title
  with data instead of a coin flip.

If the owner wants a title change anyway, the rule is **append only**. Every word
of the current title survives, unchanged, in order, at the front. Nothing is
removed or reordered.

```
Instagram DM Chat Extractor - Export & Backup Messages
```
54 of 75 characters. Adds `export` and `backup`. Shortest possible append, least
likely to read as keyword stuffing.

### 3.2 Short description, 132 character limit

This field is prefilled from the manifest `description`, so changing it properly
means editing `extension/manifest.json` and shipping it with this version. The
manifest currently still says:

```
Extract Instagram DM conversations as JSON and Markdown
```

That line is now **factually wrong**. The extension ships four formats. It is
also spending all 55 characters on words nobody searches: "conversations" is not
a query, "export", "save" and "backup" are.

**Variant S1, 113 characters. RECOMMENDED.**

```
Export Instagram chat to HTML, CSV, JSON or Markdown. Save Instagram messages locally, in full, nothing uploaded.
```

Line by line:

- `Export Instagram chat` opens with the exact phrase of a target query, and with
  the verb a person types. The two extensions currently surviving on these queries
  both lead with the same idea.
- `to HTML, CSV, JSON or Markdown` puts HTML first. Both surviving competitors on
  these queries lead with HTML, and one of them sells HTML-with-media as a paid
  upgrade. Leading with HTML is category parity, and four formats against their
  one is the visible difference in a results list.
- `Save Instagram messages` is the second target query, exact and contiguous.
- `locally, in full` is the whole pitch in three words. `in full` answers the
  message caps used elsewhere in this category without naming anyone.
- `nothing uploaded` is the closing differentiator and it is checkable against the
  source.

**Variant S2, 115 characters.** Highest keyword coverage, highest spam-policy risk.

```
Instagram DM export to HTML, CSV, JSON or Markdown. Save Instagram messages and export Instagram chat in one click.
```

Carries all three target phrases exactly, including `Instagram DM export`. It also
says "Instagram" three times in 115 characters, which is the closest any variant
gets to the repetitive-keyword rule. Use only if S1 underperforms.

**Variant S3, 121 characters.** Best hook, weakest keywords.

```
Back up Instagram messages before they disappear. Export Instagram chat to HTML, CSV, JSON or Markdown, nothing uploaded.
```

`before they disappear` names the reason people actually search for this: messages
can be unsent from both sides, accounts get lost, and the platform has prompted
users to back up before deletion. It is the better advert. It drops
`save instagram messages` as an exact phrase, so it is the worse listing.

### 3.3 Detailed description, DRAFT COPY

```
Export any Instagram DM thread to HTML, CSV, JSON or Markdown, straight from
your browser. No account, no signup, no message cap, and nothing is uploaded
anywhere.

WHY NOT THE OFFICIAL DATA DOWNLOAD

People keep finding out what is missing only after they need it. Media the other
person sent does not always come through. Whole conversations can be absent.
Whole years can be absent. And it can take up to 48 hours to arrive, as a raw
dump you then have to dig through.

This reads the conversation that is open in front of you, right now, and writes
the file in seconds. What you see in the thread is what lands in the file.

FOUR FORMATS

HTML. One self-contained file. Open it in any browser, offline, forever. Styled
like a chat, with light and dark mode. It loads nothing from the network when
you open it, so it still reads the same in ten years.

CSV. Opens straight in Excel, Numbers or Google Sheets. UTF-8 with a byte order
mark, so emoji and non-Latin names survive the trip. Proper RFC 4180 quoting, so
a comma or a line break inside a message does not shift your columns.

JSON. Every field, structured, for scripts, archives and anything you want to
build on top.

Markdown. With a metadata header, ready to paste into an LLM or a notes app.

ALSO IN THE BOX

- Contact name resolution, so files are named after the person, not a thread ID
- Date filtering: everything, the past 1, 7 or 30 days, or a custom range
- Adaptive speed that starts fast and backs off when Instagram rate limits
- Conversation stats: per-sender counts, response times, who started chats,
  message types
- 15+ message types parsed, including replies, reactions, links and shared media

PRIVACY, CHECKABLE

Two permissions, activeTab and scripting. One site, instagram.com. The only
network request this extension makes is a GET to Instagram's own API, the same
one the website itself uses. No server of ours, no analytics, no account, no
telemetry. Nothing leaves your browser.

Open source under the MIT license, so none of that has to be taken on trust:
github.com/rohanbalkondekar/instagram-dm-extractor
```

Reasoning per block:

- **Opening line.** Formats first, HTML first, then the three objections that stop
  an install: signup, caps, upload. "No message cap" is the single sharpest line in
  the draft, because caps are the standard model in this category.
- **Why not the official data download.** This is the real pitch. The demand is
  not convenience, it is data integrity, and the alternative that everyone tries
  first is the platform's own export. Every defect listed is drawn from users
  reporting it in public, so each is hedged ("does not always", "can be") rather
  than asserted as a general fact about someone else's product. **Owner should
  sanity-check the 48 hours figure against Instagram's current stated wait before
  publishing.**
- **Four formats.** Each format sells its own objection: HTML sells permanence,
  CSV sells "my export did not break in Excel", JSON sells control, Markdown sells
  the LLM use case. The BOM and RFC 4180 details are there because the people who
  care about them are the people who have been burned by an export that lost their
  emoji or split a row.
- **Also in the box.** Existing shipped features, unchanged claims.
- **Privacy, checkable.** The loudest recurring fear in this category is an
  extension that uploads or harvests. Any listing can claim privacy, so the claim
  is written as something a reader can verify: named permissions, one host, one
  HTTP method, and the source. "Checkable" is doing the work, not "secure".
- **No competitor is named anywhere.** Not in the description, not in the short
  description, not in the title.
- **No promotion of any other extension appears anywhere in this release.**

### 3.4 Assets

The four listing screenshots predate HTML and CSV. They show two download
buttons; the product now has four. That is a factual mismatch between listing and
product, and the screenshot is what a browsing user actually looks at.

Rerun `screenshots/take-screenshots.mjs`, then add a fifth showing a rendered HTML
transcript. The rendered HTML transcript is the most persuasive image available,
because it is the output, not the UI.

### 3.5 Firefox parity

`docs/firefox-amo-listing.md` still carries the stale summary
("Extract Instagram DM conversations as JSON and Markdown") and a "Dual export"
bullet. It was left untouched on purpose: it is store copy, and store copy waits
for approval. Update it in the same pass as the Chrome listing, using the
approved wording. AMO allows 250 characters in the Summary, so extend the
approved short description there rather than truncating to it.

---

## 4. Release checklist, in order

Everything above the line is done. Everything below needs the owner.

**Done in the branch**

- [x] `npm test` passes 7/7
- [x] Manifest at 2.3.0
- [x] `background.service_worker` restored for Chrome
- [x] `exporters.js` present in both injection lists
- [x] `npm run package` produces a clean, root-level, 16-file zip

**Owner, before submitting**

1. Approve or reject the short description. If approved, edit
   `extension/manifest.json` `description`, then **re-run `npm run package`**,
   because the description is baked into the package.
2. Approve or reject the title. Default recommendation is no change.
3. Approve or reject the detailed description. Verify the 48 hour figure.
4. Load `dist/instagram-dm-extractor.zip` unpacked **in Chrome** and confirm:
   popup opens, extraction runs on a real thread, the badge counter updates
   (this is the `service_worker` fix, it is the thing most likely to be wrong),
   and all four download buttons produce a file.
5. Open the exported HTML file with the network disconnected. It must render
   fully. If anything fails to load, the self-contained property has regressed.
6. Regenerate screenshots, add the HTML transcript shot.
7. Upload `dist/instagram-dm-extractor.zip` to the Chrome Web Store item, paste
   the approved copy, submit.
8. Firefox: if AMO rejects on `background.service_worker`, remove that one line,
   repackage, resubmit. Do not remove it from the Chrome package.
9. After the store shows 2.3.0 live, tag `v2.3.0` and attach the zip to a GitHub
   release. Not before, so the tag always points at what actually shipped.

---

## 5. Known risks

| Risk | Assessment |
|---|---|
| `service_worker` key rejected by AMO | Known workaround: strip the line for the Firefox package only. Chrome is the priority, it is the larger install base |
| Resubmission puts the listing back through review | Unavoidable for a code change. The permission set is byte-identical to 2.2.0, which is the thing reviews escalate on |
| New keywords read as stuffing | Every phrase in every variant sits inside a grammatical sentence and no phrase repeats more than twice. S2 is closest to the line and is not the recommendation |
| Screenshots stale at submission | Fix before upload. Cheap, and it is the asset users actually see |
