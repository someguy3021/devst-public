# ADR-027: devst new research — scaffolding research docs

> [Русская версия](../ru/decisions/adr-027-new-research-scaffold.md)

> **Status:** Accepted · **Date:** 2026-10-07
> **Essence:** `devst new research "<topic>"` creates a research-doc stub `research/<date>-<slug>.md` (YYYY-MM-DD + topic slug); research docs are no longer created by hand. Refines [ADR-026](adr-026-research-section.md) — its caveat "does not scaffold; if ever needed, a separate task" is fulfilled.
> **Rejected:** separate numbering for research docs (as for ADRs/features) — not needed: a research doc's name = date-slug, collisions are honestly caught by the "file already exists" refusal.
> **Related:** [ADR-026](adr-026-research-section.md) · the internal methodology repo (dev-standard), version footer v1.9

## Context

- [ADR-026](adr-026-research-section.md) made research/ a full-fledged section (map/check/dossier) but added no scaffold — research docs were created by copying existing ones.
- The author's decision (chat, 2026-10-07): "Yes, let's do devst new research."
- The canon rule: CLI commands changed → sync the skill/README/TOOLING of the internal methodology repo (dev-standard) + the standard's version footer (v1.8 → v1.9) + STANDARD_VERSION.

## Decision

**research goes into `NewKind`/`NEW_KINDS` (src/scaffold.ts).** The stub: a research-doc header (Status: research · Updated · Essence · Related, ≤ 20 lines) plus the "Findings" and "Verdict" sections — modeled on the repo's existing research docs. The T2/T3 init map (readmeGenerated) now generates a `research/` section with a command hint.

Side hygiene shipped by the same change:

- `runNew` validates the kind against `NEW_KINDS`: an unknown kind — a loud error (previously a roadmap stub was silently created — the P1/P3-style pattern from the TTRPG project's migration report).
- The CLI help string carried a stale "dev-standard v1.6" — now a dynamic `${STANDARD_VERSION}`.
- `STANDARD_VERSION` 1.8 → 1.9 (in sync with the methodology repo's footer).

## Rationale

- The single honest way to create docs (the "no self-made numbers" rule) extends to research docs; the stub carries the header convention from the first line.
- Kind validation closes the silent path "a typo in the kind → the file lands in the wrong section".

## Consequences

**Positive:**

- A research doc with a canonical header — one command; init repos get the map section right away, so map orphans land where they belong from day one.

**Negative / risks:**

- A repeated `new research` with the same topic on the same day — the "file already exists" refusal (deliberate, like the other kinds without numbers).
- Repos on an old map without a research/ section will get the hint "no section — add it manually" at the first research doc (drift, not an error).
