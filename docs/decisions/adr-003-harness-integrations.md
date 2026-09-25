# ADR-003: Harness Integrations — Slash Commands and Two Hooks (file_path Anchor)

> [Русская версия](../ru/decisions/adr-003-harness-integrations.md)

> **Status:** Accepted · **Date:** 2026-09-06
> **Essence:** the `/session` and `/docs-upgrade` commands plus a SessionStart state injection and a PostToolUse docs lint; hooks anchor on `file_path` from the payload, not on the cwd.
> **Rejected:** a cwd-based guard — hooks start from the harness's own working directory and silently no-op (confirmed by the author's dead CRG hooks).
> **Related:** `integrations/zcode/` · [ADR-008](./adr-008-standard-version-tracking.md)

## Context

The skill is voluntary; the documentation rituals need deterministic entry points and
enforcement at the moment of editing. ZCode (the AI harness) provides slash commands and
hooks for both.

## Decision

Slash commands `/session` and `/docs-upgrade`; SessionStart — "a `docs/` directory exists
→ activate automatically" (the "Now" panel plus the session protocol); PostToolUse —
lint-on-save, walking up from `file_path` to the nearest root containing `docs/`.
The CRG post-tool-use hook was moved to the same anchor.

## Consequences

**Key ecosystem lesson:** the hook payload must be parsed with Python directly from
stdin — routing the bytes through Git Bash's bash transport mangles escape sequences
(`\\a` → BEL). The configuration is user-level (`~/.zcode/cli/config.json`); the canon
of the scripts lives in this repo.
