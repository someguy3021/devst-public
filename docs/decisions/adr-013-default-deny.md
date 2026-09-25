# ADR-013: Default-deny mode for the UI freeze registry

> [Русская версия](../ru/decisions/adr-013-default-deny.md)

> **Status:** Accepted · **Date:** 2026-09-08
> **Essence:** A `**Mode:** default-deny` line in the ui-freeze.md doc header flips the semantics: a file NOT in the registry → 🔒🔒 hard (normal mode is the reverse: no entry → free to edit).
> **Rejected:** special mechanics such as "`!` = global allow" and other registry-bypass exceptions (first draft) — rejected by the author: "the registry is already global; an allowance is expressed as a row." Semantic simplicity beats syntactic sugar.
> **Related:** [ADR-011](./adr-011-ui-freeze.md) · dev-standard v1.3

## Context

Author request: "an inverse mode for maximum strictness — no explicit permission to edit → treat everything as a hard ban." Name: default-deny.

## Decision

1. The mode marker is the doc-header line `**Mode:** default-deny` (alias "inverse").
2. Exactly one semantic change: **no entry = hard** (`byDefault` in the verdict); an allowance is an ordinary registry row (free/soft/ask/not done, block rule). `!` still subtracts from the globs of its own row, exactly as in normal mode.
3. The docs layer (`docs/`, `README.md`, `AGENTS.md`) is not denied by default — it is the agent's working space (otherwise logs and the map cannot be maintained).
4. The mechanics cut through every layer: `freeze --file/--staged` (the verdict carries `byDefault`), SessionStart ("default-deny: …"), PostToolUse ("file NOT in the registry — edit forbidden"), strict pre-commit blocks. Lint: an `inverse-without-allowances` warning if the registry contains no allowance rows at all.

## Consequences

E2E confirmed: an unlisted file → "INVERSE/default-deny" reported in every layer; strict mode blocks the commit; allowance rows and the docs layer pass cleanly. Tests: 6 mode cases (parsing, default-deny, exemption, allowances, `!` semantics, normal mode).
