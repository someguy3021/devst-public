# ADR-011: UI freeze registry — knowledge, guard, and diff analysis

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** `docs/ui-freeze.md` (a screen → status → areas table) plus three mechanisms: SessionStart injection, a PostToolUse guard on any file, and pre-commit analysis of the staged diff. Two levels: 🔒🔒 hard (programmatic ban) and 🔒 soft (editing allowed under a warning).
> **Rejected:** a blanket "forbid editing the file" rule — too crude. The author's primary stack is Vue SFC: the `<script>` block of a frozen screen must remain editable, so file-level freezing without block granularity kills legitimate logic changes.
> **Related:** [ADR-010](./adr-010-detect-dont-block.md) · dev-standard v1.3 · figma-dump

## Context

Author requirements (confirmed through questions): protection at block (`.vue`), file, and folder-glob level with exclusions; two prohibition levels — programmatic and soft; the table lives in `docs/ui-freeze.md`; diff analysis from day one; 🔒🔒 means "programmatically forbid touching the file or block". E2E tests do not catch this class of problem: the button exists, but it is the wrong one, in the wrong place, or the mockup is from another revision.

## Decision

1. **Model:** statuses 🔒🔒 / 🔒 / ❓ / 🔨 / ♻; areas — `file.vue (template,style)`, file/folder globs, `!exclusions`; "Layout" — a figma-dump frame plus the dump revision (frozen relative to a revision; a `check`/`diff` mismatch of the dump signals re-freezing).
2. **CLI `freeze`:** list / `--file` (verdict, feeds PostToolUse) / `--staged` (staged diff `-U0`: hunks ∩ SFC blocks; full-coverage areas trigger on any change).
3. **Hooks:** SessionStart — a one-line "N 🔒🔒 + M 🔒" summary; PostToolUse — an immediate message to the agent when a protected file is edited (for 🔒🔒: "revert and ask"); pre-commit (warn by default, `--strict` blocks hard violations).
4. **Lint:** the ui-freeze.md doc header + `freeze-without-areas` (a 🔒🔒/🔒 row with no areas is an error: the gate has nothing to protect).

## Implementation note

The canon for statuses is WORDS (hard/soft/ask/not done/free); emojis in the column are decoration only: emoji bytes are fragile across environment transports (grep inside hooks missed them in some scenarios). Hooks count statuses by words.

## Consequences

Optional by design: without `docs/ui-freeze.md` the whole mechanism stays silent. Clean file deletions (hunk count = 0) are only detected approximately; the limitation is accepted.
