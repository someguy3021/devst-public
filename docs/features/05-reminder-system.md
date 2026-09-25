# Feature 05: Reminder system — reminder providers and `devst remind`

> [Русская версия](../ru/features/05-reminder-system.md)

> **Status:** Stages 0–3 done (ADR-021, session 26) · **Updated:** 2026-09-12
> **Essence:** every devst reminder is one `Reminder` class plus a provider registry layered over the existing detectors; one entry point `devst remind [--json]`; one render per carrier (the SessionStart panel, brief, the UI "Now" widget). A new reminder = a provider + one line in `collectReminders` — every carrier picks it up automatically. The customization point is the "remind" slice of devst.json (thresholds + an off-list).
> **Key facts:**
> - 8 providers: conventions-errors, uncommitted, undocumented, baseline-drift, tasks-rotten, conventions-warnings, req-open, audit.
> - Providers are the single home of reminder semantics; the carriers (hook/brief/UI) only render.
> - The SessionStart hook makes one CLI call instead of several hand-written blocks; the brief block and the UI widget are fed by the same providers.
> - Customization: `"remind": { "auditDays": 14, "reqOpen": 1, "off": ["audit"] }` in devst.json; malformed fields silently fall back to defaults.
> - 3 protocol decisions, 4 stages — all done.
> **Related:** [ADR-021](../decisions/adr-021-reminder-pipeline.md) · [ADR-010](../decisions/adr-010-detect-dont-block.md) (detect, don't block) · [Feature 06](./06-kb-practice-installer.md) (a consumer: practice reminders ride on this system) · tasks T-16 and T-13 (uncommitted was this system's de facto first client)

## 1. Essence and consumers

| Consumer | How it uses it |
|---|---|
| Author | tunes thresholds/switches in devst.json; sees the same set in the panel, the brief and the window |
| AI agent | SessionStart delivers all reminders in one batch (one CLI call instead of three) |
| Future features | a new signal = one small pure provider + a test; no hook/UI edits |

## 2. Scenarios

1. Session open: the hook calls `remind --json` once → a generic render (warn/info markers, details as lines) into systemMessage.
2. `devst brief`: a "Reminders:" block fed by the same providers (one semantics, its own render).
3. The window: the "Now" tab — a "reminders (devst remind)" widget via KernelAdapter (Direct — the sidecar, Mock — a fixture).
4. Customization: devst.json → `"remind": { "auditDays": 14, "reqOpen": 1, "off": ["audit"] }`.

## 3. Decision protocol

All decisions — 2026-09-12, the author's calls on the plan (captured verbatim in the session; paraphrased here).

### 1. Completeness over speed

The author's standing rule: when choosing between "worse but faster" and "better but longer" — always take "better but longer". The system ships whole: with detail groups (check errors keep their per-item lists: `Reminder.detail`), with the config slice and the UI widget in the same pass, not "later".

### 2. "Tracked" = one source of semantics

The author's concern: a signal must not dissolve into ten identical variations scattered across the code. Providers are the only place reminder semantics lives; the carriers (hook/brief/UI) only render. Suppression ("seen — don't show") and a firing log are out (see Non-goals).

### 3. Command name

`devst remind [--json]`.

## 4. Stages

- [x] 0. A design discussion with an inventory (5 reminder families; the diagnosis "adding one reminder = 4 edit points") — chat, 2026-09-12.
- [x] 1. DONE (session 26): `src/remind.ts` (Reminder, RemindConfig/defaults, parseRemindConfig, collectReminders — 8 providers: conventions-errors, uncommitted, undocumented, baseline-drift, tasks-rotten, conventions-warnings, req-open, audit; renderRemindText) + `devst remind [--json]`; the SessionStart hook — one call and one generic render instead of four hand-written blocks; the brief — a "Reminders:" block from the same providers (composeBrief takes Reminder[]).
- [x] 2. DONE (session 26): the "remind" slice of devst.json — `auditDays`, `reqOpen`, `off: []` (ids); malformed fields silently default.
- [x] 3. DONE (session 26): the UI widget on "Now" — `KernelAdapter.remind()` (Direct — the sidecar's runCliJson, Mock — a fixture), RemindersPanel.vue (icons/details/action), an e2e scenario.

## 5. Non-goals

- Suppression ("seen — don't show until the state changes"): state + storage is a separate fork (a candidate for a parking-lot repo for far-future ideas).
- A firing log / metrics: falls out of the JSON output for free later, not now.
- PostToolUse guards (freeze / lint-on-save) — contextual and file-anchored; they do not merge into this system.
- Push notifications / a background daemon — not our format (a CLI invoked on demand).
