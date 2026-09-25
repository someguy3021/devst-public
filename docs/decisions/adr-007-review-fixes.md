# ADR-007: Three fixes from the weaknesses review

> [Русская версия](../ru/decisions/adr-007-review-fixes.md)

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** Freshness drift is judged by commit date (not mtime); stripFences for code blocks; a "stale Now panel" rule.
> **Rejected:** mtime-based freshness checks (see below — false positives on a fresh clone).
> **Related:** [ADR-006](adr-006-env-multistack-checked-stamp.md) · [ADR-008](adr-008-standard-version-tracking.md)

## Context

The weaknesses review that followed the author's questions surfaced three defects.

## Decision

1. **mtime false positives:** after `git clone` every file looks "created today", so the
   `env-freshness` rule lied. Freshness is now judged by the last commit that touched the
   manifest (`git log -1 --format=%as`); mtime remains a fallback outside git.
2. **Code blocks:** `## ` lines and links inside ``` examples broke doc-header boundaries
   and produced false "broken link" reports. `stripFences` — doc regexes run over text
   with fenced content stripped out.
3. **Stale Now panel:** the "Last session" line in the "Now" panel must always equal the
   maximum entry in log/ (`devst status` fixes it).

## Consequences

The regex parser stays (mdast was rejected: see the discussion — round-tripping, GFM
tables, performance; kept on the long-term TODO with the trigger "at the first real
false positives").
