# ADR-031: a neighbor's line in SessionStart (vaultify)

> [Русская версия](../ru/decisions/adr-031-neighbor-line-in-session-start.md)

> **Status:** Accepted · **Date:** 2026-10-18
> **Essence:** the SessionStart hook shows a single line with the state of a neighboring tool (its task board / an open handoff) when that tool is installed in the same harness; detection is by the neighbor's own install marker file; any problem on the neighbor's side silently drops the line.
> **Related:** [ADR-012](./adr-012-integrations-install-doctor.md) (where the install markers come from) · [vaultify](https://github.com/someguy3021/vaultify-public) — a sibling tool built to the same standards (shared agent memory, a task board, Obsidian vault search)

## Context

devst is not alone in the harness: the author runs sibling tools built to the same
pattern (zero dependencies, a CLI + a desktop app, the same documentation discipline).
One of them, **vaultify** — shared memory for AI agents, a task board and search over
Obsidian vaults — holds state that is useful to an agent at second zero of a session
(open tasks, an open handoff note). Hard-wiring devst to a neighbor is against the
grain: devst must work (and start) even when nothing else is installed.

## Decision

1. The canonical `devst-session-start.sh` hook gained a "neighbor" block: if the
   neighbor's install marker exists (`~/.zcode/vaultify.json`, written by the
   neighbor's own `integrations install`), the hook asks the neighbor for its state
   (`vaultify status --json`) and appends **one line** to the session message, e.g.
   `vaultify: board 3/12/1; open handoff H-0042`.
2. Full degradation: no marker, no CLI, a 10-second timeout, invalid JSON — no line,
   and the session start never breaks (the same "never break the session start"
   principle as the rest of the hook).
3. The reverse direction lives in the neighbor: vaultify's `status`/`doctor` detect an
   installed devst by *its* marker (`~/.zcode/devst.json`) and show the devst line in
   return. Each tool detects its neighbor by the neighbor's own marker — no shared
   config, no coupling.

## Consequences

- The hook's contract is unchanged (valid JSON, `suppressOutput`); the line is
  additive, so the contract tests (`toContain`) keep passing.
- Machines without the neighbor get a byte-identical hook to before.
- Deferred: showing devst's own tasks on the neighbor's board (a candidate in the
  integration backlog).
