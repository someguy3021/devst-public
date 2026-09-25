# ADR-014: Requirements reconciliation — spec ↔ backend ↔ frontend (docs/requirements.md)

> [Русская версия](../ru/decisions/adr-014-req-reconcile.md)

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** A dedicated doc `docs/requirements.md` with R-NN rows ("requirement verbatim / backend fact / verdict — who is right / delta / action / date"); a `/req-check` ritual; a SessionStart reminder when more than 3 rows are open. dev-standard → v1.4.
> **Rejected:** tables inside individual features (no consolidated view, no end-to-end IDs); fact-checking done only by the author (the agent verifies itself — the source is declared in the doc header); deleting closed rows (the "who was right" knowledge base would be lost).
> **Related:** [ADR-011](./adr-011-ui-freeze.md) (dedicated-doc pattern) · [ADR-005](./adr-005-env-in-l0.md) (backend sources)

## Context

Author request: "the spec can diverge both from what actually needs to be built and from what the backend actually exposes — verify all parties and record 'who is right, and by how much'." All four decisions are the author's recommended options.

## Decision

1. Verdict taxonomy: matches / spec is right / backend is right / both are wrong / awaiting answer, plus a "Delta" column (what exactly the discrepancy is).
2. Mechanics: the `req.ts` parser (a row counts as open when its fact is empty or "awaiting answer"), doc-header lint, `reqOpen` in `check --json` → a SessionStart line when more than 3 rows are open.
3. The `/req-check` ritual: the agent verifies against the source declared in the doc header (OpenAPI / a backend repository read-only / a live API); facts must be verbatim-accurate; an absolute confirmation rule applies to "both are wrong" verdicts and to overwriting approved verdicts.
4. Template name REQ-RECONCILE.md (REQUIREMENTS.md is already claimed by T3-tier docs-hub tracing).

## Consequences

Optional by design (no file — silence); escalations: architecture → ADR, questions → open-questions, a row marked "awaiting answer".
