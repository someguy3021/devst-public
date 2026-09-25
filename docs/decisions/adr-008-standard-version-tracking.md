# ADR-008: Standard version tracking + SessionStart as the catcher of edits made without the tool

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** `check` parses the dev-standard version from the docs/README doc header and warns when a project lags behind; a SessionStart hook runs check and weaves its findings into the morning injection.
> **Rejected:** A dedicated version field/file (the doc header already has a place for it).
> **Related:** [ADR-003](adr-003-harness-integrations.md) · dev-standard v1.2

## Context

Weaknesses review: (7) a project had no idea it had fallen behind a new standard version;
(1) doc edits made outside ZCode were linted by no one — the author ranked the first as
the more important.

## Decision

The `standard-version` / `standard-outdated` rules checked against the CLI's
`STANDARD_VERSION`; the SessionStart hook appends a summary of check errors/warnings to
the injection. Layers 2–3 of catching edits (pre-commit, a GitHub Action) stay on the
roadmap.

## Consequences

Every standard bump starts an "upgrade now" wave across projects — that is a feature.
A live example: an external TTRPG side project still on v1.1 got an honest warning.
