# Feature 16: architecture roles and boundaries as data

> [Русская версия](../ru/features/16-architecture-roles-and-boundaries.md)

> **Status:** Implemented (stages 0–5: the model, the checker, presets, canon generation, MCP, the desktop tab, AI-first detection; the spec items await human verification) · **Updated:** 2026-10-24
> **Essence:** a repository's architecture becomes a machine-readable model in `docs/architecture/arch.model.json`: roles classifying paths (flat or tree), a **default-deny** edge matrix (configurable), per-package rules, node contracts with severity, and presets inherited from official rulebooks. `devst arch check` verifies the import graph against the matrix; the human-readable canon (`02-arch-roles.md` + a mermaid diagram) is a **generated projection** — hand edits don't break anything, they are detected and regenerated. "Not a picture — a model": the canon, diagrams and dashboards are projections of one source.
> **Key facts:**
> - The agent learns the boundaries at session start: MCP `get_arch_model` returns roles, the matrix and current violations; a one-line arch summary ("needs investigation") sits in `devst check` and the session brief — detect, don't block ([ADR-010](../decisions/adr-010-detect-dont-block.md)).
> - Presets come from official rulebooks, clean-room: **FSD** (seven layers, imports strictly down, public API per slice, the `@x` cross-import exception) and **Clean Architecture** (the dependency rule: entities ← use cases ← adapters ← frameworks); plus an empty slate.
> - Stage 0: tsconfig path aliases in the graph resolver — without them FSD-style repos (`@/entities/user`) are simply unverifiable; unresolved aliases are reported honestly.
> - `arch detect` is AI-first: an agent proposes the model in-session; machine heuristics are the fallback. The agent never writes the model past human verification.
> **Related:** [Feature 10](./10-code-intelligence-clean-room.md) (the code graph the checker runs over) · [ADR-028](../decisions/adr-028-parser-cascade-t0-t1-t2.md) (the parser cascade) · [ADR-010](../decisions/adr-010-detect-dont-block.md) · [Feature 14](./14-spec-items-as-data.md) (the ratification the model passes through) · [FSD layers](https://feature-sliced.design/docs/reference/layers) (the official rulebook behind the preset) · [The Clean Architecture](https://blog.cleancoder.com/2012/08/13/the-clean-architecture.html) (Uncle Bob, 2012)

## Scenarios

1. **Constructor.** `devst arch init --preset fsd` → the model appears in `docs/architecture/arch.model.json` plus the generated canon `02-arch-roles.md` → the author bends it to taste (allow something, forbid more) in the desktop constructor or by hand → `devst arch check`.
2. **Check.** `devst arch check` — every import edge from the code graph is matched against the matrix; node contracts check public APIs, naming and forbidden asset types; each violation comes with the file, the rule, a "why" and a severity; human-readable output plus `--json`.
3. **An agent's session.** The brief and `get_arch_model` hand over the roles, boundaries and current violations — the agent writes code "within the boundaries" instead of guessing, and sees "needs investigation" items at once.
4. **Drift.** The author edits the model → the canon regenerates; a hand edit of the canon diverges from the model → the check flags the drift and offers regeneration. Hand edits are detected, not lost.

## The model, briefly

- Roles: a minimal in-house glob matcher (no dependencies), flat and tree forms, duplicate globs are a configuration error, priority = the number of literal segments.
- Edges: a default-deny matrix (`defaultDeny: false` allowed per project); internal cycles within a role are a per-role flag — the rulebook decides.
- Packages: rules "role → allowed external packages" from day one ("no modern project exists without external packages").
- Node contracts: public API (an `index.ts` entry), naming, forbidden asset extensions; `severity: error|warn` per rule; the FSD `slices` flag forbids horizontal imports between sibling slices (the `@x` notation is the legal exception).
- Golden tests: a mini FSD repository where a clean tree passes and each injected mutation — an upward import, a horizontal slice import, a bypassed public API, a forbidden package, a forbidden asset — produces exactly its own violation.

## Non-goals

- No copying of anyone's dashboards or code — clean-room, ideas from the official rulebooks only.
- The agent does not write into `arch.model.json` past human verification.
- Line-level code rules, office formats, monorepo workspaces — v2, on demand.
- Merging the desktop "Arch" tab into the "Code" tab is an open decision; today they stay separate.
