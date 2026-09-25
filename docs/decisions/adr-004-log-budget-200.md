# ADR-004: Log Budget in Lint 60 → 200 (Aim for ~60–80 as Prose Guidance)

> **Status:** Accepted · **Date:** 2026-09-07
> **Essence:** a hard lint budget of 200 lines per log entry; "aim for ~60–80" is prose guidance in the docs, not a lint rule.
> **Rejected:** keeping 60 — 7 of 26 honest logs from a TTRPG side project did not fit.
> **Related:** dev-standard v1.1.1 (changelog)

## Context

After upgrading a TTRPG side project: 27% of good log entries were longer than 60 lines.
A warning that fires on a quarter of honest logs is noise drowning the signal — and
history must not be cut down just to fit a budget.

## Decision

Two-level calibration: a hard budget of 200 lines enforced by the lint, plus a ~60–80
recommendation as prose in the standard's text, templates, and skill.

## Consequences

The long-log warning became rare but meaningful (a log over 200 lines is almost
certainly a retelling rather than a log).
