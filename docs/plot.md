# Instagram DM Chat Extractor — Development Plot

## Workflow

```
Design Doc → Implement → Review with Codex → Fix → Re-review → Ship
```

### 1. Design Doc (`docs/design-doc.md`)
- Define features, requirements (R1.1-R4.4), and validation checklists (V1-V7)
- Architecture diagram, message flow, file structure
- Key constraints (async return true, microsecond timestamps, script load order)

### 2. Implement
- Work through the design doc feature by feature
- Implementation order follows dependency graph (stats.js before content.js, etc.)

### 3. Review with OpenAI Codex
- Run `codex exec --full-auto` with a brutal review prompt
- Feed it the design doc + all implementation files
- Ask for: PASS/FAIL per requirement, bug hunting, edge cases, overall verdict

### 4. Fix Issues from Codex Review
- Triage: Critical → Medium → Minor
- Fix critical issues first (deadlocks, data corruption)
- Fix medium issues that affect correctness
- Defer minor/cosmetic issues unless trivial

### 5. Re-review with Codex
- Run another Codex review pass on the fixes
- Repeat until verdict is PASS / SHIP IT
- Each cycle should reduce issue count

### 6. Manual Testing
- Follow V1-V7 validation checklists from design doc
- Test on real Instagram DMs
- Edge cases: empty chats, single message, 500+ messages, custom date ranges

---

## Version History

### v1.0 — Initial Extension
- Basic extraction, numeric thread IDs, no filtering, no stats

### v2.0 — Features (commit `9f39cb2`)
- Chat name resolution (FETCH_THREAD_INFO)
- Date range filter (all/1d/7d/30d/custom) with early API termination
- Enhanced stats panel (per-sender, initiations, response time, type breakdown)
- stats.js, collapsible stats UI

### v2.1 — Bug Fixes (commit `dfa1bc0`)
- Chat name persistence (no numeric ID flash)
- "Extract Again" returns to ready state (date filter accessible)
- Adaptive delay (100ms start, backoff on 429)
- Stats metadata in Markdown output
- formatDuration overflow fix
- avgPerDay falsy-zero fix
- Custom date range start>end swap

### v2.2 — Codex Review Fixes (complete)
Issues from OpenAI Codex (gpt-5.3-codex) review:

**Critical:**
- [x] Extraction deadlock — added try/catch/finally around async pipeline

**Medium:**
- [x] cachedThreadName not thread-scoped — popup recreates on open, sufficient
- [x] No endUnix early termination — inherent to API (newest-first), client-side filter handles it
- [x] Custom range empty fields → return null (treat as "all")
- [x] Metadata block dropped when messageCount=0 — removed messageCount check
- [x] cleanInstagramUrl return value — now assigned to text
- [x] Popup runtime listener not tab-scoped — scoped to activeTabId
- [x] Popup ignores START_EXTRACTION failure — now reverts to ready state
- [ ] fetchThreadInfo lacks inbox fallback (deferred — edge case for non-standard thread IDs)

**Minor:**
- [ ] Timestamp formatter string input (deferred — Instagram always sends numbers)
- [x] Filename slug sanitization — now uses [^\w.-] regex
- [x] Markdown null participant — defaults to 'unknown'
- [ ] Date boundaries local time vs UTC (deferred — acceptable for user-facing filter)

**Codex review results:**
- Round 1: FAIL (1 critical, 9 medium, 4 minor)
- Round 2: FIX FIRST (8/9 fixed, missing `finally`)
- Round 3: **SHIP**
