# ADR-024: Lint budgets 250/20/200, the devst:allow override, log campaigns with addenda

> [Русская версия](../ru/decisions/adr-024-lint-budgets-250-20-200.md)

> **Status:** Accepted (T-30) · **Date:** 2026-10-05 — supersedes [ADR-004](adr-004-log-budget-200.md)
> **Essence:** the log budget goes 200→250, the header budget 15→20, the map budget 120→200; a deliberate budget overrun is signed with a `<!-- devst:allow rule: reason -->` comment; a multi-day session is kept as a "log campaign" with `## Дополнение N (YYYY-MM-DD): title` sections — the budget applies per section, not per file.
> **Rejected:** raising all budgets at once (fixes the TTRPG case but kills L0 token economy for small repos — overruns must be signed by the author, not made the norm); adding "campaign" as a separate file genre (duplicates the session mechanism, while the problem being solved is appending to one entry).
> **Related:** [ADR-004](adr-004-log-budget-200.md) (the previous 60→200 raise — superseded) · T-29 (cross-repo reconciliation — the same pain, "Related" blocks referencing neighboring repos from page headers) · the TTRPG side project (30 warnings from `check` — 28 deliberate overruns at the author's explicit request; the signal was drowned).

## Context

A `check` run against the TTRPG side project (2026-10-05): 0 errors, 30 warnings,
~28 of them deliberate budget overruns at the author's explicit request ("write
past the budget when meaning gets cut"). The result: warnings stopped carrying
signal — the real ones (a placeholder header, a stale environment stamp) drown
among them. Three bottlenecks:

1. **Log ≤ 200:** 11 logs over the budget, up to 1245 lines — multi-day
   AI-generation campaigns live as a single accumulator entry with "Addenda"
   sections (session-114 holds 18), while the standard models "1 session = 1 entry
   of 60–80 lines". Strict per-session granularity also blocks parallel work in
   one repo: there is nowhere to append a campaign continuation.
2. **Header ≤ 15:** 17 docs over — header-as-conspectus docs (L1 "read the header
   instead of the body") and rich "Related" blocks.
3. **Map ≤ 120:** 162/120 with ~190 md files — "1 line = 1 doc" does not fit
   arithmetically. The author's decision (2026-10-05, same chat as 250/20): the
   map budget is **200**; grouping ADRs by theme (>15 ADRs) remains a prose
   recommendation; `devst:allow` is the reserve above 200.

## Decision

**Budgets (lint):**

- `лог-длинный` (long log): 200 → **250** for a regular entry (the "aim for
  ~60–80" recommendation remains prose).
- `шапка-длинная` (long header): 15 → **20**.
- `карта-длинная` (long map): 120 → **200** (with 100+ docs, "1 line = 1 doc"
  does not fit into 120; going past 200 — trim descriptions; `allow` is the
  deliberate reserve).

**The `devst:allow` override (dev-standard ADR-029 semantics, eslint-disable-style):**

- Format: `<!-- devst:allow <rule>[: reason] -->` anywhere in the doc (for the
  map — in `docs/README.md`).
- Applies only to the budget warn-rules: `карта-длинная`, `шапка-длинная`,
  `лог-длинный`, `дополнение-длинное`. Error rules and other warns cannot be
  suppressed.
- A fired allow is not counted in warnings: it is printed as a `• [allowed]`
  line and reported as `allowed` in `--json` — the overrun stays visible but is
  separated from the signal.
- Hygiene: an allow with no fired rule → warn `override-лишний`; an allow naming
  a non-budget rule → warn `override-неизвестный`.

**Log campaign (an accumulator entry), format set in stone:**

- The file is named like a regular session; continuations do NOT open new files —
  sections are appended.
- A continuation section: `## Дополнение N: заголовок` ("Addendum N: title"),
  where N is the sequential append number (gaps are legal) and a YYYY-MM-DD date
  stands anywhere on the heading line — usually in parentheses right after the
  number: `## Дополнение 12 (2026-10-04, note): title`.
- At least one "Дополнение" in a file = a declaration of the format: the overall
  log budget does not apply to the file (no override needed); instead:
  - the **section** budget is the same 250 lines (`дополнение-длинное`);
  - a duplicate number → warn `дополнение-нумерация` (gaps are legal: parallel
    appends);
  - a "Дополнение…" heading off the format → warn `дополнение-формат`.
- Header/Essence are checked as in a regular entry.

## Rationale

- A budget overrun is a legitimate author's decision, but it must be **signed**:
  `allow` restores the linter's ability to report "this was not intended".
- Format-as-declaration beats a separate allow for campaigns: the
  "Дополнение N (date)" heading documents the intent by itself, and the linter
  can check format hygiene.
- The 250 budget is universal: for a regular log and for a single Addendum — one
  number, less magic.

## Consequences

**Positive:**

- The TTRPG case: of 30 warnings ~2 genuine ones remain (placeholder, environment
  freshness); the rest are deliberate allows or legal campaigns.
- Parallel work in one repo: a second agent appends its own "Дополнение N+1"
  without genre conflicts (number gaps are legal).
- Multi-day campaign history is neither cut nor scattered across N session files.

**Negative / risks:**

- A campaign can grow without bound (each section ≤ 250, the number of sections
  is unlimited) — considered a feature: it is a journal, not an L0 doc; the
  `log/` map does not list it.
- `override-лишний` adds noise at the moment an overrun "is no longer an overrun"
  — intentional: the signature must be removed once the need is gone.
