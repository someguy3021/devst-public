# ADR-026: research as a full-fledged section — map and check know the catalog

> [Русская версия](../ru/decisions/adr-026-research-section.md)

> **Status:** Accepted · **Date:** 2026-10-07
> **Essence:** the `docs/research/` catalog is added to `SECTIONS` (src/util.ts) — `devst map` picks orphan research docs up into the map, `devst check` lints their headers/file names/map presence on a par with the other docs, and the dossier (`devst file`) scans them.
> **Rejected:** a separate `kind: 'research'` — it adds no behavior beyond `doc` (every comparison in the code is against `log`), an extra entity in the type.
> **Related:** T-32 · session 33

## Context

- `research/` has been part of the T2 template from the start (the map shows the section), but the catalog was not in `SECTIONS` (src/util.ts): `devst map` did not scan it, orphan research docs did not get into the map automatically, `check` did not see them, `devst file` did not scan them.
- It surfaced in session 33: a research doc on agentic coding had to be added to the map manually; task T-32 was opened.
- All six existing research docs already carry headers (Status/Updated/Essence/Related) and are mentioned in the map — extending the linter's jurisdiction breaks nothing on the existing material.

## Options

### A. Leave it as is — research docs go into the map manually

- Pros: zero code.
- Cons: the only docs/ section outside the automation; lint orphans and broken file names go unnoticed; every new research doc means a manual map edit (which gets forgotten).

### B. A separate `kind: 'research'`

- Pros: semantic explicitness; specialized research rules could be introduced later.
- Cons: zero behavioral difference today — every comparison in the code is `=== 'log'` / `!== 'log'`; a new branch in the type with not a single consumer.

## Decision

**research goes into `SECTIONS` with `kind: 'doc'`** and the file-name pattern `YYYY-MM-DD-<slug>.md` (`^\d{4}-\d{2}-\d{2}-[\wа-яё-]+\.md$`), between roadmap and log. The behavior is inherited from the common machinery: map (orphans → the map), check (header, file name, map-orphan, the counter in the summary), the dossier. `devst new` does not scaffold research docs — they are written manually, modeled on the existing ones (if ever needed — a separate task).

## Rationale

- One object in an array instead of a new branch of logic — a minimal diff; the whole machinery (map/check/dossier) is already universal: a section is found by `dir`, not by a whitelist.
- The lint rules applied to research docs are not new — they are the same as for every doc (header/file name/map); this is alignment, not tightening.

## Consequences

**Positive:**

- A new research doc automatically lands in the map (`devst map`); a file gone missing from the map is caught as `map-orphan`, a broken name as `file-name`.
- The research-doc counter is visible in the `devst check` summary.

**Negative / risks:**

- Research docs with a non-standard name (not date-slug) now produce a warning — renaming the old files is not required: all six pass the pattern.
- Headerless research docs created "as a scratch draft" will make lint noise — by convention a draft should not live in docs/research in the first place.
