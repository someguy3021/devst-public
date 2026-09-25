# ADR-005: Environment and Neighboring Repos in L0 + Lint Against "Invisible e2e"

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** AGENTS.md must carry an "Environment" section (a table of verification commands) and a "Neighboring repositories" section (ours or foreign, whether changes are allowed); lint cross-checks both against stack manifests.
> **Rejected:** hoping the agent will inspect `package.json` on its own (a real incident: configured e2e tests slipped past the agent in a new project).
> **Related:** [ADR-006](./adr-006-env-multistack-checked-stamp.md)

## Context

L0 answered "what is this project" but not "how to run and verify it"; neighboring repos
and ownership boundaries were not described in the core document at all.

## Decision

Two mandatory AGENTS.md sections; two lint rules — one flagging e2e traces present in
stack manifests but missing from the Environment table, one flagging a missing
Environment section when manifests or tests exist; an "environment recon" step in the
skill's scenario B; the DoD starts with running the tests from the table. Foreign repos
are read-only, permanently.

## Consequences

Test invisibility became mechanically checkable. Whether a repo is foreign has no
auto-detection — it is a text rule in L0, deliberately so.
