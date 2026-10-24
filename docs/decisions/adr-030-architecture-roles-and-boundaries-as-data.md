# ADR-030: architecture roles and boundaries as data

> [Русская версия](../ru/decisions/adr-030-architecture-roles-and-boundaries-as-data.md)

> **Status:** Accepted · **Date:** 2026-10-14
> **Essence:** a repository's architecture lives as a machine-readable model in `docs/architecture/arch.model.json`: roles classifying paths, a default-deny edge matrix (configurable), package rules, node contracts with severity, presets from official rulebooks (FSD, Clean Architecture). `devst arch check` verifies the import graph against the matrix; the canon markdown and diagrams are generated projections; `arch detect` is AI-first with machine heuristics as the fallback.
> **Rejected:** default-allow as the default; validation only as a TS library without a command; hardcoded dashboard maps before the model existed (they moved into projections).
> **Related:** [Feature 16](../features/16-architecture-roles-and-boundaries.md) (the implementation) · [ADR-028](./adr-028-parser-cascade-t0-t1-t2.md) (the graph it checks) · [ADR-010](./adr-010-detect-dont-block.md) · [FSD layers](https://feature-sliced.design/docs/reference/layers) · [The Clean Architecture](https://blog.cleancoder.com/2012/08/13/the-clean-architecture.html)

## Context

"What to do" and "how to do it" were solved in devst; "how to do it *correctly,
architecturally*" was not: layer boundaries lived as prose in heads and docs, invisible
to the agent, with no drift detection. A design exploration proposed a model +
constructor; a parallel finding confirmed it: half of the code-health dashboard's views
are projections of such a model and were being built twice. A concrete fact sealed it:
the graph resolver did not understand tsconfig path aliases (`@/entities/user` resolved
to an external package), so FSD-style repos were unverifiable — that became stage 0.

## Options

### A. A hardcoded linter: rules in code, repos listed by hand

- Pros: fast.
- Cons: every project means editing devst's code; presets impossible; dashboards built
  twice.

### B. The model as data + generated projections (chosen)

- Pros: a constructor (preset + author edits), canon/diagrams/views from one source,
  the agent reads the model through MCP; the role/matrix syntax is small.
- Cons: the DSL must stay small (creep is the main risk; the criterion: every rule must
  be expressible through roles / edges / contracts / overrides).

## Decision

**Option B.** `arch.model.json` (strict JSON, `schemaVersion`) in `docs/architecture/`:
roles (flat + tree, an in-house minimal glob, duplicate globs are an error, priority =
literal segments), a default-deny edge matrix (`defaultDeny` configurable; internal
cycles a per-role flag), "role → allowed packages" rules, node contracts
(public API / naming / assets, `severity error|warn`, the FSD `slices` flag).
Presets `fsd` / `clean` / `empty` (from official rulebooks, clean-room) embedded into
the SEA binary as assets; `devst arch init --preset`. `devst arch validate` (the model)
and `arch check` (violations over the graph: file, rule, "why", severity; human-readable
+ `--json`), plus a one-line arch summary in `devst check` and the session brief. The
canon markdown (roles + mermaid) is generated — divergence from the model is detected
by the check, so hand edits are caught, not lost. MCP `get_arch_model` is a full
analogue. `arch detect` is AI-first, machine heuristics as the fallback. Stage 0
(done): tsconfig path aliases in the graph resolver — without them FSD-style repos are
unverifiable.

## Consequences

**Positive:** boundaries are machine-readable and checked over the real graph; the
agent sees roles from session start; dashboard maps are built once, as projections.

**Negative / risks:** DSL creep — held by the expressiveness criterion; aliases are
more than wildcards — unresolved ones are reported honestly; the desktop "Arch" tab
stays separate from "Code" until the author decides on the merge.
