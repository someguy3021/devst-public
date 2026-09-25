# ADR-019: Machine-independent canon — tokens and substitution at install

> [Русская версия](../ru/decisions/adr-019-machine-independent-canon-tokens.md)

> **Status:** Accepted · **Date:** 2026-09-12
> **Essence:** The canon (skill, slash commands) carries no machine paths — tokens `{devst_cli}` / `{devst_repo}` / `{standard_doc}` instead; `integrations install` substitutes the machine's values at layout time (an extension of the hooks' `patchCli`), and `doctor` verifies hashes with the same substitution applied.
> **Rejected:** the canon reading a `devst.json` marker at runtime (an extra step for the agent); a PATH shim `devst` and env vars via setx (system-level changes; env — a future opt-in).
> **Related:** [ADR-012](adr-012-integrations-install-doctor.md) · [ADR-018](adr-018-sea-binary-distribution.md) · registry task T-14 · roadmap 2.2

## Context

The trigger — the author's question (T-14): "the files in integrations/zcode/commands literally contain MY machine's paths — how would you run the skills etc. on another machine if they're wrong? Or even just put nothing into a different folder!" After [ADR-018](adr-018-sea-binary-distribution.md) the exe-first canon acquired the author's absolute machine paths (the exe, the devst repo, the dev-standard path): on another machine, the installed skill/commands would silently point nowhere; canon without install must not even look runnable. The hooks had already solved this problem (`patchCli` → `patchHookDefault` at install) — the re-flashing mechanism existed, but it didn't cover the text docs.

## Options

### A. Tokens + substitution at install (chosen)

- Pros: symmetric to the hooks; `doctor` verifies with the substitution applied (no false drift); an unfilled token in non-installed canon is a loud "run install" marker; the exe of ADR-018 bakes in the tokenized canon and substitutes its own path when installing from itself.
- Cons: the installed text differs between machines (as it already does for the hooks — an accepted norm); the canon cannot be read "as is" before install.

### B. The canon references a `{zcode}/devst.json` marker

- Pros: zero tool changes; the path is always current.
- Cons: every agent command starts with "read the json"; the agent must know where {zcode} is; skipping the step = calling a wrong path.

### C/D. A PATH shim `devst` / an env var `DEVST_CLI` (setx)

- Pros: the canon is maximally short (`devst <command>`); the hooks already read env.
- Cons: modifying the user's environment (setx) and restarting shells — system-level consequences against the spirit of ADR-012; deferred as an opt-in.

## Decision

**Variant A.** `FileRule.substitute: true` (the skill + 5 commands in the zcode target); `prepareCanon(rule, body, canonVars, cliPath)` — the single re-flashing point (token substitution + `patchCli` for hooks), used by install and by `diffInstalled` (canonVars as a fifth parameter). Values: `devst_cli` = cliAbs (SEA — the exe itself, repo — `dist/cli.js`); `devst_repo` = the repo root (SEA — the exe's directory); `standard_doc` = the README of the internal dev-standard methodology when it sits next to the repo, otherwise an honest text fallback. `expand` leaves an unknown token as-is — an "unfilled" one is visible to the eye.

## Rationale

- The author's requirement is closed end to end: the canon is machine-neutral; another machine = "clone the repo / get the exe → install → doctor"; a move to a new location is re-flashed by a repeated install — no separate moving scenario.
- Exactly one mechanism holds the truth about paths: install at layout time, `doctor` at verification time.

## Consequences

**Positive:**

- The canon can be edited in the repo without worrying about machines; install remains the single adaptation operation.
- Symmetry with ADR-018: the exe bakes in the tokenized canon, substitution happens when installing from it.

**Negative / risks:**

- New canon texts must use tokens, not absolute paths (caught by review/a guard test — add a "absolute path in canon" lint if needed).
- Installed copies are machine-specific — `doctor` is mandatory after a CLI path change (already the standard ritual).
