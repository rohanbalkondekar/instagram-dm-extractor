# STATUS: DRAFT - REQUIRES OWNER APPROVAL. NOT FINAL COPY.

> Superseded by `docs/RELEASE-2.3.0.md`, which carries the copy actually proposed
> for the 2.3.0 submission. This file is kept for the character counts and the
> variant reasoning behind them.

Nothing in this file has been submitted, published, or written into `manifest.json`. The
manifest still carries the current name and description unchanged. Owner picks a variant, or
rejects all of them, before anything ships.

Target queries this copy is trying to claim, alongside the existing "instagram dm extractor"
intent:

- `export instagram chat`
- `save instagram messages`
- `backup instagram messages`

Character counts below are exact, counted with `len()` on the literal string, spaces and
punctuation included.

---

## Current copy, verbatim

Source: `extension/manifest.json` at v2.2.0, which is the version live in the store.
The manifest in this branch is at 2.3.0 and still carries this same stale
`description`, deliberately: it is store copy and it waits for approval.

**Current title (`name`), 27 characters:**

```
Instagram DM Chat Extractor
```

**Current short description (`description`), 55 characters:**

```
Extract Instagram DM conversations as JSON and Markdown
```

Two problems with the current short description, independent of SEO: it is now factually
stale (the extension also exports HTML and CSV), and it spends all 55 of its characters on
words nobody searches for. "Conversations" is not a query. "Export", "save" and "backup" are.

---

## Short description variants (CWS limit: 132 characters)

All three fit. All three lead with a verb someone types into a search box, and all three name
every export format so the listing stops being stale.

### Variant A - 114 characters

```
Export Instagram chat to HTML, CSV, JSON or Markdown. Save and backup Instagram messages, all inside your browser.
```

- Claims: `export instagram chat` (exact, leading), `save instagram messages` (exact),
  `backup instagram messages` (exact).
- All three target phrases appear as exact contiguous matches. Closes with the privacy claim,
  which is the actual differentiator against the rest of this category.
- Reads as a sentence, not a keyword list. This is the safest of the three.

### Variant B - 115 characters

```
Save Instagram messages in one click. Export Instagram chat and backup Instagram messages as HTML, CSV, JSON or MD.
```

- Claims: `save instagram messages` (exact, leading), `export instagram chat` (exact),
  `backup instagram messages` (exact).
- Leads with the benefit rather than the mechanism. Repeats "Instagram messages" twice, which
  is the most keyword-dense of the three and therefore the most exposed to the keyword-spam
  policy. Uses "MD" instead of "Markdown" to buy the characters back.

### Variant C - 120 characters

```
Backup Instagram messages before they disappear. Export Instagram chat to HTML, CSV, JSON or Markdown, nothing uploaded.
```

- Claims: `backup instagram messages` (exact, leading), `export instagram chat` (exact).
  Does **not** contain `save instagram messages` as an exact phrase, it trades that one for a
  reason-to-act.
- The strongest hook of the three: "before they disappear" names the fear that makes someone
  install today rather than bookmark. Weakest keyword coverage.

**Recommendation:** A. It gets all three phrases as exact matches, stays readable, and does not
repeat itself. C is the better ad; A is the better listing.

---

## Title variant (CWS limit: 75 characters) - APPEND-ONLY

Rule applied: every word of the current title survives unchanged and in its original order, at
the front of the string. Only new words are appended. No word is removed, reordered, or
altered. This keeps every existing ranking, bookmark, and word-of-mouth reference intact.

Base that must appear untouched: `Instagram DM Chat Extractor`

### T1 - 54 characters

```
Instagram DM Chat Extractor - Export & Backup Messages
```

Adds `export` and `backup`. Shortest, cleanest, least likely to read as stuffing. Does not
survive a truncated render badly at any width.

### T2 - 67 characters

```
Instagram DM Chat Extractor - Save & Export Chat to HTML, CSV, JSON
```

Adds `save`, `export`, `chat` and the format names. The format list is the thing that
differentiates this listing from every competitor in the results page. Markdown is dropped
purely for length; it stays in the short description.

### T3 - 72 characters

```
Instagram DM Chat Extractor - Export, Save and Backup Instagram Messages
```

Adds all three verbs plus a second "Instagram Messages". Closest to the target queries and the
closest to the keyword-spam line. Use only if T1 and T2 underperform, and expect it to be the
one a reviewer questions.

**Recommendation:** T1. The title is not where this listing wins search, the short description
and the detailed description are, and the title is the field where keyword stuffing gets a
listing rejected rather than merely down-ranked.

---

## Owner decisions needed before any of this ships

1. **Pick one short description and one title, or reject all.** Nothing changes until then.
2. **Where the short description lives.** The CWS short description is prefilled from the
   manifest `description` field. Changing it properly means editing `manifest.json`, bumping
   the version, repackaging, and republishing, which puts the extension back through review.
   The dashboard field can be edited on its own, but then the manifest and the listing disagree,
   which is exactly the kind of inconsistency the Featured reviewers notice. Recommend changing
   the manifest and shipping it with the next version.
3. **Firefox parity.** `docs/firefox-amo-listing.md` carries the same stale line as a Summary.
   AMO allows 250 characters there, so whatever is approved here should be extended, not
   copy-pasted, for AMO.
4. **Keyword-spam risk is real.** Chrome Web Store program policy prohibits repetitive or
   irrelevant keywords in the title and description. Every variant here uses each keyword in a
   grammatical sentence, and none repeats a phrase more than twice, which is the intent of the
   policy. B and T3 are the two closest to the line.
