# Instagram DM Chat Extractor v2 - Design & Requirements Document

## Context

The extension extracts Instagram DM chats and downloads them as JSON/MD. v1 is functional but bare-bones: numeric thread IDs instead of names, no date filtering, and minimal post-extraction stats. v2 adds real insight into conversations.

---

## Feature 1: Show Chat Name Before Extraction

### Intent
When the popup opens, the user should immediately see which chat they're about to extract. "Thread: 113469636705455" is useless. They need the actual person's name.

### Requirements
- R1.1: Popup shows the resolved chat name (from `threadInfo.thread_title` or `users[].username`) before extraction starts.
- R1.2: "Loading..." shown as placeholder, replaced with real name when API response arrives.
- R1.3: Chat name displayed as `<strong>name</strong>` without "Thread:" prefix.

### Implementation
- `extractor.js` - `fetchThreadInfo(rawThreadId, csrftoken)`: single lightweight API call (`limit=1`) to get thread metadata.
- `content.js` - `FETCH_THREAD_INFO` message handler: **must `return true`** from `onMessage` listener to keep channel open for async `sendResponse`. All other handlers return `false`.
- `popup.js` - after `checkPage()` gets idle state with no `chatTitle`, fires `FETCH_THREAD_INFO`, updates name on response.

### Files Changed
| File | Change |
|------|--------|
| `content/extractor.js` | New `fetchThreadInfo()`, added to exports |
| `content/content.js` | New `FETCH_THREAD_INFO` async handler (`return true`) |
| `popup/popup.js` | Async name fetch on idle state, `setThreadInfo()` without "Thread:" prefix |

---

## Feature 2: Date Range Filter

### Intent
For a 5000-message chat, extracting everything takes minutes. Users usually want the last few days or a specific range.

### Requirements
- R2.1: Before clicking Extract, user picks a date range: All messages, Past 1 day, Past 7 days, Past 30 days, or Custom (with date pickers).
- R2.2: Extraction only fetches messages in that range, with early termination when API pages go past the start date.
- R2.3: Client-side filter ensures only messages within `startUnix <= timestampUnix <= endUnix` are included in output.
- R2.4: Downloaded JSON/MD contains only filtered messages.
- R2.5: Button text says "Extract Messages" (not "Extract All Messages") since it may not be all.

### Critical API Detail
Pages go newest-to-oldest. Items within each page are newest-first. Raw `item.timestamp` is in **microseconds**. `parseMessage()` converts to seconds as `timestampUnix`. Early termination checks raw microseconds in `extractor.js`; client-side filter checks parsed seconds in `content.js`.

### Implementation
1. **Popup UI**: `<select>` dropdown with 5 options. "Custom" reveals two `<input type="date">` fields. `computeDateFilter()` returns `{ startUnix, endUnix }` in seconds.
2. **Message passing**: Popup sends `dateFilter` with `START_EXTRACTION`.
3. **Early termination**: `fetchAllMessages()` accepts `dateFilter`. After each page, check if the oldest item's timestamp (raw microseconds / 1_000_000) is before `startUnix`. If so, stop paginating.
4. **Client-side filter**: After parsing and reversing messages, filter to only include messages where `startUnix <= timestampUnix <= endUnix`.

### Files Changed
| File | Change |
|------|--------|
| `popup/popup.html` | Date range `<select>` + custom date inputs inside `#ready` div |
| `popup/popup.css` | Styles for `.date-filter`, `.date-select`, `.custom-date-range`, `.date-input-row` |
| `popup/popup.js` | DOM refs, change listener, `computeDateFilter()`, pass `dateFilter` in `START_EXTRACTION` |
| `content/content.js` | Accept `msg.dateFilter`, pass to `fetchAllMessages()`, apply client-side filter |
| `content/extractor.js` | `fetchAllMessages(..., dateFilter)` with early termination |

---

## Feature 3: Enhanced Extraction Stats

