# ADR-010: Edits made without the tool — detect, don't block

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** `devst undocumented` finds code commits newer than the last docs/log/ entry and tells the agent "investigate and write it up"; pre-commit warns by default, blocking is opt-in via `--strict`.
> **Rejected:** A blocking pre-commit by default (author: my own commits made without the tool must not get stuck); calendar-based reminders (event-driven is more precise).
> **Related:** [ADR-008](adr-008-standard-version-tracking.md) · [ADR-003](adr-003-harness-integrations.md)

## Context

The author's requirement: "I changed a thing, didn't log it and won't without the agent,
committed and pushed — the tool must learn the fact automatically and tell the agent to
log it; I don't want my commits blocked by default."

## Decision

1. **`devst undocumented`:** the documented boundary = the last hash mentioned in
   docs/log/; undocumented = CODE/config commits newer than the boundary. Edits to
   docs/, README.md, AGENTS.md are excluded from the sweep — so a session's closing
   docs commit doesn't dangle as a tail forever, and the protocol stays self-consistent:
   work → code commit → log entry with the hash → docs commit.
2. **SessionStart hook** adds a line "⚠ N commits without a log/ entry (hash subject) —
   investigate and write it up (/session)".
3. **Pre-commit warn-by-default:** check errors go to stderr, the commit goes through;
   `--strict` installs the blocking variant. Existing installs are left untouched
   (reinstall manually if desired).

## Consequences

Layers of catching edits: (1) SessionStart check + undocumented — accumulated drift
surfaces in the first chat; (2) pre-commit warn/strict — at commit time; (3) a GitHub
Action — edits coming from outside (web UI); remains an open question.
