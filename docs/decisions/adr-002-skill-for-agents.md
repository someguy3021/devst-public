# ADR-002: Agent Skill with "Docs Already Exist" as the First-Class Scenario

> **Status:** Accepted · **Date:** 2026-09-06
> **Essence:** SKILL.md is a compact digest-router with three scenarios (A: no docs yet / B: upgrade existing docs / C: working cycle); B is the primary one.
> **Rejected:** a thin wrapper over the CLI (too narrow); retelling the whole standard (duplicating the source of truth).
> **Related:** `skill/SKILL.md` · [ADR-003](./adr-003-harness-integrations.md)

## Context

The repo is published on GitHub, and the author's home projects keep their docs in older
formats of the methodology — so the skill has to cover upgrades, not just greenfield setups.

## Decision

SKILL.md carries the three scenarios plus invariants; the full standard text stays in
dev-standard and is referenced, never copied. The skill's canon lives in the repo; the
installed copy sits in `~/.agents/skills/devst`.

## Consequences

Both locations must be updated on every change. Scenario B (doc headers, map, and the
"Now" panel refreshed without rewriting established meaning) has been battle-tested on
a TTRPG side project.