### Intent
After extracting a chat, the user wants to understand conversation dynamics: who talks more, who initiates, how quickly each person responds.

### Requirements
- R3.1: Collapsible stats panel after extraction showing all metrics below.
- R3.2: Extraction duration + date range (carried over from v1).
- R3.3: Average messages per day: `messageCount / ((newestUnix - oldestUnix) / 86400)`.
- R3.4: Messages per sender (e.g., me: 67, other: 46).
- R3.5: Conversation initiations per sender: who starts convos after 4h+ silence. First message always counts.
- R3.6: Average response time per sender: time between sender switch, ignoring >24h gaps.
- R3.7: Message type breakdown (text: 98, media: 8, story_share: 4...).

### Implementation
- New file `content/stats.js` with `ChatStats.computeStats(messages, durationText)`:
  - **perSender**: iterate messages, count by `sender`
  - **typeBreakdown**: iterate messages, count by `type`
  - **avgPerDay**: `messageCount / ((newestUnix - oldestUnix) / 86400)`
  - **initiations**: iterate chronologically, if gap >= 4h from previous message -> count sender as initiator. First message always counts.
  - **responseTime**: iterate chronologically, when sender changes, record delay. Ignore >24h gaps. Average per sender.
- `content.js` replaces inline stats with `ChatStats.computeStats(filteredMessages, durationText)`.
- `popup.html/css/js` add collapsible stats panel with sub-sections.

### Files Changed
| File | Change |
|------|--------|
| `content/stats.js` | **NEW** - `ChatStats.computeStats()` + `formatDuration()` |
| `manifest.json` | Add `content/stats.js` to content_scripts (before content.js) |
| `content/content.js` | Use `ChatStats.computeStats()` instead of inline stats |
| `popup/popup.html` | Collapsible stats panel with sub-sections |
| `popup/popup.css` | `.stats-header`, `.chevron`, `.stats-body`, `.stats-sub-header`, `.stats-sub-row` |
| `popup/popup.js` | DOM refs, toggle listener, `renderSubSection()` helper, updated `showStats()`, updated fallback injection list |

---

## Feature 4: UX Polish

### Requirements
- R4.1: Chat name displayed as bold text without "Thread:" prefix.
- R4.2: Date range selector is clean and compact.
- R4.3: Stats panel collapsible (expanded by default after extraction).
- R4.4: Button says "Extract Messages" (not "Extract All Messages").

---

## Architecture

### File Structure
```
extension/
  content/
    parser.js       # Message parsing (unchanged)
    markdown.js     # JSON-to-MD conversion (unchanged)
    downloader.js   # Blob-based file download (unchanged)
    stats.js        # NEW: Chat statistics computation
    extractor.js    # API calls, pagination (+ fetchThreadInfo, dateFilter early termination)
    content.js      # Orchestrator (+ FETCH_THREAD_INFO handler, dateFilter pass-through)
  popup/
    popup.html      # UI (+ date filter, collapsible stats panel)
    popup.css       # Styles (+ date filter, stats styles)
    popup.js        # Popup logic (+ date filter, enhanced stats, name resolution)
  manifest.json     # + stats.js in content_scripts
  background.js     # (unchanged)
```

### Message Flow
```
popup.js                    content.js                  extractor.js
   |                            |                           |
   |-- CHECK_PAGE ------------->|                           |
   |<-- {status, threadId} -----|                           |
   |                            |                           |
   |-- FETCH_THREAD_INFO ------>|-- fetchThreadInfo() ----->|
   |<-- {title} (async) --------|<-- {title, threadId} -----|
   |                            |                           |
   |-- START_EXTRACTION ------->|                           |
   |   {dateFilter}             |-- resolveThreadId() ----->|
   |                            |-- fetchAllMessages() ---->|
   |                            |   (dateFilter)            |-- API pages (early term) -->
   |<-- PROGRESS ----------------|<-- onProgress() ---------|
   |                            |                           |
   |                            |-- parseMessage() -------->|
   |                            |-- date filter (client) ---|
   |                            |-- ChatStats.computeStats()|
   |<-- COMPLETE ----------------|                           |
   |   {stats}                  |                           |
```

