# ADR-006: `devst env` (multi-stack) + a "Checked" stamp with event-driven freshness

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** Mechanical environment recon (node/php/go/rust/python/make manifests, Make targets, compose, sibling projects, CI) that drafts the environment table; freshness is tracked event-driven, via mtime or the last commit.
> **Rejected:** Recon purely via the skill's text protocol; a calendar-based check timer.
> **Related:** [ADR-005](adr-005-env-in-l0.md) · [ADR-007](adr-007-review-fixes.md)

## Context

Author's questions: which stacks does it work on (before: package.json only); how does the
recon actually work; is there a "when was it last checked" and "how often" (there wasn't).

## Decision

(1) An `env` command with a stack-agnostic scan that drafts the table; (2) the `env-e2e`
rule looks for an e2e entry in the text of every manifest; (3) a `_Checked: date_` stamp
plus the `env-freshness` lint rule. The frequency policy is event-driven (a manifest
changed), with a quarterly calendar maximum.

## Consequences

Constraint: the CLI requires Node ≥ 18. The `env` commands are draft heuristics — the
ground truth is a manual check.
