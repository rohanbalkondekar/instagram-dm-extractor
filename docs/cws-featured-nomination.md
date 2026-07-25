# Chrome Web Store Featured badge nomination + publisher verification

Target item: **Instagram DM Chat Extractor**
Item ID: `emfaleblgmheiblldkceadiokffhgcje`
Listing: https://chromewebstore.google.com/detail/instagram-dm-chat-extract/emfaleblgmheiblldkceadiokffhgcje
Audited against: `extension/manifest.json` v2.3.0, `docs/PRIVACY.md`, `screenshots/`, `README.md` (repo state, July 2026).

Two separate things, do them in this order:

1. **Publisher verification** (Official URL = vibegrow.io). Cheap, deterministic, improves the
   listing whether or not the badge lands. Do this first.
2. **Featured badge nomination.** Manual human review by the Chrome team, no SLA, no appeal.
   Only worth submitting once the gaps in section 3 are closed, because a rejection is quiet
   and you will not know which criterion failed.

---

## 1. The documented criteria, scored against the current listing

Google publishes the Featured criteria in two places only:
[Discovery on the Chrome Web Store](https://developer.chrome.com/docs/webstore/discovery)
(what the reviewers check + eligibility gates) and
[Best practices](https://developer.chrome.com/docs/webstore/best-practices) (what "best
practices" means). There is no scored rubric. The list below is those two pages turned into
checkboxes.

### 1a. Hard eligibility gates (fail any one, nomination is dead)

| Gate | Status | Evidence |
|---|---|---|
| Item is an extension (not a theme/app) | PASS | `manifest.json` is an MV3 extension |
| You own the item | PASS, **verify which account** | See the account-ownership warning below |
| Published and public | PASS | Live on CWS at the ID above |
| English language support | PASS | All UI strings in `popup/popup.html` are English |
| No active policy violations | PASS as far as the repo shows | Owner must confirm in the dashboard: no red banner on the item |
| Core features usable with no login or payment | PASS | No auth, no billing, no gate; uses the user's own existing Instagram session |

**Account-ownership warning.** The Official URL dropdown only offers domains verified in
Google Search Console *under the same Google account that owns the CWS item*. The repo is
`github.com/rohanbalkondekar/...` and vibegrow.io sits under `outsightai@gmail.com`. If the
CWS item is published from a different Google account than the one that owns vibegrow.io in
Search Console, verification cannot complete. Fix by adding the CWS-owning account as a full
**Owner** on the vibegrow.io Search Console property (not just "Full user" - the dropdown
requires owner-level verification). Check this before anything else, it silently blocks step 2.

### 1b. "Adherence to best practices" (reviewer check 1)

| Criterion | Status | Evidence / what to fix |
|---|---|---|
| Manifest V3 | PASS | `"manifest_version": 3` |
| Latest platform APIs | PASS | `chrome.scripting.executeScript`, service-worker-style background, no deprecated `browser_action` / `tabs.executeScript` |
| Minimal permissions | **STRONG PASS** | Only `activeTab` + `scripting`. No `storage`, no `tabs`, no `downloads`, no `<all_urls>` |
| Narrow host permissions | **STRONG PASS** | `https://www.instagram.com/*` only |
| No remote code | PASS | Every script ships in the package; no CDN, no `eval`, no remote import. The new HTML export is deliberately self-contained (inline CSS, zero external requests) |
| Single narrow purpose | PASS | One job: export the DM thread you are looking at |
| Respects user privacy | PASS | Nothing leaves the browser; `docs/PRIVACY.md` states it and the source backs it up |
| Privacy policy URL set in the dashboard | **UNVERIFIED - CHECK** | `docs/PRIVACY.md` exists in the repo. A markdown file in a repo is not a privacy policy URL. See gap G1 |
| Privacy practices tab completed (single-purpose statement + per-permission justification + data-use certification) | **UNVERIFIED - CHECK** | Cannot be seen from the repo. This is the single most common quiet blocker. See gap G2 |
| Good UX, no dark patterns, no surprise nav | PASS | Popup only, no injected UI on the page, no new-tab takeover, no notifications |
| Fast and non-janky | PASS | Adaptive backoff on rate limits, progress UI during extraction |
| Accessibility basics | **WEAK** | Buttons are real `<button>`s and the date inputs have `<label for>`, good. But the stats disclosure (`#stats-header`) is a `<div>` with a click handler: no `role="button"`, no `tabindex`, no `aria-expanded`, not keyboard reachable. Cheap fix, reviewers do look at keyboard reachability |

### 1c. "Store listing page that is clear and helpful, with quality images and a detailed description" (reviewer check 2)

| Asset | Required spec | Have it? |
|---|---|---|
| Store icon | 128x128 PNG | PASS, `extension/icons/icon128.png` |
| Screenshots | 1280x800, min 1, max 5 | PASS on spec, `screenshots/screenshot-{ready,datefilter,extracting,complete}.png` are all exactly 1280x800. **4 of 5 slots used, and all 4 are stale** - they predate HTML/CSV export and show only two download buttons |
| Small promo tile | 440x280 PNG/JPEG | PASS, `screenshots/promo-small.png` is exactly 440x280 |
| Marquee promo tile | 1400x560 PNG/JPEG | Asset PASS, `screenshots/promo-marquee.png` is exactly 1400x560. **Upload status unverified** - see gap G3 |
| YouTube video | optional, strongly recommended | Asset exists (https://youtu.be/fIPEUwBmvj8), **unverified whether it is set in the listing's video field** |
| Short description | 132 chars max | Currently the manifest `description`: `Extract Instagram DM conversations as JSON and Markdown` (55 chars). Factually stale as of the HTML/CSV work, and claims no adjacent search terms. Rewrite drafted in `docs/listing-copy-DRAFT.md` |
| Detailed description | long form, structured | **UNVERIFIED - CHECK.** If it is the one-liner or a copy of the summary, this alone will sink a Featured review. `docs/firefox-amo-listing.md` has a usable long-form body to adapt |
| Category | must be accurate | Suggest **Social & Communication** (matches the AMO choice) |
| Support URL / email | should be set | README points to GitHub issues; **unverified whether the dashboard fields are filled** |
| Official URL (publisher domain) | the verified-domain link under the listing title | **FAIL** - not verified. This is section 2 |

---

## 2. Gaps: exactly what is missing

| # | Gap | Why it matters | Effort |
|---|---|---|---|
| G1 | Privacy policy is a repo markdown file, not a hosted URL on a domain you control | The dashboard needs a URL. A GitHub blob URL is accepted but weakens the domain story you are about to build | 30 min: publish `docs/PRIVACY.md` at `https://vibegrow.io/legal/instagram-dm-chat-extractor-privacy` and paste that URL into the item's Privacy tab |
| G2 | Privacy practices tab: single-purpose statement, one justification per permission (`activeTab`, `scripting`, host access), remote-code = No, plus the three data-use certification checkboxes | An incomplete Privacy tab blocks publishing updates and reads as sloppy in a manual review | 20 min. Justification text can be lifted verbatim from the Permissions section of `docs/PRIVACY.md` |
| G3 | Marquee tile upload unconfirmed | The marquee is what a featured extension is rendered with. If the slot is empty, being "featured" has nothing to render | 5 min, asset already exists at the exact spec |
| G4 | All 4 screenshots are stale (pre-HTML/CSV) and the 5th slot is empty | Screenshots are half of "quality images". Showing a format the extension no longer limits itself to is a factual mismatch between listing and product | 1 hr: rerun `screenshots/take-screenshots.mjs`, then add a 5th showing the rendered HTML transcript, which is the most persuasive image in the set |
| G5 | No Official URL / publisher domain verification | Missing trust signal directly under the listing title | Section 2 below |
| G6 | Established Publisher badge: identity verification not done (assumed) | A separate badge from Featured, but it is the other trust mark on the listing and the identity verification is a prerequisite the Featured reviewers see | Dashboard > Account > verify identity (legal name, address, phone). Days of lag, start early |
| G7 | Detailed description quality unknown | Explicitly named in the criteria | Adapt the AMO long description in `docs/firefox-amo-listing.md`, add the two new formats |
| G8 | Stats disclosure not keyboard reachable | UX/accessibility, part of "enjoyable and intuitive" | 10 min: `role="button" tabindex="0" aria-expanded` + Enter/Space handler in `popup.js` |

### The exact marquee spec

- **1400 x 560 pixels**, exactly. No other size is accepted in that slot.
- PNG or JPEG. Use 24-bit PNG with **no alpha channel**. Transparency renders as black in some
  store surfaces.
- Artwork must **fill the entire canvas edge to edge**. No letterboxing, no white margin, no
  drop shadow floating on a background.
- The tile gets **cropped horizontally** on narrow viewports and in carousels. Keep the logo and
  any text inside the centre ~1000px; treat the outer ~200px on each side as bleed.
- **Minimal text.** A short tagline at a large size. Anything below roughly 24px is unreadable at
  the sizes this is rendered.
- **No screenshots, no fake browser chrome, no device mockups** inside the marquee. It is a
  poster, not a product shot. That is what the screenshot slots are for.
- No Google or Chrome logos or anything implying Google endorsement, and no Instagram brand
  assets used in a way that implies Meta endorsement. Both violate the respective brand
  guidelines and both are grounds for takedown, not just a failed nomination.
- `screenshots/promo-marquee.png` is already 1400x560 and 301 KB. Before uploading, confirm it
  carries no alpha channel and that the wordmark survives the centre crop.

---

## 3. Publisher domain verification: exactly what the owner clicks

Goal: `vibegrow.io` appears as a linked Official URL under the listing title.

**Step 1 - verify the domain in Search Console** (skip if vibegrow.io is already a verified
property on the account that owns the CWS item):

1. Go to https://search.google.com/search-console signed in as **the Google account that owns
   the CWS item** (confirm which one first, see the ownership warning above).
2. Property selector (top left) > **Add property**.
3. Choose **Domain** (covers every subdomain) and enter `vibegrow.io`. Click **Continue**.
4. Copy the TXT record Google shows.
5. Add that TXT record at the vibegrow.io DNS host (the registrar or Cloudflare DNS panel:
   Add record > Type `TXT`, Name `@`, Content = the copied string > Save).
6. Back in Search Console, click **Verify**. If it fails, wait for DNS propagation and retry.
   Do not delete the TXT record afterwards, removing it un-verifies the property.

**Step 2 - point the listing at it:**

1. Go to https://chrome.google.com/webstore/devconsole
2. Click the **Instagram DM Chat Extractor** item.
3. Left nav > **Store listing**.
4. Scroll to the **Additional fields** block (this is where Homepage URL / Support URL live).
5. In the **Official URL** dropdown, pick `https://vibegrow.io`. The dropdown lists only
   Search-Console-verified sites on this account. If it is empty, step 1 did not complete or it
   completed on the wrong Google account.
6. While in here, also fill **Homepage URL** and **Support URL**, and paste the YouTube demo
   link into the video field.
7. Top right > **Save draft**, then **Submit for review**.

The Official URL only renders on the public listing after that review passes. Allow a few days.

**Step 3 - Established Publisher badge (separate, do it in parallel):**
Dashboard > **Account** (left nav, below the item list) > complete **identity verification**
(legal name, physical address, phone) and confirm the contact email shows as verified. The badge
also needs a clean policy history, which is time-based and cannot be rushed.

---

## 4. Featured badge nomination: exactly what the owner clicks

Do this **after** G1-G4 and G7 are closed and the store-listing update has passed review. The
nomination is reviewed against the listing as it is on the day a human looks at it.

1. Sign in to Chrome as **the Google account that owns the CWS item**. The form's response goes
   to the signed-in account and the ownership check is made against it.
2. Go to https://support.google.com/chrome_webstore/contact/one_stop_support
3. On the "What can we help you with?" step, choose the **developer / publisher** branch (the
   option about your own published item, not the shopper-facing "report an extension" one).
4. In the follow-up issue-type dropdown, choose the **Featured badge nomination** option.
   Google describes this as a trialled option, so it may not be present. **If it is not there,
   pick "Other" / "Something else"** and put `Featured badge nomination - emfaleblgmheiblldkceadiokffhgcje`
   as the subject line. The queue is the same.
5. Fill in:
   - **Item ID:** `emfaleblgmheiblldkceadiokffhgcje`
   - **Item URL:** https://chromewebstore.google.com/detail/instagram-dm-chat-extract/emfaleblgmheiblldkceadiokffhgcje
   - **Developer account email:** the CWS-owning account
   - **Description:** paste the pitch below.
6. Click **Submit**. You get an automated case-number email. There is no SLA, no status page,
   and usually no reply unless the badge is granted. Do not resubmit inside 60 days, duplicate
   cases get merged and closed.

**Pitch text to paste (fits the free-text box, edit before sending):**

> Nominating Instagram DM Chat Extractor (emfaleblgmheiblldkceadiokffhgcje) for the Featured badge.
>
> Single narrow purpose: export the Instagram DM thread the user is currently viewing to HTML, CSV, JSON or Markdown.
>
> Best practices: Manifest V3. Permissions are `activeTab` and `scripting` only, with host access narrowed to `https://www.instagram.com/*`. No `storage`, no `tabs`, no broad host permissions. No remote code of any kind, every script ships in the package and the HTML export is a self-contained file with inline CSS and zero external requests. No data leaves the browser, no analytics, no server. Fully open source under MIT at github.com/rohanbalkondekar/instagram-dm-extractor, so every claim here is checkable against the source.
>
> Listing: 128x128 icon, five 1280x800 screenshots of the real UI, 440x280 and 1400x560 promo tiles, a demo video, a detailed description, and a published privacy policy.
>
> Core functionality is free and needs no account, no signup and no payment.

Hard rules: you cannot pay for the badge, you cannot buy or trade reviews to help it, and a
nomination is a request, not an application with an outcome. Everything in section 1 that is
still marked UNVERIFIED should be checked in the dashboard before you spend the nomination.