### Key Constraints
1. `FETCH_THREAD_INFO` handler **must `return true`** (async sendResponse). All other handlers return `false`.
2. Raw `item.timestamp` is in **microseconds**. `parseMessage()` converts to seconds. Early termination divides by 1_000_000; client-side filter uses parsed seconds.
3. `stats.js` must load before `content.js` in manifest and fallback injection list.
4. Stats panel: expanded by default after extraction, collapsible via header click.

---

## Validation Checklist

Run these checks after any code change to verify correctness:

### V1: Chat Name Resolution
- [ ] Reload extension. Open a DM chat. Popup should show the person's **name** (not numeric ID) within ~1 second.
- [ ] Navigate to a different chat. Popup should reset and show the new chat name.

### V2: Date Range Filter
- [ ] Select "All messages" -> Extract. Should extract the full chat.
- [ ] Select "Past 7 days" -> Extract. Should be faster than "All messages" for long chats. Verify messages are only from the last 7 days.
- [ ] Select "Past 1 day" -> Extract. Verify only last 24 hours of messages.
- [ ] Select "Custom range" -> pick dates -> Extract. Verify date inputs work and messages are filtered correctly.
- [ ] Download JSON -> verify it contains only the filtered messages (check timestamps).
- [ ] Download MD -> verify same filtered messages.

### V3: Enhanced Stats
- [ ] After extraction, stats panel should show:
  - Duration and date range
  - Average messages per day
  - Per-sender message counts
  - Conversation initiations per sender (4h+ gap)
  - Average response time per sender (ignoring 24h+ gaps)
  - Message type breakdown
- [ ] Stats values should be plausible (not NaN, not zero for non-empty chats).

### V4: UX Polish
- [ ] Chat name shows as bold text, no "Thread:" prefix.
- [ ] Click Stats header -> should collapse. Click again -> expand.
- [ ] Button says "Extract Messages".
- [ ] Date range selector is clean; "Custom" reveals date pickers.

### V5: Regression
- [ ] Full extraction (All messages) still works end-to-end.
- [ ] JSON and MD downloads produce valid files.
- [ ] Error states (not on DM page, auth error) still display correctly.
- [ ] Navigating between chats resets state properly.

### V6: Code Integrity
- [ ] `manifest.json` lists `stats.js` before `content.js` in content_scripts.
- [ ] `popup.js` fallback injection list matches manifest order (parser, markdown, downloader, stats, extractor, content).
- [ ] `FETCH_THREAD_INFO` handler returns `true` (not `false`).
- [ ] `fetchAllMessages` accepts `dateFilter` as 4th parameter.
- [ ] Early termination checks `items[items.length - 1].timestamp / 1_000_000` (microseconds to seconds).
- [ ] Client-side filter checks `m.timestampUnix` (already in seconds from `parseMessage`).

---

## v2.1 Bug Fixes & Improvements

### Fix 1: Chat Name Persistence

**Problem:** Popup showed numeric thread ID (e.g., "103742304360675") instead of resolved name during extraction.

**Root causes:**
- `content.js:startExtraction()` reset `state.chatTitle = null`, wiping the name resolved by `FETCH_THREAD_INFO`
- `popup.js` fell back to numeric `resp.threadId` when `chatTitle` was null

**Fix:**
- Removed `state.chatTitle = null` from `startExtraction()` — name persists from `FETCH_THREAD_INFO`, gets overwritten authoritatively by `jsonData.chatWith` after parsing. Thread-change resets handled by `resetIfThreadChanged()` → `freshState()`.
- Added `cachedThreadName` in `popup.js` — caches resolved name across state transitions. Shows "Loading..." instead of numeric ID.

