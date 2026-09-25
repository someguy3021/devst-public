# ADR-021: Reminder system — providers over detectors, one render per medium

> **Status:** Accepted · **Date:** 2026-09-12
> **Essence:** All devst reminders are assembled by a pure kernel, `src/remind.ts`: `Reminder {id, severity, title, detail?, action?}` + `collectReminders(facts, config)`. A single entry point, `devst remind [--json]`; the SessionStart hook, the brief, and the "Now" panel widget only render one array. Customization lives in the "remind" slice of devst.json.
> **Rejected:** hand-written blocks in the hook (adding one reminder = 4 edit sites — the T-13 diagnosis); a journal with "seen" suppression (requires state — feature 05 non-goals); thresholds hardcoded in code.
> **Related:** [Feature 05](../features/05-reminder-system.md) · [ADR-010](adr-010-detect-dont-block.md) · [ADR-015](adr-015-tauri-ui-stack.md) · T-16

## Context

An inventory (2026-09-12) found five reminder families: the `check` lint rules (already a system), the SessionStart panel (6 hand-written python blocks), the brief (the same signals rendered a third time), registry TTL timers (configurable), and ad-hoc hints in cli.ts. Adding a single reminder (T-13) required edits in four places; thresholds were hardcoded; the renders drifted apart. The author wanted a single class "so it doesn't get lost among ten identical variations scattered across the code", a customization point for the future, and accepted "do it well, but longer".

## Options

### A. Providers over detectors + per-medium renderers (chosen)

- Pros: semantics in one place; existing detectors are not rewritten (a provider is a mapping from facts to `Reminder`); the hook shrinks to a single call; config-driven customization; the pure kernel is testable in isolation.
- Cons: facts are gathered by the CLI shell — reminders inherit its quality; the media must catch up with the new shape (a one-time migration).

### B. A unified "inbox" with state (journal, suppression)

- Pros: reminders can be "dismissed".
- Cons: state storage is a separate fork (where it lives, who prunes it); never requested.

### C. Keep as is + discipline

- Pros: zero work.
- Cons: the pain remains; every new reminder multiplies the drift.

## Decision

1. Kernel: `Reminder`/`RemindConfig` (+ `REMIND_DEFAULTS`), `parseRemindConfig` (the "remind" slice: auditDays=30, reqOpen=3, off=[]), `collectReminders` — 8 providers (conventions-errors with rule detail strings, uncommitted, undocumented, baseline-drift, tasks-rotten, conventions-warnings — hidden behind errors, req-open, audit), `renderRemindText` (⚠/⏰ + details).
2. CLI: `devst remind [--json]`; fact gathering reuses checkDocs + baselineDrift + undocData + collectUncommitted + registry timers + the audit stamp (shared helpers with the brief). Brief: `composeBrief` accepts `Reminder[]` (a "Reminders:" block).
3. SessionStart hook: one `remind --json` call + one generic python renderer instead of four blocks; the freeze guard stays file-based (contextual).
4. UI: `KernelAdapter.remind()` (Direct — sidecar `runCliJson`; Mock — fixture), a RemindersPanel on the "Now" tab.

## Rationale

- An answer to the author's direct request: extend — with a provider; track — from a single source; customize — via devst.json.
- "Well, but longer": error details are preserved (detail strings), and all three media plus the config landed in one pass.

## Consequences

**Positive:**

- A new reminder is ~15 lines of provider + an entry in `collectReminders` + a test; the hook/UI/brief pick it up automatically.
- SessionStart: 1 process instead of 3; the panel is uniform.

**Negative / risks:**

- The panel's wording changed (tests/habits) — old strings were replaced with semantic equivalents.
- On a repo without node ≥ 22.5, remind loses tasks-rotten (the registry is unavailable) — an honest degradation; the other providers keep working.
