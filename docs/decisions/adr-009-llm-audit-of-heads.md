# ADR-009: LLM audit of doc headers — a command plus a monthly reminder

> [Русская версия](../ru/decisions/adr-009-llm-audit-of-heads.md)

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** `/docs-audit` cross-checks architecture/features doc headers against their bodies; a SessionStart hook reminds every 30 days based on a `_Header audit: date_` stamp in docs/README.
> **Rejected:** A scheduled automatic run (token-hungry — a hard author requirement); auditing all docs (ADR/roadmap/log are rigidly formatted and held in shape by the linter); per-doc stamps (noise).
> **Related:** [ADR-003](adr-003-harness-integrations.md) · [ADR-008](adr-008-standard-version-tracking.md)

## Context

Weakness #2 from the review: the linter checks the form of doc headers, not their
content — the "Essence" line can lag behind the body. All four author questions are
resolved by the recommended options: trigger "command + reminder", scope
"architecture + features", mandate "fix trivia itself + report", stamp "a line in
docs/README".

## Decision

The `/docs-audit` slash command: cross-checks Essence / Key facts / Updated / Related
against the body; fixes trivia itself, reports disputed items as a list for approval;
at the end it refreshes the stamp and runs check. The SessionStart hook: no stamp → a
gentle reminder; older than 30 days → "not done for N days". The stamp lives right
after the "Now" panel.

## Consequences

Cost: one run covers ~15–25 docs, on demand only; the reminder is a single systemMessage
line (consumes no agent tokens — suppressed in the transcript). The absence of a stamp
keeps reminding until the first audit — deliberate motivation.