### Fix 2: "Extract Again" Returns to Ready State

**Problem:** "Extract Again" called `startExtraction()` directly, skipping the date range selector.

**Fix:** Handler now calls `showState('ready')` + shows cached thread name. User can modify date range before re-extracting. DOM elements retain values across hide/show.

### Fix 3: Adaptive Extraction Delay

**Problem:** Fixed `REQUEST_DELAY = 600ms` between every API page. For 1000 messages (25 pages): 14.4s pure idle time.

**Fix:** Replaced with adaptive delay:
- `INITIAL_DELAY = 100ms` — start fast
- `BACKOFF_MULTIPLIER = 3` — triple delay on 429 (rate limit)
- `DECAY_FACTOR = 0.8` — reduce delay by 20% per successful request
- `MIN_DELAY = 50ms`, `MAX_DELAY = 10000ms` — bounds
- Both `currentDelay` and `lastRequestHit429` reset at start of each `fetchAllMessages()` call

Expected: ~10x reduction in idle wait time for non-rate-limited extractions.

### Fix 4: Stats Metadata in Markdown Output

**Problem:** Markdown file had only a 3-line header. Stats (message counts, response times, initiations) were computed but not included — useless for LLMs consuming the file.

**Fix:** `convertToMarkdown(data, stats, replyWindow=2)` now accepts stats. `formatStatsBlock(stats)` renders a `## Metadata` section between the header and messages:

```
## Metadata
- Messages: 17
- Avg/day: 22.4
- Extraction duration: 30s
- Messages per sender: me: 11, johndoe: 6
- Conversation initiations: me: 2, johndoe: 1
- Avg response time: johndoe: 4h 5m, me: 4h 56m
- Message types: text: 12, action_log: 1, media: 3, link: 1
```

Stats computed before markdown in `content.js` (reordered).

### Fix 5: `formatDuration` Overflow

**Problem:** `Math.round` could produce "1h 60m" or "60s".

**Fix:** `Math.round` → `Math.floor` on all 3 branches in `stats.js:formatDuration()`.

### Fix 6: `avgPerDay` Falsy-Zero

**Problem:** `stats.avgPerDay || '?'` treated `0` as falsy, showing "?" instead.

**Fix:** Changed to `stats.avgPerDay ?? '?'` (nullish coalescing).

### Fix 7: Custom Date Range Start > End

**Problem:** If user entered start date after end date, filter returned 0 messages silently.

**Fix:** Swap date strings (not computed timestamps) before computing unix values. Preserves T00:00:00/T23:59:59 boundaries.

### v2.1 Files Changed

| File | Changes |
|------|---------|
| `content/stats.js` | `Math.round` → `Math.floor` (3 lines) |
| `content/extractor.js` | Adaptive delay replacing fixed 600ms; reset `lastRequestHit429` per extraction |
| `content/content.js` | Removed `chatTitle` reset; reordered stats before markdown; pass stats to `convertToMarkdown` |
| `content/markdown.js` | `formatStatsBlock()` + `convertToMarkdown(data, stats)` metadata block |
| `popup/popup.js` | `cachedThreadName`; Extract Again → ready; `avgPerDay ??`; date string swap |

### V7: v2.1 Validation

- [ ] Open popup on DM → shows "Loading..." then resolved name (never numeric ID)
- [ ] Click Extract → name persists throughout extraction (no flash to numeric ID)
- [ ] After extraction, click "Extract Again" → returns to ready state with date filter visible
- [ ] Change date range → click Extract → extracts with new range
- [ ] Extract 500+ msg chat → noticeably faster than before (~10x less idle time)
- [ ] Download MD → metadata block with stats at top of file
- [ ] Custom date range with start > end → still works (swapped silently, correct boundaries)
- [ ] Stats panel → avgPerDay shows "0" not "?" for single-message chats
- [ ] `formatDuration` edge: no "60s", "60m", or "1h 60m" in stats
